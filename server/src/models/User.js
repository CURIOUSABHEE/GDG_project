const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: false, unique: true, sparse: true }, 
    password: { type: String, select: false }, // Hashed password, select: false security

    // Passkey Authenticators
    authenticators: [{
        credentialID: { type: String, required: true },
        credentialPublicKey: { type: Buffer, required: true },
        counter: { type: Number, required: true },
        credentialDeviceType: { type: String, required: true },
        credentialBackedUp: { type: Boolean, required: true },
        transports: [{ type: String }],
    }],

    currentChallenge: { type: String }, // Temporary storage for challenge
});

module.exports = mongoose.model('User', userSchema);
