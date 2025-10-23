//src/model/user.js

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false, default: null },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, default: null, index: true },
    avatarUrl: { type: String, default: null },
    phone: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    gender: { type: String, default: null },
    role: { type: String, enum: ['user', 'admin', 'moderator'], default: 'user' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },

}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
