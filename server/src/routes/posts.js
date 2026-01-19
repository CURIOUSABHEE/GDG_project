const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const auth = require('../middleware/auth');

// Get posts (with optional directory filter)
router.get('/', auth, async (req, res) => {
    try {
        const { directoryId } = req.query;
        const query = { user: req.user.userId };

        if (directoryId) {
            if (directoryId === 'uncategorized') {
                query.directory = null;
            } else {
                query.directory = directoryId;
            }
        }

        const posts = await Post.find(query)
            .sort({ savedAt: -1 })
            .populate('directory', 'name');

        res.json(posts);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Save new post
router.post('/', auth, async (req, res) => {
    try {
        const { originalUrl, platform, content, authorName, authorHandle, imageUrl, directoryId } = req.body;

        const post = new Post({
            user: req.user.userId,
            originalUrl,
            platform,
            content,
            authorName,
            authorHandle,
            imageUrl,
            directory: directoryId || null
        });

        await post.save();
        res.json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Move post to directory (PATCH)
router.patch('/:id', auth, async (req, res) => {
    try {
        const { directory } = req.body;
        const post = await Post.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { directory: directory || null },
            { new: true }
        );
        res.json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Move post to directory (PUT - alias for PATCH)
router.put('/:id', auth, async (req, res) => {
    try {
        const { directory } = req.body;
        const post = await Post.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { directory: directory || null },
            { new: true }
        );
        res.json(post);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
    try {
        await Post.findOneAndDelete({ _id: req.params.id, user: req.user.userId });
        res.json({ message: 'Post deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
