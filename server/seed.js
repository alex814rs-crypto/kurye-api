require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Business = require('./models/Business');
const Courier = require('./models/Courier');
const Order = require('./models/Order');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI;

async function seed() {
    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI ortam değişkeni tanımlı değil!');
        process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB bağlantısı başarılı');

    // Mevcut verileri temizle
    await Business.deleteMany({});
    await Courier.deleteMany({});
    await Order.deleteMany({});
    await Admin.deleteMany({});
    console.log('🗑️  Eski veriler temizlendi');

    // İşletme
    const business = await Business.create({
        code: 'DEMO123',
        name: 'Demo Restoran',
        owner: 'Ahmet Yılmaz',
        email: 'demo@restoran.com',
        phone: '+905551234567',
        address: 'Gebze, Kocaeli',
    });
    console.log('🏪 İşletme oluşturuldu:', business.name);

    // Kuryeler
    const kurye = await Courier.create({
        businessId: business._id,
        username: 'kurye1',
        password: bcrypt.hashSync('1234', 10),
        name: 'Mehmet Kurye',
        phone: '+905559999999',
        role: 'courier',
    });

    const sef = await Courier.create({
        businessId: business._id,
        username: 'sef1',
        password: bcrypt.hashSync('1234', 10),
        name: 'Ali Şef',
        phone: '+905558888888',
        role: 'chief',
    });
    console.log('🏍️  Kuryeler oluşturuldu:', kurye.name, ',', sef.name);

    // Admin
    await Admin.create({
        username: 'admin',
        password: bcrypt.hashSync('admin123', 10),
        role: 'admin',
    });
    console.log('👤 Admin oluşturuldu');

    // Siparişler
    await Order.create([
        {
            businessId: business._id,
            platform: 'Trendyol Yemek',
            customerName: 'Ayşe Demir',
            phone: '+905551234567',
            address: 'Cumhuriyet Mah. Atatürk Cad. No: 45/3 Gebze/Kocaeli',
            latitude: 40.8027,
            longitude: 29.4308,
            items: ['Adana Dürüm', 'Ayran', 'Patates Kızartması'],
            totalPrice: '125.50 TL',
            orderNumber: 'TY-8472',
            courierId: kurye._id,
        },
        {
            businessId: business._id,
            platform: 'Yemeksepeti',
            customerName: 'Fatma Yıldız',
            phone: '+905552345678',
            address: 'Osman Yılmaz Mah. İnönü Cad. No: 12/A Gebze/Kocaeli',
            latitude: 40.7988,
            longitude: 29.4365,
            items: ['Karışık Pizza', 'Kola', 'Tiramisu'],
            totalPrice: '189.00 TL',
            orderNumber: 'YS-3291',
            courierId: kurye._id,
        },
        {
            businessId: business._id,
            platform: 'Getir Yemek',
            customerName: 'Emre Kaya',
            phone: '+905553456789',
            address: 'Sultan Orhan Mah. Gebze Cad. No: 88 Gebze/Kocaeli',
            latitude: 40.8055,
            longitude: 29.4272,
            items: ['Tavuk Döner', 'Mercimek Çorbası', 'Baklava'],
            totalPrice: '155.75 TL',
            orderNumber: 'GY-7154',
            courierId: sef._id,
        },
        {
            businessId: business._id,
            platform: 'Yemeksepeti',
            customerName: 'Zeynep Arslan',
            phone: '+905554567890',
            address: 'Güzeller Mah. İstanbul Cad. No: 22 Gebze/Kocaeli',
            latitude: 40.8012,
            longitude: 29.4410,
            items: ['Lahmacun x2', 'Ayran', 'Künefe'],
            totalPrice: '142.00 TL',
            orderNumber: 'YS-5823',
            courierId: null,
        },
    ]);
    console.log('📦 4 adet sipariş oluşturuldu');

    console.log('\n✅ Seed tamamlandı!');
    console.log('Demo giriş bilgileri:');
    console.log('  Admin: admin / admin123');
    console.log('  İşletme Kodu: DEMO123');
    console.log('  Kurye: kurye1 / 1234');
    console.log('  Kurye Şefi: sef1 / 1234');

    await mongoose.disconnect();
}

seed().catch(err => {
    console.error('Seed hatası:', err);
    process.exit(1);
});
