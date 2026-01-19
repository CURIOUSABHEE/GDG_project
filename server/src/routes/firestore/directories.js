const express = require("express");
const router = express.Router();
const Directory = require("../../models/firestore/Directory");
const Post = require("../../models/firestore/Post");
const auth = require("../../middleware/auth");

// Get all directories for user
router.get("/", auth, async (req, res) => {
  try {
    const directories = await Directory.find({ user: req.user.userId });
    res.json(directories);
  } catch (err) {
    console.error("Error fetching directories:", err);
    res.status(500).json({ error: err.message });
  }
});

// Create new directory
router.post("/", auth, async (req, res) => {
  try {
    const { name } = req.body;
    const directory = await Directory.create({ name, user: req.user.userId });
    res.json(directory);
  } catch (err) {
    console.error("Error creating directory:", err);
    if (err.code === 11000 || err.message.includes("already exists")) {
      return res
        .status(400)
        .json({ error: "Directory with this name already exists" });
    }
    res.status(400).json({ error: err.message });
  }
});

// Delete directory
router.delete("/:id", auth, async (req, res) => {
  try {
    // Move posts from this directory to uncategorized
    const posts = await Post.find({
      user: req.user.userId,
      directory: req.params.id,
    });
    for (const post of posts) {
      await Post.findOneAndUpdate({ _id: post.id }, { directory: null });
    }

    await Directory.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    res.json({ message: "Directory deleted" });
  } catch (err) {
    console.error("Error deleting directory:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
