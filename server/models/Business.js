const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    owner: String,
    email: String,
    phone: String,
    address: String,
    isActive: { type: Boolean, default: true },
    apiKeys: {
        trendyol: { apiKey: String, supplierId: String },
        yemeksepeti: { apiKey: String },
        getir: { apiKey: String }
    }
}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);
