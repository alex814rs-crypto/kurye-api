require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Ana Sayfa (Root Route)
app.get('/', (req, res) => {
  res.send(`
    <div style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>🚀 Kurye Uygulaması Sunucusu Çalışıyor!</h1>
      <p>Şu an <strong>ROOT (/)</strong> dizinindesiniz.</p>
      <p>Sağlık kontrolü için: <a href="/health">/health</a> adresine gidin.</p>
    </div>
  `);
});

// ============= VERİTABANI (Gerçek uygulamada PostgreSQL/MySQL kullanın) =============

let businesses = [
  {
    id: '1',
    code: 'DEMO123',
    name: 'Demo Restoran',
    owner: 'Ahmet Yılmaz',
    email: 'demo@restoran.com',
    phone: '+905551234567',
    address: 'Gebze, Kocaeli',
    createdAt: new Date().toISOString(),
    isActive: true,
  },
];

let couriers = [
  {
    id: '1',
    businessId: '1',
    username: 'kurye1',
    password: bcrypt.hashSync('1234', 10),
    name: 'Mehmet Kurye',
    phone: '+905559999999',
    role: 'courier',
    isActive: true,
  },
  {
    id: '2',
    businessId: '1',
    username: 'sef1',
    password: bcrypt.hashSync('1234', 10),
    name: 'Ali Şef',
    phone: '+905558888888',
    role: 'chief',
    isActive: true,
  },
];

let orders = [
  {
    id: '1',
    businessId: '1',
    platform: 'Trendyol Yemek',
    customerName: 'Ayşe Demir',
    phone: '+905551234567',
    address: 'Cumhuriyet Mah. Atatürk Cad. No: 45/3 Gebze/Kocaeli',
    latitude: 40.8027,
    longitude: 29.4308,
    items: ['Adana Dürüm', 'Ayran', 'Patates Kızartması'],
    totalPrice: '125.50 TL',
    orderTime: new Date().toISOString(),
    status: 'active',
    orderNumber: 'TY-8472',
    courierId: '1',
  },
  {
    id: '2',
    businessId: '1',
    platform: 'Yemeksepeti',
    customerName: 'Fatma Yıldız',
    phone: '+905552345678',
    address: 'Osman Yılmaz Mah. İnönü Cad. No: 12/A Gebze/Kocaeli',
    latitude: 40.7988,
    longitude: 29.4365,
    items: ['Karışık Pizza', 'Kola', 'Tiramisu'],
    totalPrice: '189.00 TL',
    orderTime: new Date().toISOString(),
    status: 'active',
    orderNumber: 'YS-3291',
    courierId: '1',
  },
  {
    id: '3',
    businessId: '1',
    platform: 'Getir Yemek',
    customerName: 'Emre Kaya',
    phone: '+905553456789',
    address: 'Sultan Orhan Mah. Gebze Cad. No: 88 Gebze/Kocaeli',
    latitude: 40.8055,
    longitude: 29.4272,
    items: ['Tavuk Döner', 'Mercimek Çorbası', 'Baklava'],
    totalPrice: '155.75 TL',
    orderTime: new Date().toISOString(),
    status: 'active',
    orderNumber: 'GY-7154',
    courierId: '2',
  },
  {
    id: '4',
    businessId: '1',
    platform: 'Yemeksepeti',
    customerName: 'Zeynep Arslan',
    phone: '+905554567890',
    address: 'Güzeller Mah. İstanbul Cad. No: 22 Gebze/Kocaeli',
    latitude: 40.8012,
    longitude: 29.4410,
    items: ['Lahmacun x2', 'Ayran', 'Künefe'],
    totalPrice: '142.00 TL',
    orderTime: new Date().toISOString(),
    status: 'active',
    orderNumber: 'YS-5823',
    courierId: null,
  },
];

let admins = [
  {
    id: '1',
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
  },
];

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
app.post('/api/auth/login', (req, res) => {
  const { businessCode, username, password } = req.body;

  // İşletmeyi bul
  const business = businesses.find(b => b.code === businessCode && b.isActive);
  if (!business) {
    return res.status(401).json({ success: false, message: 'Geçersiz işletme kodu' });
  }

  // Kuryeyi bul
  const courier = couriers.find(
    c => c.businessId === business.id && c.username === username && c.isActive
  );
  if (!courier) {
    return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });
  }

  // Şifreyi kontrol et
  if (!bcrypt.compareSync(password, courier.password)) {
    return res.status(401).json({ success: false, message: 'Hatalı şifre' });
  }

  // Token oluştur (role alanı courier modelinden alınır)
  const token = jwt.sign(
    { id: courier.id, businessId: business.id, role: courier.role || 'courier' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    user: {
      id: courier.id,
      name: courier.name,
      username: courier.username,
      businessId: business.id,
      businessName: business.name,
      role: courier.role || 'courier',
    },
  });
});

// Admin girişi
app.post('/api/auth/admin-login', (req, res) => {
  const { username, password } = req.body;

  const admin = admins.find(a => a.username === username);
  if (!admin) {
    return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı' });
  }

  if (!bcrypt.compareSync(password, admin.password)) {
    return res.status(401).json({ success: false, message: 'Hatalı şifre' });
  }

  const token = jwt.sign(
    { id: admin.id, role: 'admin' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    user: { id: admin.id, username: admin.username, role: 'admin' },
  });
});

// ============= BUSINESS ROUTES (Admin) =============

// Tüm işletmeleri listele
app.get('/api/admin/businesses', authenticateToken, isAdmin, (req, res) => {
  res.json({
    success: true,
    data: businesses,
    count: businesses.length,
  });
});

// Yeni işletme oluştur
app.post('/api/admin/businesses', authenticateToken, isAdmin, (req, res) => {
  const { name, owner, email, phone, address } = req.body;

  // Benzersiz kod oluştur
  const code = `${name.substring(0, 3).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;

  const newBusiness = {
    id: String(businesses.length + 1),
    code,
    name,
    owner,
    email,
    phone,
    address,
    createdAt: new Date().toISOString(),
    isActive: true,
  };

  businesses.push(newBusiness);

  res.status(201).json({
    success: true,
    data: newBusiness,
    message: `İşletme oluşturuldu. İşletme Kodu: ${code}`,
  });
});

// İşletme güncelle
app.patch('/api/admin/businesses/:id', authenticateToken, isAdmin, (req, res) => {
  const business = businesses.find(b => b.id === req.params.id);

  if (!business) {
    return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
  }

  Object.assign(business, req.body);

  res.json({
    success: true,
    data: business,
    message: 'İşletme güncellendi',
  });
});

// İşletme sil/deaktif et
app.delete('/api/admin/businesses/:id', authenticateToken, isAdmin, (req, res) => {
  const business = businesses.find(b => b.id === req.params.id);

  if (!business) {
    return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
  }

  business.isActive = false;

  res.json({
    success: true,
    message: 'İşletme deaktif edildi',
  });
});

// Admin API Ayarları Endpoint'i
app.post('/api/admin/settings', authenticateToken, isAdmin, (req, res) => {
  const { TRENDYOL_API_KEY, TRENDYOL_SUPPLIER_ID, YEMEKSEPETI_API_KEY, GETIR_API_KEY } = req.body;

  // Bellek içi güncelleme (Sunucu kapanınca gider, kalıcı olması için veritabanı veya JSON dosyası gerekir)
  if (TRENDYOL_API_KEY) process.env.TRENDYOL_API_KEY = TRENDYOL_API_KEY;
  if (TRENDYOL_SUPPLIER_ID) process.env.TRENDYOL_SUPPLIER_ID = TRENDYOL_SUPPLIER_ID;
  if (YEMEKSEPETI_API_KEY) process.env.YEMEKSEPETI_API_KEY = YEMEKSEPETI_API_KEY;
  if (GETIR_API_KEY) process.env.GETIR_API_KEY = GETIR_API_KEY;

  console.log('[ADMIN] API Ayarları Güncellendi');

  res.json({
    success: true,
    message: 'API Ayarları güncellendi',
  });
});

// ============= COURIER ROUTES =============

// İşletmenin kuryelerini listele
app.get('/api/businesses/:businessId/couriers', authenticateToken, (req, res) => {
  const businessCouriers = couriers.filter(
    c => c.businessId === req.params.businessId && c.isActive
  );

  res.json({
    success: true,
    data: businessCouriers.map(c => ({
      id: c.id,
      name: c.name,
      username: c.username,
      phone: c.phone,
      role: c.role || 'courier',
      isActive: c.isActive,
    })),
  });
});

// Kurye Şefi: Ekip ve paketlerini gör
app.get('/api/couriers/team', authenticateToken, (req, res) => {
  // Sadece chief role'e sahip kuryeler erişebilir
  if (req.user.role !== 'chief') {
    return res.status(403).json({ success: false, message: 'Sadece Kurye Şefleri erişebilir' });
  }

  const teamCouriers = couriers.filter(
    c => c.businessId === req.user.businessId && c.isActive
  );

  const teamData = teamCouriers.map(c => {
    const activeOrders = orders.filter(o => o.courierId === c.id && o.status === 'active');
    const completedToday = orders.filter(o => {
      if (o.courierId !== c.id || o.status !== 'completed') return false;
      return new Date(o.deliveryTime).toDateString() === new Date().toDateString();
    });

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      role: c.role,
      activeOrders: activeOrders.length,
      completedToday: completedToday.length,
      orders: activeOrders.map(o => ({
        id: o.id,
        orderNumber: o.orderNumber,
        platform: o.platform,
        customerName: o.customerName,
        address: o.address,
        status: o.status,
      })),
    };
  });

  res.json({
    success: true,
    data: teamData,
    count: teamData.length,
  });
});

// Yeni kurye ekle
app.post('/api/businesses/:businessId/couriers', authenticateToken, (req, res) => {
  const { name, username, password, phone, role } = req.body;

  // Kullanıcı adı kontrolü
  const existingCourier = couriers.find(c => c.username === username);
  if (existingCourier) {
    return res.status(400).json({
      success: false,
      message: 'Bu kullanıcı adı zaten kullanılıyor',
    });
  }

  const newCourier = {
    id: String(couriers.length + 1),
    businessId: req.params.businessId,
    username,
    password: bcrypt.hashSync(password, 10),
    name,
    phone,
    role: role || 'courier',
    isActive: true,
  };

  couriers.push(newCourier);

  res.status(201).json({
    success: true,
    data: {
      id: newCourier.id,
      name: newCourier.name,
      username: newCourier.username,
      phone: newCourier.phone,
      role: newCourier.role,
    },
    message: 'Kurye eklendi',
  });
});

// Kurye güncelle
app.patch('/api/couriers/:id', authenticateToken, (req, res) => {
  const courier = couriers.find(c => c.id === req.params.id);

  if (!courier) {
    return res.status(404).json({ success: false, message: 'Kurye bulunamadı' });
  }

  const { name, phone, password, isActive } = req.body;

  if (name) courier.name = name;
  if (phone) courier.phone = phone;
  if (password) courier.password = bcrypt.hashSync(password, 10);
  if (typeof isActive !== 'undefined') courier.isActive = isActive;

  res.json({
    success: true,
    data: {
      id: courier.id,
      name: courier.name,
      username: courier.username,
      phone: courier.phone,
      isActive: courier.isActive,
    },
    message: 'Kurye güncellendi',
  });
});

// Kurye sil
app.delete('/api/couriers/:id', authenticateToken, (req, res) => {
  const courierIndex = couriers.findIndex(c => c.id === req.params.id);

  if (courierIndex === -1) {
    return res.status(404).json({ success: false, message: 'Kurye bulunamadı' });
  }

  couriers[courierIndex].isActive = false;

  res.json({
    success: true,
    message: 'Kurye silindi',
  });
});

// ============= ORDER ROUTES =============

// Siparişleri listele
app.get('/api/orders', authenticateToken, (req, res) => {
  const { status, courierId, businessId } = req.query;

  let filteredOrders = orders;

  // İşletme filtresi
  if (req.user.role === 'courier') {
    filteredOrders = filteredOrders.filter(o => o.businessId === req.user.businessId);
  } else if (businessId) {
    filteredOrders = filteredOrders.filter(o => o.businessId === businessId);
  }

  // Durum filtresi
  if (status) {
    filteredOrders = filteredOrders.filter(o => o.status === status);
  }

  // Kurye filtresi - kendi siparişleri + atanmamış siparişler (havuz)
  if (courierId) {
    filteredOrders = filteredOrders.filter(o => o.courierId === courierId || o.courierId === null);
  }

  // Sipariş verilerine kurye adı ekle
  const enrichedOrders = filteredOrders.map(o => {
    const courier = couriers.find(c => c.id === o.courierId);
    return { ...o, courierName: courier ? courier.name : null };
  });

  res.json({
    success: true,
    data: enrichedOrders,
    count: enrichedOrders.length,
  });
});

// Sipariş üzerine al (claim)
app.patch('/api/orders/:id/claim', authenticateToken, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
  }

  if (order.courierId && order.courierId !== req.user.id) {
    const currentCourier = couriers.find(c => c.id === order.courierId);
    return res.status(400).json({
      success: false,
      message: `Bu sipariş zaten ${currentCourier ? currentCourier.name : 'başka bir kurye'} üzerinde`,
    });
  }

  order.courierId = req.user.id;
  order.claimedAt = new Date().toISOString();

  const courier = couriers.find(c => c.id === req.user.id);
  console.log(`[ÜZERİNE ALMA] Sipariş ${order.orderNumber} -> ${courier ? courier.name : req.user.id}`);

  res.json({
    success: true,
    data: { ...order, courierName: courier ? courier.name : null },
    message: `Sipariş üzerinize alındı`,
  });
});

// Sipariş detayı
app.get('/api/orders/:id', authenticateToken, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
  }

  res.json({ success: true, data: order });
});

// Yeni sipariş oluştur
app.post('/api/orders', authenticateToken, (req, res) => {
  const newOrder = {
    id: String(orders.length + 1),
    businessId: req.body.businessId,
    platform: req.body.platform,
    customerName: req.body.customerName,
    phone: req.body.phone,
    address: req.body.address,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    items: req.body.items,
    totalPrice: req.body.totalPrice,
    orderTime: new Date().toISOString(),
    status: 'active',
    orderNumber: `${req.body.platform.substring(0, 2).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    courierId: null,
  };

  orders.push(newOrder);

  res.status(201).json({
    success: true,
    data: newOrder,
    message: 'Sipariş oluşturuldu',
  });
});

// Sipariş güncelle
app.patch('/api/orders/:id', authenticateToken, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Sipariş bulunamadı' });
  }

  const { status, courierId } = req.body;

  if (status) order.status = status;
  if (courierId) order.courierId = courierId;

  if (status === 'completed') {
    order.deliveryTime = new Date().toISOString();
    // Harici platformu bilgilendir (Fire and Forget)
    updateExternalOrder(order, status).catch(err => console.error('External API Error:', err.message));
  }

  res.json({
    success: true,
    data: order,
    message: 'Sipariş güncellendi',
  });
});

// ============= EXTERNAL API INTEGRATIONS =============

async function updateExternalOrder(order, status) {
  // Sadece 'completed' (Teslim Edildi) durumunda bildirim gönder
  if (status !== 'completed') return;

  console.log(`[EXTERNAL API] ${order.platform} için sipariş güncelleniyor: ${order.orderNumber}`);

  switch (order.platform) {
    case 'Trendyol Yemek':
      await notifyTrendyol(order, status);
      break;
    case 'Yemeksepeti':
      await notifyYemeksepeti(order, status);
      break;
    case 'Getir Yemek':
      await notifyGetir(order, status);
      break;
    default:
      console.log(`[EXTERNAL API] Bilinmeyen platform: ${order.platform}`);
  }
}

// Trendyol API Entegrasyonu (Taslak)
async function notifyTrendyol(order, status) {
  // NOT: Gerçek API çağrısı için 'axios' veya 'node-fetch' gerekir.
  // Burada simüle ediyoruz.
  const apiKey = process.env.TRENDYOL_API_KEY;
  const supplierId = process.env.TRENDYOL_SUPPLIER_ID;

  if (!apiKey || !supplierId) {
    console.log('[TRENDYOL] API anahtarları eksik. İstek atılmadı.');
    return;
  }

  console.log(`[TRENDYOL] PUT /suppliers/${supplierId}/shipment-packages/${order.id}/status -> DELIVERED`);
  // Gerçek istek kodu buraya gelecek:
  // await axios.put(...)
}

// Yemeksepeti API Entegrasyonu (Taslak)
async function notifyYemeksepeti(order, status) {
  const apiKey = process.env.YEMEKSEPETI_API_KEY;

  if (!apiKey) {
    console.log('[YEMEKSEPETI] API anahtarı eksik. İstek atılmadı.');
    return;
  }

  console.log(`[YEMEKSEPETI] Updating order ${order.orderNumber} status to DELIVERED`);
}

// Getir API Entegrasyonu (Taslak)
async function notifyGetir(order, status) {
  const apiKey = process.env.GETIR_API_KEY;

  if (!apiKey) {
    console.log('[GETIR] API anahtarı eksik. İstek atılmadı.');
    return;
  }

  console.log(`[GETIR] Updating order ${order.orderNumber} status to DELIVERED`);
}

// ============= STATS ROUTES =============

// Kurye istatistikleri
app.get('/api/couriers/:id/stats', authenticateToken, (req, res) => {
  const courier = couriers.find(c => c.id === req.params.id);

  if (!courier) {
    return res.status(404).json({ success: false, message: 'Kurye bulunamadı' });
  }

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o =>
    o.courierId === req.params.id &&
    o.status === 'completed' &&
    new Date(o.deliveryTime).toDateString() === today
  );

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekOrders = orders.filter(o =>
    o.courierId === req.params.id &&
    o.status === 'completed' &&
    new Date(o.deliveryTime) >= weekStart
  );

  const deliveryTimes = weekOrders.map(o => {
    const orderTime = new Date(o.orderTime);
    const deliveryTime = new Date(o.deliveryTime);
    return (deliveryTime - orderTime) / 60000;
  });

  const avgTime = deliveryTimes.length > 0
    ? Math.round(deliveryTimes.reduce((a, b) => a + b, 0) / deliveryTimes.length)
    : 0;

  res.json({
    success: true,
    data: {
      today: todayOrders.length,
      thisWeek: weekOrders.length,
      avgTime: `${avgTime} dk`,
    },
  });
});

// İşletme istatistikleri
app.get('/api/businesses/:id/stats', authenticateToken, (req, res) => {
  const businessOrders = orders.filter(o => o.businessId === req.params.id);

  const today = new Date().toDateString();
  const todayOrders = businessOrders.filter(o =>
    new Date(o.orderTime).toDateString() === today
  );

  const activeOrders = businessOrders.filter(o => o.status === 'active');
  const completedOrders = businessOrders.filter(o => o.status === 'completed');

  res.json({
    success: true,
    data: {
      todayOrders: todayOrders.length,
      activeOrders: activeOrders.length,
      completedOrders: completedOrders.length,
      totalOrders: businessOrders.length,
    },
  });
});

// ============= WEBHOOK ENDPOINTS =============

// Trendyol Yemek webhook
app.post('/api/webhooks/trendyol/:businessCode', (req, res) => {
  const business = businesses.find(b => b.code === req.params.businessCode);

  if (!business) {
    return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
  }

  const order = {
    id: String(orders.length + 1),
    businessId: business.id,
    platform: 'Trendyol Yemek',
    orderNumber: req.body.orderNumber || `TY-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: req.body.customer?.name || 'Müşteri',
    phone: req.body.customer?.phone || '',
    address: req.body.delivery?.address || '',
    latitude: req.body.delivery?.latitude || 0,
    longitude: req.body.delivery?.longitude || 0,
    items: req.body.items?.map(i => i.name) || [],
    totalPrice: `${req.body.totalPrice || 0} TL`,
    orderTime: new Date().toISOString(),
    status: 'active',
    courierId: null,
  };

  orders.push(order);

  res.json({ success: true, data: order });
});

// Yemeksepeti webhook
app.post('/api/webhooks/yemeksepeti/:businessCode', (req, res) => {
  const business = businesses.find(b => b.code === req.params.businessCode);

  if (!business) {
    return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
  }

  const order = {
    id: String(orders.length + 1),
    businessId: business.id,
    platform: 'Yemeksepeti',
    orderNumber: req.body.id || `YS-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: req.body.customerName || 'Müşteri',
    phone: req.body.phoneNumber || '',
    address: req.body.deliveryAddress || '',
    latitude: req.body.coords?.lat || 0,
    longitude: req.body.coords?.lng || 0,
    items: req.body.products?.map(p => p.title) || [],
    totalPrice: `${req.body.amount || 0} TL`,
    orderTime: new Date().toISOString(),
    status: 'active',
    courierId: null,
  };

  orders.push(order);

  res.json({ success: true, data: order });
});

// Getir Yemek webhook
app.post('/api/webhooks/getir/:businessCode', (req, res) => {
  const business = businesses.find(b => b.code === req.params.businessCode);

  if (!business) {
    return res.status(404).json({ success: false, message: 'İşletme bulunamadı' });
  }

  const order = {
    id: String(orders.length + 1),
    businessId: business.id,
    platform: 'Getir Yemek',
    orderNumber: req.body.orderId || `GY-${Math.floor(1000 + Math.random() * 9000)}`,
    customerName: req.body.user?.name || 'Müşteri',
    phone: req.body.user?.phone || '',
    address: req.body.address?.text || '',
    latitude: req.body.address?.location?.latitude || 0,
    longitude: req.body.address?.location?.longitude || 0,
    items: req.body.cart?.items?.map(i => i.name) || [],
    totalPrice: `${req.body.payment?.total || 0} TL`,
    orderTime: new Date().toISOString(),
    status: 'active',
    courierId: null,
  };

  orders.push(order);

  res.json({ success: true, data: order });
});

// ============= HEALTH CHECK =============

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    businesses: businesses.length,
    couriers: couriers.length,
    orders: orders.length,
  });
});

// ============= START SERVER =============

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 KURYE UYGULAMASI - BACKEND SERVER                    ║
║                                                            ║
║   Server Adresi: http://localhost:${PORT}                     ║
║   Sağlık Kontrolü: http://localhost:${PORT}/health           ║
║                                                            ║
║   📊 Demo Hesaplar:                                        ║
║   ├─ Admin: admin / admin123                              ║
║   ├─ İşletme Kodu: DEMO123                                ║
║   ├─ Kurye: kurye1 / 1234                                 ║
║   └─ Kurye Şefi: sef1 / 1234                              ║
║                                                            ║
║   📦 Örnek Siparişler: 3 adet (TY, YS, GY)               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
