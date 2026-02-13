const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
    platform: { type: String, required: true },
    orderNumber: { type: String, required: true },
    customerName: { type: String, required: true },
    phone: String,
    address: String,
    latitude: Number,
    longitude: Number,
    items: [String],
    totalPrice: String,
    orderTime: { type: Date, default: Date.now },
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    courierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Courier', default: null },
    courierName: String,
    claimedAt: Date,
    deliveryTime: Date,
    rating: { type: Number, min: 1, max: 5, default: null },
    ratingComment: { type: String, default: null },
    deliveryPhoto: { type: String, default: null }, // base64 veya URL
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
