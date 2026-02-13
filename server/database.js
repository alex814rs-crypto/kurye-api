const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('❌ MONGODB_URI ortam değişkeni tanımlı değil!');
        throw new Error('MONGODB_URI eksik');
    }

    try {
        await mongoose.connect(uri);
        console.log('✅ MongoDB bağlantısı başarılı');
    } catch (err) {
        console.error('❌ MongoDB bağlantı hatası:', err.message);
        throw err;
    }
};

module.exports = connectDB;
