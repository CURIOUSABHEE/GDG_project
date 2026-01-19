const mongoose = require('mongoose');

const directorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

// Compound index to ensure unique directory names per user
directorySchema.index({ name: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Directory', directorySchema);
