require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { Expo } = require('expo-server-sdk');
const connectDB = require('./database');

// Expo Push Notifications client
const expo = new Expo();

const Business = require('./models/Business');
const Courier = require('./models/Courier');
const Order = require('./models/Order');
const Admin = require('./models/Admin');
const Setting = require('./models/Setting'); // Setting modelini ekle

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Railway/Vercel gibi proxy arkasındaki deploylar için IP doğruluğu
app.set('trust proxy', 1);

// ============= GÜVENLİK MİDDLEWARE =============

// HTTP güvenlik header'ları - CSP'yi devre dışı bırak (CDN ve Inline Scriptler için)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS yapılandırması
// CORS yapılandırması
app.use(cors({
  origin: '*', // Tüm kaynaklara izin ver (Vercel, Localhost vs.)
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-key']
}));

// Body parser
app.use(bodyParser.json({ limit: '1mb' }));

// Genel rate limiter: 15 dk'da max 1000 istek (Konum güncellemeleri için artırıldı)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', generalLimiter);

// Login rate limiter: 15 dk'da max 50 deneme (Proxy sorunları ve testler için esnetildi)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Çok fazla giriş denemesi. 15 dakika sonra tekrar deneyin.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Bellek içi konum deposu (production'da Redis kullanılmalı)
const courierLocations = new Map();

// Push token deposu: { courierId: { token, businessId, role, name } }
const pushTokens = new Map();

// ============= PUSH BİLDİRİM YARDIMCI FONKSİYONLARI =============

const sendPushNotification = async (targetTokens, title, body, data = {}) => {
  const messages = [];
  for (const pushToken of targetTokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.log(`[PUSH] Geçersiz token atlandı: ${pushToken}`);
      continue;
    }
    messages.push({ to: pushToken, sound: 'default', title, body, data });
  }
  if (messages.length === 0) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
      console.log(`[PUSH] ${chunk.length} bildirim gönderildi: ${title}`);
    } catch (err) {
      console.error('[PUSH ERROR]', err);
    }
  }
};

// Veritabanındaki ayarları process.env'ye yükle
const loadSettings = async () => {
  try {
    const settings = await Setting.find();
    settings.forEach(s => {
      process.env[s.key] = s.value;
      console.log(`[CONFIG] ${s.key} yüklendi`);
    });
  } catch (err) {
    console.error('[CONFIG ERROR] Ayarlar yüklenemedi:', err);
  }
};

// İşletmeye ait tüm kuryelerin tokenlarını getir
const getBusinessTokens = (businessId, excludeId = null) => {
  const tokens = [];
  pushTokens.forEach((info) => {
    if (info.businessId === businessId && info.courierId !== excludeId) {
      tokens.push(info.token);
    }
  });
  return tokens;
};

// Belirli role sahip tokenları getir
const getRoleTokens = (businessId, role) => {
  const tokens = [];
  pushTokens.forEach((info) => {
    if (info.businessId === businessId && info.role === role) {
      tokens.push(info.token);
    }
  });
  return tokens;
};

// Statik dosyaları sun (public klasörü) - Önbellek Engelleme
app.use(express.static(require('path').join(__dirname, 'public'), {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
}));

// Ana sayfa rotası (Web Paneli) - Cache Sorununu Aşmak İçin admin.html
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.sendFile(require('path').join(__dirname, 'public', 'admin.html'));
});

// Health Check
app.get('/health', async (req, res) => {
  try {
    const businesses = await Business.countDocuments();
    const couriers = await Courier.countDocuments();
    const orders = await Order.countDocuments();
    res.json({ status: 'OK', timestamp: new Date().toISOString(), businesses, couriers, orders });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

// ============= MIDDLEWARE =============

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token gerekli' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Geçersiz token' });
    }
    req.user = user;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
  }
  next();
};

// ============= AUTH ROUTES =============

// Kurye girişi
app.post('/api/auth/login', loginLimiter, [
  body('businessCode').trim().notEmpty().withMessage('İşletme kodu gerekli'),
  body('username').trim().notEmpty().withMessage('Kullanıcı adı gerekli'),
  body('password').notEmpty().withMessage('Şifre gerekli'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { businessCode, username, password } = req.body;

    const business = await Business.findOne({ code: businessCode, isActive: true });
    if (!business) {
      return res.status(401).json({ success: false, message: 'Geçersiz işletme kodu' });
    }

    const courier = await Courier.findOne({ businessId: business._id, username, isActive: true });
    if (!courier) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    if (!bcrypt.compareSync(password, courier.password)) {
      return res.status(401).json({ success: false, message: 'Hatalı şifre' });
    }

    const token = jwt.sign(
      { id: courier._id.toString(), businessId: business._id.toString(), role: courier.role || 'courier' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: courier._id.toString(),
        name: courier.name,
        username: courier.username,
        businessId: business._id.toString(),
        businessName: business.name,
        role: courier.role || 'courier',
      },
    });
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Giriş sırasında bir hata oluştu' });
  }
});

// Admin girişi
app.post('/api/auth/admin-login', loginLimiter, [
  body('username').trim().notEmpty().withMessage('Kullanıcı adı gerekli'),
  body('password').notEmpty().withMessage('Şifre gerekli'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }
    const { username, password } = req.body;

    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    if (!bcrypt.compareSync(password, admin.password)) {
      return res.status(401).json({ success: false, message: 'Hatalı şifre' });
    }

    const token = jwt.sign(
      { id: admin._id.toString(), role: 'admin' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: { id: admin._id.toString(), username: admin.username, role: 'admin' },
    });
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Giriş sırasında bir hata oluştu' });
  }
});

// ============= BUSINESS ROUTES (Admin) =============

app.get('/api/admin/businesses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const businesses = await Business.find();
    res.json({ success: true, data: businesses, count: businesses.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/admin/businesses', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { name, owner, email, phone, address } = req.body;
    const code = `${name.substring(0, 3).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

    const newBusiness = await Business.create({ code, name, owner, email, phone, address });

    res.status(201).json({
      success: true,
      data: newBusiness,
      message: `İşletme oluşturuldu. İşletme Kodu: ${code}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/admin/businesses/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const updates = req.body;

    // apiKeys güncellemesi varsa, mevcut verilerle merge et veya direkt set et
    // (Nested obje olduğu için dikkatli olunmalı, ama burada direkt replace kabul edilebilir)

    const business = await Business.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!business) return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
    res.json({ success: true, data: business, message: 'İşletme güncellendi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/admin/businesses/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!business) return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
    res.json({ success: true, message: 'İşletme deaktif edildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin veya Manager: Mevcut ayarları getir
app.get('/api/admin/settings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
    }
    const settings = await Setting.find();
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    res.json({ success: true, data: settingsMap });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Admin veya Manager API Ayarları - Veritabanına kaydet
app.post('/api/admin/settings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Yetkisiz erişim' });
    }
    const updates = req.body;
    const keys = Object.keys(updates);

    for (const key of keys) {
      await Setting.findOneAndUpdate(
        { key },
        { key, value: updates[key] },
        { upsert: true, new: true }
      );
      process.env[key] = updates[key]; // Anlık olarak güncelle
    }

    console.log('[ADMIN] API Ayarları Güncellendi ve Kaydedildi');
    res.json({ success: true, message: 'API Ayarları veritabanına kaydedildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= COURIER ROUTES =============

app.get('/api/businesses/:businessId/couriers', authenticateToken, async (req, res) => {
  try {
    const couriers = await Courier.find({ businessId: req.params.businessId, isActive: true })
      .select('name username phone role isActive latitude longitude');
    res.json({ success: true, data: couriers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Kurye Şefi, Yönetici veya Admin: Ekip ve paketlerini gör
app.get('/api/couriers/team', authenticateToken, async (req, res) => {
  try {
    const { role, businessId } = req.user;
    if (role !== 'chief' && role !== 'manager' && role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Sadece yetkili personel erişebilir' });
    }

    // Admin tümünü görebilir (eğer query'de yoksa), şef ve manager sadece kendi işletmesini görür
    const targetBusinessId = role === 'admin' ? (req.query.businessId || businessId) : businessId;
    if (!targetBusinessId) {
      if (role === 'admin') return res.status(400).json({ success: false, message: 'Admin için businessId gerekli' });
      return res.status(403).json({ success: false, message: 'İşletme kimliği bulunamadı' });
    }

    const teamCouriers = await Courier.find({ businessId: targetBusinessId, isActive: true });

    const teamData = await Promise.all(teamCouriers.map(async (c) => {
      const activeOrders = await Order.find({ courierId: c._id, status: 'active' });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = await Order.countDocuments({
        courierId: c._id,
        status: 'completed',
        deliveryTime: { $gte: today },
      });

      return {
        id: c._id.toString(),
        name: c.name,
        phone: c.phone,
        role: c.role,
        latitude: c.latitude,
        longitude: c.longitude,
        activeOrders: activeOrders.length,
        completedToday,
        orders: activeOrders.map(o => ({
          id: o._id.toString(),
          orderNumber: o.orderNumber,
          platform: o.platform,
          customerName: o.customerName,
          address: o.address,
          status: o.status,
        })),
      };
    }));

    res.json({ success: true, data: teamData, count: teamData.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Yeni kurye ekle
app.post('/api/businesses/:businessId/couriers', authenticateToken, async (req, res) => {
  try {
    const { name, username, password, phone, role } = req.body;

    const existing = await Courier.findOne({ username });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    const newCourier = await Courier.create({
      businessId: req.params.businessId,
      username,
      password: bcrypt.hashSync(password, 10),
      name,
      phone,
      role: role || 'courier',
    });

    res.status(201).json({
      success: true,
      data: { id: newCourier._id.toString(), name: newCourier.name, username: newCourier.username, phone: newCourier.phone, role: newCourier.role },
      message: 'Kurye eklendi',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Kurye güncelle
app.patch('/api/couriers/:id', authenticateToken, async (req, res) => {
  try {
    const updates = {};
    const { name, phone, password, isActive } = req.body;
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (password) updates.password = bcrypt.hashSync(password, 10);
    if (typeof isActive !== 'undefined') updates.isActive = isActive;

    const courier = await Courier.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select('name username phone isActive');
    if (!courier) return res.status(404).json({ success: false, message: 'Kurye bulunamadı' });

    res.json({ success: true, data: courier, message: 'Kurye güncellendi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Kurye sil (deaktif et)
app.delete('/api/couriers/:id', authenticateToken, async (req, res) => {
  try {
    const courier = await Courier.findByIdAndUpdate(req.params.id, { isActive: false });
    if (!courier) return res.status(404).json({ success: false, message: 'Kurye bulunamadı' });
    res.json({ success: true, message: 'Kurye silindi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= ORDER ROUTES =============

// Siparişleri listele
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { status, courierId, businessId } = req.query;
    let filter = {};

    // İşletme filtresi
    if (req.user.role !== 'admin') {
      filter.businessId = req.user.businessId;
    } else if (businessId) {
      filter.businessId = businessId;
    }

    // Durum filtresi
    if (status) filter.status = status;

    // Kurye filtresi - kendi siparişleri + atanmamış siparişler (havuz)
    if (courierId) {
      filter.$or = [{ courierId: courierId }, { courierId: null }];
    }

    const orders = await Order.find(filter).sort({ orderTime: -1 });

    // Kurye adlarını ekle
    const courierIds = [...new Set(orders.filter(o => o.courierId).map(o => o.courierId.toString()))];
    const courierMap = {};
    if (courierIds.length > 0) {
      const couriersData = await Courier.find({ _id: { $in: courierIds } }).select('name');
      couriersData.forEach(c => { courierMap[c._id.toString()] = c.name; });
    }

    const enrichedOrders = orders.map(o => {
      const obj = o.toObject();
      obj.id = obj._id.toString();
      obj.courierName = obj.courierId ? (courierMap[obj.courierId.toString()] || null) : null;
      if (obj.courierId) obj.courierId = obj.courierId.toString();
      return obj;
    });

    res.json({ success: true, data: enrichedOrders, count: enrichedOrders.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sipariş üzerine al (claim)
app.patch('/api/orders/:id/claim', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });

    if (order.courierId && order.courierId.toString() !== req.user.id) {
      const currentCourier = await Courier.findById(order.courierId);
      return res.status(400).json({
        success: false,
        message: `Bu sipariş zaten ${currentCourier ? currentCourier.name : 'başka bir kurye'} üzerinde`,
      });
    }

    order.courierId = req.user.id;
    order.claimedAt = new Date();
    await order.save();

    const courier = await Courier.findById(req.user.id);
    console.log(`[ÜZERİNE ALMA] Sipariş ${order.orderNumber} -> ${courier ? courier.name : req.user.id}`);

    const obj = order.toObject();
    obj.id = obj._id.toString();
    obj.courierName = courier ? courier.name : null;
    obj.courierId = obj.courierId.toString();

    res.json({ success: true, data: obj, message: 'Sipariş üzerinize alındı' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Sipariş detayı
app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
    const obj = order.toObject();
    obj.id = obj._id.toString();
    res.json({ success: true, data: obj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Manuel sipariş oluştur
app.post('/api/orders/manual', authenticateToken, async (req, res) => {
  try {
    const { customerName, phone, address, items, totalPrice, platform, latitude, longitude } = req.body;

    // Kurye kendi işletmesi adına sipariş oluşturur
    const user = req.user;
    const businessId = user.businessId;

    const orderNumber = `MAN-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = await Order.create({
      businessId,
      platform: platform || 'Manuel',
      customerName,
      phone,
      address,
      items: items || [],
      totalPrice,
      orderNumber,
      status: 'active',
      orderTime: new Date(),
      latitude: latitude || 0,
      longitude: longitude || 0,
      courierId: null, // Havuza düşer
    });

    res.json({ success: true, data: newOrder, message: 'Sipariş oluşturuldu' });
  } catch (err) {
    console.error('[MANUAL ORDER ERROR]', err);
    res.status(500).json({ success: false, message: 'Sipariş oluşturulamadı: ' + err.message });
  }
});

// Yeni sipariş oluştur
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const newOrder = await Order.create({
      businessId: req.body.businessId,
      platform: req.body.platform,
      customerName: req.body.customerName,
      phone: req.body.phone,
      address: req.body.address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      items: req.body.items,
      totalPrice: req.body.totalPrice,
      orderNumber: `${req.body.platform.substring(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    });

    res.status(201).json({ success: true, data: newOrder, message: 'Sipariş oluşturuldu' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PlatformAPI = require('./services/platformAPI'); // Platform API servisi eklendi

// ...

// Sipariş güncelle
app.patch('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });

    const { status, courierId } = req.body;

    // Eski durumdan farklı bir durum geliyorsa ve tamamlandıysa işlem yap
    const isCompleting = status === 'completed' && order.status !== 'completed';

    if (status) order.status = status;
    if (courierId) order.courierId = courierId;

    if (isCompleting) {
      order.deliveryTime = new Date();

      // Platform Entegrasyonu: Arka planda ilgili platforma bildir
      // İşletme bilgilerini (API Keyler için) çekmemiz gerek
      const business = await Business.findById(order.businessId);
      if (business) {
        if (order.platform === 'Trendyol Yemek') {
          PlatformAPI.updateTrendyol(order, business).catch(e => console.error('[PLATFORM SYNC] Trendyol update failed:', e));
        } else if (order.platform === 'Yemeksepeti') {
          PlatformAPI.updateYemeksepeti(order, business).catch(e => console.error('[PLATFORM SYNC] Yemeksepeti update failed:', e));
        } else if (order.platform === 'Getir Yemek') {
          PlatformAPI.updateGetir(order, business).catch(e => console.error('[PLATFORM SYNC] Getir update failed:', e));
        }
      }
    }

    await order.save();
    res.json({ success: true, data: order, message: 'Sipariş güncellendi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= STATS ROUTES =============

app.get('/api/couriers/:id/stats', authenticateToken, async (req, res) => {
  try {
    const courier = await Courier.findById(req.params.id);
    if (!courier) return res.status(404).json({ success: false, message: 'Kurye bulunamadı' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.countDocuments({
      courierId: req.params.id,
      status: 'completed',
      deliveryTime: { $gte: today },
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekOrders = await Order.find({
      courierId: req.params.id,
      status: 'completed',
      deliveryTime: { $gte: weekStart },
    });

    const deliveryTimes = weekOrders.map(o => {
      return (new Date(o.deliveryTime) - new Date(o.orderTime)) / 60000;
    });

    const avgTime = deliveryTimes.length > 0
      ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
      : 0;

    res.json({
      success: true,
      data: { today: todayOrders, thisWeek: weekOrders.length, avgTime: `${avgTime} dk` },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/businesses/:id/stats', authenticateToken, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const filter = { businessId: req.params.id };
    const todayOrders = await Order.countDocuments({ ...filter, orderTime: { $gte: today } });
    const activeOrders = await Order.countDocuments({ ...filter, status: 'active' });
    const completedOrders = await Order.countDocuments({ ...filter, status: 'completed' });
    const totalOrders = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: { todayOrders, activeOrders, completedOrders, totalOrders },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= PUSH TOKEN API =============

// Push token kaydet
app.post('/api/push-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || !Expo.isExpoPushToken(token)) {
      return res.status(400).json({ success: false, message: 'Geçersiz push token' });
    }

    const courier = await Courier.findById(req.user.id).select('name role businessId');
    pushTokens.set(req.user.id, {
      courierId: req.user.id,
      token,
      businessId: req.user.businessId || (courier ? courier.businessId.toString() : null),
      role: req.user.role,
      name: courier ? courier.name : 'Bilinmeyen',
    });

    console.log(`[PUSH] Token kaydedildi: ${courier ? courier.name : req.user.id}`);
    res.json({ success: true, message: 'Push token kaydedildi' });
  } catch (err) {
    console.error('[PUSH TOKEN ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Token kaydedilemedi' });
  }
});

// Push token sil (logout)
app.delete('/api/push-token', authenticateToken, async (req, res) => {
  pushTokens.delete(req.user.id);
  res.json({ success: true, message: 'Push token silindi' });
});

// ============= WEBHOOK ENDPOINTS =============

// Webhook API key doğrulama middleware'i
const validateWebhookKey = (req, res, next) => {
  const apiKey = req.headers['x-webhook-key'];
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (webhookSecret && (!apiKey || apiKey !== webhookSecret)) {
    return res.status(401).json({ success: false, message: 'Geçersiz API anahtarı' });
  }
  next();
};

app.post('/api/webhooks/trendyol/:businessCode', validateWebhookKey, async (req, res) => {
  try {
    const business = await Business.findOne({ code: req.params.businessCode });
    if (!business) return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });

    const order = await Order.create({
      businessId: business._id,
      platform: 'Trendyol Yemek',
      orderNumber: req.body.orderNumber || `TY-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: req.body.customer?.name || 'Müşteri',
      phone: req.body.customer?.phone || '',
      address: req.body.delivery?.address || '',
      latitude: req.body.delivery?.latitude || 0,
      longitude: req.body.delivery?.longitude || 0,
      items: req.body.items?.map(i => i.name) || [],
      totalPrice: `${req.body.totalPrice || 0} TL`,
    });

    console.log(`[WEBHOOK] Trendyol sipariş: ${order.orderNumber}`);

    // Push bildirim gönder
    const tokens = getBusinessTokens(business._id.toString());
    sendPushNotification(tokens, '📦 Yeni Sipariş!', `Trendyol - ${order.orderNumber}: ${order.customerName}`, { type: 'new_order', orderId: order._id.toString() });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/webhooks/yemeksepeti/:businessCode', validateWebhookKey, async (req, res) => {
  try {
    const business = await Business.findOne({ code: req.params.businessCode });
    if (!business) return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });

    const order = await Order.create({
      businessId: business._id,
      platform: 'Yemeksepeti',
      orderNumber: req.body.id || `YS-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: req.body.customerName || 'Müşteri',
      phone: req.body.phoneNumber || '',
      address: req.body.deliveryAddress || '',
      latitude: req.body.coords?.lat || 0,
      longitude: req.body.coords?.lng || 0,
      items: req.body.products?.map(p => p.title) || [],
      totalPrice: `${req.body.amount || 0} TL`,
    });

    console.log(`[WEBHOOK] Yemeksepeti sipariş: ${order.orderNumber}`);

    const tokens = getBusinessTokens(business._id.toString());
    sendPushNotification(tokens, '📦 Yeni Sipariş!', `Yemeksepeti - ${order.orderNumber}: ${order.customerName}`, { type: 'new_order', orderId: order._id.toString() });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/webhooks/getir/:businessCode', validateWebhookKey, async (req, res) => {
  try {
    const business = await Business.findOne({ code: req.params.businessCode });
    if (!business) return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });

    const order = await Order.create({
      businessId: business._id,
      platform: 'Getir Yemek',
      orderNumber: req.body.id || `GY-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: req.body.client?.name || 'Müşteri',
      phone: req.body.client?.phone || '',
      address: req.body.deliveryAddress || '',
      latitude: req.body.location?.lat || 0,
      longitude: req.body.location?.lng || 0,
      items: req.body.products?.map(p => p.name) || [],
      totalPrice: `${req.body.totalPrice || 0} TL`,
    });

    console.log(`[WEBHOOK] Getir sipariş: ${order.orderNumber}`);

    const tokens = getBusinessTokens(business._id.toString());
    sendPushNotification(tokens, '📦 Yeni Sipariş!', `Getir Yemek - ${order.orderNumber}: ${order.customerName}`, { type: 'new_order', orderId: order._id.toString() });

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= KONUM TAKİBİ API =============

// Kurye konum güncelleme
app.post('/api/couriers/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    console.log(`[LOCATION UPDATE] User: ${req.user.name} (${req.user.id}) Lat: ${latitude} Lng: ${longitude}`);

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Konum bilgisi gerekli' });
    }

    const courier = await Courier.findByIdAndUpdate(
      req.user.id,
      {
        latitude,
        longitude,
        lastUpdate: new Date()
      },
      { new: true }
    ).select('name phone role businessId');

    if (!courier) {
      return res.status(404).json({ success: false, message: 'Kurye bulunamadı' });
    }

    // Map'e ekle (Memory Cache)
    courierLocations.set(req.user.id, {
      courierId: req.user.id,
      name: courier.name,
      phone: courier.phone,
      role: courier.role,
      businessId: courier.businessId.toString(),
      latitude,
      longitude,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[LOCATION CACHE] Added to map. Total couriers: ${courierLocations.size}`);
    res.json({ success: true, message: 'Konum güncellendi' });
  } catch (err) {
    console.error('[LOCATION ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Konum güncellenirken hata oluştu' });
  }
});

// Tüm kuryelerin konumlarını getir (admin/şef)
app.get('/api/couriers/locations', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'chief' && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Bu özellik sadece admin, yönetici ve kurye şefleri içindir' });
    }

    const now = Date.now();
    const STALE_THRESHOLD = 30 * 60 * 1000; // 30 dakika

    console.log(`[LOCATIONS FETCH] Requestor: ${req.user.name} Business: ${req.user.businessId}`);

    // DB'den aktif kuryeleri çek (Memory Map yerine)
    const query = { isActive: true };
    // Yönetici/Şef sadece kendi işletmesini görür
    if (req.user.role === 'chief' || req.user.role === 'manager') {
      query.businessId = req.user.businessId;
    }

    const activeCouriers = await Courier.find(query).select('name phone role businessId latitude longitude lastUpdate');

    console.log(`[LOCATIONS DB] Found ${activeCouriers.length} in DB`);

    const locations = activeCouriers
      .filter(c => c.latitude && c.longitude) // Konumu olanları al
      .map(c => {
        const updatedAt = c.lastUpdate ? new Date(c.lastUpdate) : new Date(0);
        const isStale = (now - updatedAt.getTime()) > STALE_THRESHOLD;

        return {
          courierId: c._id,
          name: c.name,
          phone: c.phone,
          role: c.role,
          businessId: c.businessId,
          latitude: c.latitude,
          longitude: c.longitude,
          updatedAt: c.lastUpdate,
          isStale
        };
      });

    console.log(`[LOCATIONS FETCH] Returning ${locations.length} valid locations`);
    res.json({ success: true, data: locations, count: locations.length });
  } catch (err) {
    console.error('[LOCATION ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Konumlar alınırken hata oluştu' });
  }
});

// ============= PERFORMANS RAPORLARI API =============

// Detaylı performans raporu (admin/şef)
app.get('/api/reports/performance', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'chief' && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Yetki yok' });
    }

    const businessId = req.user.businessId;
    const now = new Date();

    // Bugün
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    // Bu hafta
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
    // Bu ay
    const monthStart = new Date(now); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const filter = businessId ? { businessId } : {};

    // Genel istatistikler
    const todayCompleted = await Order.countDocuments({ ...filter, status: 'completed', deliveryTime: { $gte: todayStart } });
    const weekCompleted = await Order.countDocuments({ ...filter, status: 'completed', deliveryTime: { $gte: weekStart } });
    const monthCompleted = await Order.countDocuments({ ...filter, status: 'completed', deliveryTime: { $gte: monthStart } });
    const activeOrders = await Order.countDocuments({ ...filter, status: 'active' });
    const totalOrders = await Order.countDocuments(filter);

    // Platform dağılımı
    const platformStats = await Order.aggregate([
      { $match: { ...filter, status: 'completed', deliveryTime: { $gte: monthStart } } },
      { $group: { _id: '$platform', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Saatlik dağılım (bugün)
    const hourlyStats = await Order.aggregate([
      { $match: { ...filter, orderTime: { $gte: todayStart } } },
      { $group: { _id: { $hour: '$orderTime' }, count: { $sum: 1 } } },
      { $sort: { '_id': 1 } },
    ]);

    // Kurye performansları
    const courierPerformance = await Order.aggregate([
      { $match: { ...filter, status: 'completed', deliveryTime: { $gte: weekStart }, courierId: { $ne: null } } },
      {
        $group: {
          _id: '$courierId',
          courierName: { $first: '$courierName' },
          deliveries: { $sum: 1 },
          avgDeliveryTime: { $avg: { $subtract: ['$deliveryTime', '$claimedAt'] } },
          avgRating: { $avg: '$rating' },
        }
      },
      { $sort: { deliveries: -1 } },
    ]);

    // Ortalama teslimat süresi
    const avgTimeResult = await Order.aggregate([
      { $match: { ...filter, status: 'completed', deliveryTime: { $gte: weekStart }, claimedAt: { $ne: null } } },
      { $group: { _id: null, avgTime: { $avg: { $subtract: ['$deliveryTime', '$claimedAt'] } } } },
    ]);
    const avgDeliveryMinutes = avgTimeResult.length > 0 ? Math.round(avgTimeResult[0].avgTime / 60000) : 0;

    // Günlük trend (son 7 gün)
    const dailyTrend = await Order.aggregate([
      { $match: { ...filter, status: 'completed', deliveryTime: { $gte: weekStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$deliveryTime' } },
          count: { $sum: 1 },
        }
      },
      { $sort: { '_id': 1 } },
    ]);

    // Ortalama puan
    const avgRatingResult = await Order.aggregate([
      { $match: { ...filter, rating: { $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalRated: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      data: {
        summary: { todayCompleted, weekCompleted, monthCompleted, activeOrders, totalOrders, avgDeliveryMinutes },
        platformStats: platformStats.map(p => ({ platform: p._id, count: p.count })),
        hourlyStats: hourlyStats.map(h => ({ hour: h._id, count: h.count })),
        courierPerformance: courierPerformance.map(c => ({
          name: c.courierName || 'Bilinmeyen',
          deliveries: c.deliveries,
          avgMinutes: c.avgDeliveryTime ? Math.round(c.avgDeliveryTime / 60000) : 0,
          avgRating: c.avgRating ? c.avgRating.toFixed(1) : '-',
        })),
        dailyTrend: dailyTrend.map(d => ({ date: d._id, count: d.count })),
        avgRating: avgRatingResult.length > 0 ? {
          score: avgRatingResult[0].avgRating.toFixed(1),
          total: avgRatingResult[0].totalRated,
        } : { score: '0', total: 0 },
      },
    });
  } catch (err) {
    console.error('[REPORTS ERROR]', err.message);
    res.status(500).json({ success: false, message: 'Rapor verileri alınamadı' });
  }
});

// ============= SİPARİŞ GEÇMİŞİ & ARAMA API =============

app.get('/api/orders/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, platform, status, startDate, endDate, courierId } = req.query;
    const filter = {};

    // İşletme filtresi
    if (req.user.businessId) filter.businessId = req.user.businessId;

    // Arama
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtreler
    if (platform) filter.platform = platform;
    if (status) filter.status = status;
    if (courierId) filter.courierId = courierId;
    if (startDate || endDate) {
      filter.orderTime = {};
      if (startDate) filter.orderTime.$gte = new Date(startDate);
      if (endDate) filter.orderTime.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(filter)
      .sort({ orderTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= MANUEL SİPARİŞ EKLEME (MOBİL) =============

app.post('/api/orders/manual', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'chief' && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Yetki yok' });
    }

    const { customerName, phone, address, items, totalPrice, platform } = req.body;
    if (!customerName || !address) {
      return res.status(400).json({ success: false, message: 'Müşteri adı ve adres zorunludur' });
    }

    const order = await Order.create({
      businessId: req.user.businessId,
      platform: platform || 'Manuel',
      orderNumber: `MN-${Date.now().toString(36).toUpperCase()}`,
      customerName,
      phone: phone || '',
      address,
      items: items || [],
      totalPrice: totalPrice || '0 TL',
    });

    // Push bildirim gönder
    const tokens = getBusinessTokens(req.user.businessId);
    sendPushNotification(tokens, '📦 Yeni Manuel Sipariş!', `${order.orderNumber}: ${customerName}`, { type: 'new_order', orderId: order._id.toString() });

    console.log(`[MANUAL ORDER] ${order.orderNumber} oluşturuldu`);
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= DEĞERLENDİRME API =============

// Siparişe değerlendirme ekle
app.patch('/api/orders/:id/rating', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Geçersiz puan (1-5)' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { rating, ratingComment: comment || null },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });

    // Şeflere bildirim
    if (order.businessId) {
      const chiefTokens = getRoleTokens(order.businessId.toString(), 'chief');
      sendPushNotification(chiefTokens, '⭐ Yeni Değerlendirme', `${order.orderNumber}: ${rating}/5 yıldız`, { type: 'rating' });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= TESLİMAT FOTOĞRAFI API =============

app.patch('/api/orders/:id/photo', authenticateToken, async (req, res) => {
  try {
    const { photo } = req.body; // base64 string
    if (!photo) {
      return res.status(400).json({ success: false, message: 'Fotoğraf verisi gerekli' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { deliveryPhoto: photo },
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });

    res.json({ success: true, message: 'Fotoğraf kaydedildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= ROTA OPTİMİZASYONU API =============

// Birden fazla aktif sipariş için en kısa rota hesapla (nearest neighbor)
app.get('/api/orders/optimized-route', authenticateToken, async (req, res) => {
  try {
    const { lat, lng } = req.query; // Kuryenin mevcut konumu
    if (!lat || !lng) {
      return res.status(400).json({ success: false, message: 'Konum bilgisi gerekli' });
    }

    const orders = await Order.find({
      courierId: req.user.id,
      status: 'active',
      latitude: { $ne: null, $ne: 0 },
      longitude: { $ne: null, $ne: 0 },
    });

    if (orders.length === 0) {
      return res.json({ success: true, data: [], message: 'Aktif sipariş yok' });
    }

    // Nearest neighbor algoritması
    const haversine = (lat1, lon1, lat2, lon2) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let currentLat = parseFloat(lat);
    let currentLng = parseFloat(lng);
    const remaining = [...orders];
    const optimizedRoute = [];
    let totalDistance = 0;

    while (remaining.length > 0) {
      let nearest = 0;
      let minDist = Infinity;

      remaining.forEach((order, i) => {
        const dist = haversine(currentLat, currentLng, order.latitude, order.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      });

      const nextOrder = remaining.splice(nearest, 1)[0];
      totalDistance += minDist;
      optimizedRoute.push({
        orderId: nextOrder._id,
        orderNumber: nextOrder.orderNumber,
        customerName: nextOrder.customerName,
        address: nextOrder.address,
        latitude: nextOrder.latitude,
        longitude: nextOrder.longitude,
        distance: minDist.toFixed(1) + ' km',
      });

      currentLat = nextOrder.latitude;
      currentLng = nextOrder.longitude;
    }

    res.json({
      success: true,
      data: optimizedRoute,
      totalDistance: totalDistance.toFixed(1) + ' km',
      orderCount: optimizedRoute.length,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============= DEBUG ROUTES =============
app.post('/api/debug/seed', async (req, res) => {
  try {
    const business = await Business.findOne({ code: 'DEMO123' });
    if (!business) return res.status(404).json({ success: false, message: 'DEMO123 bulunamadı' });

    const courier = await Courier.findOne({ businessId: business._id, username: 'kurye1' });
    const courierId = courier ? courier._id : null;

    const sampleOrders = [
      {
        businessId: business._id,
        orderNumber: `TEST-${Math.floor(Math.random() * 10000)}`,
        customerName: 'Ahmet Yılmaz (Valid Coords)',
        address: 'Atatürk Cd. No:1, İstanbul',
        totalPrice: '150 TL',
        items: ['Burger Menü', 'Kola'],
        platform: 'Getir Yemek',
        paymentMethod: 'Credit Card',
        status: 'active',
        courierId: courierId,
        latitude: 41.0082,
        longitude: 28.9784,
        orderTime: new Date()
      },
      {
        businessId: business._id,
        orderNumber: `TEST-${Math.floor(Math.random() * 10000)}`,
        customerName: 'Mehmet Demir (No Coords)',
        address: 'Bağdat Cd. No:15, İstanbul',
        totalPrice: '220 TL',
        items: ['Pizza', 'Ayran'],
        platform: 'Yemeksepeti',
        paymentMethod: 'Cash',
        status: 'active',
        courierId: courierId,
        latitude: 0,
        longitude: 0,
        orderTime: new Date()
      },
      {
        businessId: business._id,
        orderNumber: `TEST-${Math.floor(Math.random() * 10000)}`,
        customerName: 'Ayşe Kaya (Completed)',
        address: 'İstiklal Cd. No:50, İstanbul',
        totalPrice: '85 TL',
        items: ['Döner', 'Şalgam'],
        platform: 'Trendyol Yemek',
        paymentMethod: 'Credit Card',
        status: 'completed',
        courierId: courierId,
        latitude: 41.0282,
        longitude: 28.9734,
        orderTime: new Date(Date.now() - 3600000),
        deliveryTime: new Date()
      }
    ];

    await Order.insertMany(sampleOrders);
    res.json({ success: true, message: '3 adet test siparişi eklendi', data: sampleOrders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});



// DEBUG: Tüm kuryeleri ham olarak getir
app.get('/api/debug/couriers', async (req, res) => {
  try {
    const couriers = await Courier.find({});
    const memoryMap = Array.from(courierLocations.entries());
    res.json({ success: true, dbCount: couriers.length, couriers, memoryMap });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============= STARTUP & ERROR HANDLING =============

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const startServer = async () => {
  // 1. Önce sunucuyu başlat (Railway Health Check için)
  const server = app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                   KURYE APP SERVER                         ║
╠════════════════════════════════════════════════════════════╣
║   ✓ Status: Online (Listening)                             ║
║   ✓ Port: ${PORT}                                          ║
║   ✓ Environment: ${process.env.NODE_ENV || 'development'}  ║
╚════════════════════════════════════════════════════════════╝
      `);
  });

  server.on('error', (err) => {
    console.error('[SERVER ERROR] Failed to start:', err);
    // Port hatası kritik olabilir, ama yeniden başlatmayı platforma bırakalım
  });

  // 2. Sonra Veritabanına Bağlan
  try {
    console.log('[STARTUP] Veritabanına bağlanılıyor...');
    await connectDB();
    console.log('[STARTUP] Veritabanı bağlantısı başarılı.');

    await loadSettings();
    console.log('[STARTUP] Ayarlar yüklendi.');

    // Kurye konumlarını hafızaya yükle
    try {
      const couriers = await Courier.find({ isActive: true, role: { $in: ['courier', 'chief'] } }).select('_id name phone role businessId latitude longitude lastUpdate');
      couriers.forEach(c => {
        if (c.latitude !== undefined && c.longitude !== undefined) {
          courierLocations.set(c._id.toString(), {
            courierId: c._id.toString(),
            name: c.name,
            phone: c.phone,
            role: c.role,
            businessId: c.businessId.toString(),
            latitude: c.latitude,
            longitude: c.longitude,
            updatedAt: c.lastUpdate ? new Date(c.lastUpdate).toISOString() : new Date().toISOString(),
          });
        }
      });
      console.log(`[STARTUP] ${couriers.length} kurye konumu hafızaya yüklendi.`);
    } catch (locError) {
      console.error('[STARTUP WARNING] Konumlar yüklenemedi:', locError.message);
    }


  } catch (error) {
    console.error('================================================');
    console.error('[STARTUP ERROR] Kritik servisler başlatılamadı!');
    console.error('Hata Detayı:', error.message);
    console.error('NOT: Sunucu açık kalacak ancak API yanıt vermeyebilir.');
    console.error('================================================');
  }
};

// DEBUG: Rastgele konum verisi oluştur (Test için)
app.get('/api/debug/seed-locations', async (req, res) => {
  try {
    const couriers = await Courier.find({ isActive: true, role: { $in: ['courier', 'chief'] } });
    const centerLat = 41.0082;
    const centerLng = 28.9784; // İstanbul

    let updatedCount = 0;
    for (const c of couriers) {
      // Rastgele küçük sapma
      const lat = centerLat + (Math.random() - 0.5) * 0.1;
      const lng = centerLng + (Math.random() - 0.5) * 0.1;

      c.latitude = lat;
      c.longitude = lng;
      c.lastUpdate = new Date();
      await c.save();

      courierLocations.set(c._id.toString(), {
        courierId: c._id.toString(),
        name: c.name,
        phone: c.phone,
        role: c.role,
        businessId: c.businessId.toString(),
        latitude: lat,
        longitude: lng,
        updatedAt: c.lastUpdate.toISOString(),
      });
      updatedCount++;
    }
    res.json({ success: true, message: `${updatedCount} kurye konumu güncellendi.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

startServer();
