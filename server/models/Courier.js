const mongoose = require('mongoose');

const courierSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    role: { type: String, enum: ['courier', 'chief', 'manager'], default: 'courier' },
    isActive: { type: Boolean, default: true },
    latitude: { type: Number, default: 0 },
    longitude: { type: Number, default: 0 },
    lastUpdate: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Courier', courierSchema);
