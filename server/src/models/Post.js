const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    directory: { type: mongoose.Schema.Types.ObjectId, ref: 'Directory', required: false }, // Can be in 'Uncategorized' (null)

    originalUrl: { type: String, required: true },
    platform: { type: String, enum: ['linkedin', 'twitter', 'instagram', 'youtube', 'other'], default: 'other' },

    content: { type: String },
    authorName: { type: String },
    authorHandle: { type: String },
    imageUrl: { type: String }, // For media

    savedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Post', postSchema);
