const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const rpID = process.env.RP_ID || 'localhost';
const origin = (process.env.ORIGIN || 'http://localhost:5173').replace(/\/$/, '');

// --- Registration ---

router.post('/register/options', async (req, res) => {
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        // Check if user already exists (for simplicity, we assume new user or adding credential)
        // In a real app, you might want separate flows.
        let user = await User.findOne({ username });

        if (!user) {
            user = new User({ username, authenticators: [] });
            await user.save();
        }

        const options = await generateRegistrationOptions({
            rpName: process.env.RP_NAME || 'Linko',
            rpID,
            userID: new TextEncoder().encode(user._id.toString()),
            userName: user.username,
            // Don't exclude credentials here to allow multiple devices, 
            // but in strict registration you might want to.
            attestationType: 'none',
        });

        // Save challenge to user (db) to verify later
        user.currentChallenge = options.challenge;
        await user.save();

        res.json(options);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/register/verify', async (req, res) => {
    const { username, response } = req.body;
    const user = await User.findOne({ username });

    if (!user || !user.currentChallenge) {
        return res.status(400).json({ error: 'User not found or no challenge waiting' });
    }

    let verification;
    try {
        verification = await verifyRegistrationResponse({
            response,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: req.headers.origin || origin, // Allow dynamic origin for extension
            expectedRPID: rpID,
            requireUserVerification: false, // Fix "User verification required" error
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }

    if (verification.verified && verification.registrationInfo) {
        const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

        const newAuthenticator = {
            credentialID: Buffer.from(credentialID).toString('base64'), // Save as base64 string
            credentialPublicKey: Buffer.from(credentialPublicKey), // Convert to Buffer
            counter,
            credentialDeviceType: verification.registrationInfo.credentialDeviceType,
            credentialBackedUp: verification.registrationInfo.credentialBackedUp,
            transports: response.response.transports,
        };

        user.authenticators.push(newAuthenticator);
        user.currentChallenge = undefined; // Clear challenge
        await user.save();

        // Auto-login after registration?
        const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ verified: true, token });
    } else {
        res.status(400).json({ verified: false });
    }
});

// --- Login ---

router.post('/login/options', async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }

        // Check if user has any authenticators
        if (!user.authenticators || user.authenticators.length === 0) {
            return res.status(400).json({ error: 'No authenticators registered for this user. Please create an account first.' });
        }

        // Validate and filter authenticators
        const validCredentials = user.authenticators
            .filter(auth => auth.credentialID && auth.credentialID.length > 0)
            .map(auth => ({
                id: auth.credentialID.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''),
                type: 'public-key',
                transports: auth.transports || [],
            }));

        if (validCredentials.length === 0) {
            return res.status(400).json({ error: 'No valid authenticators found. Please register again.' });
        }

        const options = await generateAuthenticationOptions({
            rpID,
            allowCredentials: validCredentials,
        });

        user.currentChallenge = options.challenge;
        await user.save();

        res.json(options);
    } catch (error) {
        console.error('Login options error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate login options' });
    }
});

router.post('/login/verify', async (req, res) => {
    const { username, response } = req.body;
    const user = await User.findOne({ username });

    if (!user || !user.currentChallenge) {
        return res.status(400).json({ error: 'User not found or no challenge' });
    }

    // Find the authenticator used
    const authenticator = user.authenticators.find(auth => {
        const currentBase64URL = auth.credentialID.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        return currentBase64URL === response.id;
    });

    // Note: response.id comes from client as base64url usually.
    // We stored as base64. Let's rely on the library verification first.

    // Actually we need to pass the *stored* authenticator to verifyAuthenticationResponse
    // But we don't know which one validly until we try? 
    // Wait, verifyAuthenticationResponse takes 'authenticator' as arg.
    // So we need to find it by ID.

    const bodyCredID = response.id; // base64url

    // Convert our stored base64 to base64url to compare, or vice versa.
    // Simplest is to find by matching ID. 
    // Let's assume standard base64 from our storage vs base64url from client.
    // For safety, let's try to match loosely or convert.

    const foundAuth = user.authenticators.find(auth => {
        const currentBase64URL = auth.credentialID.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        return currentBase64URL === bodyCredID;
    });

    if (!foundAuth) {
        return res.status(400).json({ error: 'Authenticator not found' });
    }

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
            response,
            expectedChallenge: user.currentChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                ...foundAuth.toObject(),
                credentialID: Buffer.from(foundAuth.credentialID, 'base64'), // Convert back to Buffer
                credentialPublicKey: foundAuth.credentialPublicKey, // Buffer
            },
            requireUserVerification: false, // Fix "User verification required" error
        });
    } catch (error) {
        console.error(error);
        return res.status(400).json({ error: error.message });
    }

    if (verification.verified) {
        const { authenticationInfo } = verification;

        // Update counter
        foundAuth.counter = authenticationInfo.newCounter;
        user.currentChallenge = undefined;
        await user.save();

        const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ verified: true, token });
    } else {
        res.status(400).json({ verified: false });
    }
});

// --- Password Auth ---
const bcrypt = require('bcryptjs');

router.post('/register/password', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        let user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({ username, password: hashedPassword });
        await user.save();

        const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

router.post('/login/password', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    try {
        const user = await User.findOne({ username }).select('+password');
        if (!user || !user.password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
});

module.exports = router;
