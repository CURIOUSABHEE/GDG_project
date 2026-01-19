const express = require('express');
const router = express.Router();
const Directory = require('../models/Directory');
const auth = require('../middleware/auth');

// Get all directories for user
router.get('/', auth, async (req, res) => {
    try {
        const directories = await Directory.find({ user: req.user.userId }).sort({ createdAt: -1 });
        res.json(directories);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create new directory
router.post('/', auth, async (req, res) => {
    try {
        const { name } = req.body;
        const directory = new Directory({ name, user: req.user.userId });
        await directory.save();
        res.json(directory);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete directory
router.delete('/:id', auth, async (req, res) => {
    try {
        // TODO: handle posts in this directory (move to uncategorized? or delete?)
        // For now just delete directory
        await Directory.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
        res.json({ message: 'Directory deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
