const { db } = require("../../config/firebase");

const postsCollection = db.collection("posts");

class Post {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // For compatibility
    this.user = data.user;
    this.directory = data.directory || null;
    this.originalUrl = data.originalUrl;
    this.platform = data.platform || "other";
    this.content = data.content || null;
    this.authorName = data.authorName || null;
    this.authorHandle = data.authorHandle || null;
    this.imageUrl = data.imageUrl || null;
    this.savedAt = data.savedAt || new Date();
  }

  static async find(query) {
    let queryRef = postsCollection;

    // Always filter by user first
    if (query.user) {
      queryRef = queryRef.where("user", "==", query.user);
    }

    // Handle directory filter
    if (query.directory !== undefined) {
      if (query.directory === null) {
        // For uncategorized posts, filter where directory is null
        queryRef = queryRef.where("directory", "==", null);
      } else {
        queryRef = queryRef.where("directory", "==", query.directory);
      }
    }

    // Order by savedAt descending
    queryRef = queryRef.orderBy("savedAt", "desc");

    try {
      const snapshot = await queryRef.get();
      return snapshot.docs.map(
        (doc) => new Post({ id: doc.id, ...doc.data() }),
      );
    } catch (error) {
      // If index error, fall back to fetching all and filtering in memory
      if (error.code === 9 || error.message.includes("index")) {
        console.warn(
          "Firestore index missing, falling back to in-memory filter:",
          error.message,
        );

        // Fetch all posts for user without directory filter
        let fallbackRef = postsCollection.where("user", "==", query.user);
        const snapshot = await fallbackRef.get();

        let posts = snapshot.docs.map(
          (doc) => new Post({ id: doc.id, ...doc.data() }),
        );

        // Filter by directory in memory
        if (query.directory !== undefined) {
          if (query.directory === null) {
            posts = posts.filter(
              (p) => p.directory === null || p.directory === undefined,
            );
          } else {
            posts = posts.filter((p) => p.directory === query.directory);
          }
        }

        // Sort by savedAt descending
        posts.sort((a, b) => {
          const dateA =
            a.savedAt instanceof Date ? a.savedAt : new Date(a.savedAt);
          const dateB =
            b.savedAt instanceof Date ? b.savedAt : new Date(b.savedAt);
          return dateB - dateA;
        });

        return posts;
      }
      throw error;
    }
  }

  static async findOne(query) {
    if (query._id || query.id) {
      const docId = query._id || query.id;
      const doc = await postsCollection.doc(docId).get();

      if (doc.exists) {
        const data = doc.data();
        // Check user ownership if specified
        if (query.user && data.user !== query.user) {
          return null;
        }
        return new Post({ id: doc.id, ...data });
      }
      return null;
    }

    // Query by other fields
    let queryRef = postsCollection;

    if (query.user) {
      queryRef = queryRef.where("user", "==", query.user);
    }

    const snapshot = await queryRef.limit(1).get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return new Post({ id: doc.id, ...doc.data() });
    }

    return null;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const post = await this.findOne(query);
    if (!post) return null;

    const updateData = {};
    if (update.directory !== undefined) {
      updateData.directory = update.directory;
    }
    if (update.$set) {
      Object.assign(updateData, update.$set);
    }

    await postsCollection.doc(post.id).update(updateData);

    if (options.new) {
      return await this.findOne({ _id: post.id });
    }
    return post;
  }

  static async findOneAndDelete(query) {
    const post = await this.findOne(query);
    if (post) {
      await postsCollection.doc(post.id).delete();
      return post;
    }
    return null;
  }

  static async create(data) {
    const docRef = await postsCollection.add({
      user: data.user,
      directory: data.directory || null,
      originalUrl: data.originalUrl,
      platform: data.platform || "other",
      content: data.content || null,
      authorName: data.authorName || null,
      authorHandle: data.authorHandle || null,
      imageUrl: data.imageUrl || null,
      savedAt: new Date(),
    });

    const doc = await docRef.get();
    return new Post({ id: doc.id, ...doc.data() });
  }

  async save() {
    const data = {
      user: this.user,
      directory: this.directory,
      originalUrl: this.originalUrl,
      platform: this.platform,
      content: this.content,
      authorName: this.authorName,
      authorHandle: this.authorHandle,
      imageUrl: this.imageUrl,
    };

    if (this.id) {
      await postsCollection.doc(this.id).update(data);
    } else {
      const docRef = await postsCollection.add({
        ...data,
        savedAt: new Date(),
      });
      this.id = docRef.id;
      this._id = docRef.id;
    }

    return this;
  }

  // Simulate populate for directory
  async populate(field) {
    if (field === "directory" && this.directory) {
      const { db } = require("../../config/firebase");
      const dirDoc = await db
        .collection("directories")
        .doc(this.directory)
        .get();
      if (dirDoc.exists) {
        this.directory = { _id: dirDoc.id, ...dirDoc.data() };
      }
    }
    return this;
  }
}

// Helper to populate directories for an array of posts
Post.populateDirectories = async (posts) => {
  const { db } = require("../../config/firebase");

  // Get unique directory IDs
  const dirIds = [
    ...new Set(posts.filter((p) => p.directory).map((p) => p.directory)),
  ];

  if (dirIds.length === 0) return posts;

  // Fetch all directories in parallel (much faster!)
  const dirMap = {};
  const dirPromises = dirIds.map(async (dirId) => {
    const dirDoc = await db.collection("directories").doc(dirId).get();
    if (dirDoc.exists) {
      dirMap[dirId] = { _id: dirDoc.id, name: dirDoc.data().name };
    }
  });

  await Promise.all(dirPromises);

  // Populate posts
  return posts.map((post) => {
    if (post.directory && dirMap[post.directory]) {
      post.directory = dirMap[post.directory];
    }
    return post;
  });
};

module.exports = Post;
