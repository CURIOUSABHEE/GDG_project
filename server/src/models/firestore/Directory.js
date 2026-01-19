const { db } = require("../../config/firebase");

const directoriesCollection = db.collection("directories");

class Directory {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // For compatibility
    this.name = data.name;
    this.user = data.user;
    this.createdAt = data.createdAt || new Date();
  }

  static async find(query) {
    let queryRef = directoriesCollection;

    if (query.user) {
      queryRef = queryRef.where("user", "==", query.user);
    }

    const snapshot = await queryRef.orderBy("createdAt", "desc").get();

    return snapshot.docs.map(
      (doc) => new Directory({ id: doc.id, ...doc.data() }),
    );
  }

  static async findOne(query) {
    if (query._id || query.id) {
      const docId = query._id || query.id;
      const doc = await directoriesCollection.doc(docId).get();

      if (doc.exists) {
        const data = doc.data();
        // Check user ownership if specified
        if (query.user && data.user !== query.user) {
          return null;
        }
        return new Directory({ id: doc.id, ...data });
      }
      return null;
    }

    // Query by other fields
    let queryRef = directoriesCollection;

    if (query.user) {
      queryRef = queryRef.where("user", "==", query.user);
    }
    if (query.name) {
      queryRef = queryRef.where("name", "==", query.name);
    }

    const snapshot = await queryRef.limit(1).get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return new Directory({ id: doc.id, ...doc.data() });
    }

    return null;
  }

  static async findOneAndDelete(query) {
    const directory = await this.findOne(query);
    if (directory) {
      await directoriesCollection.doc(directory.id).delete();
      return directory;
    }
    return null;
  }

  static async create(data) {
    // Check for duplicate name per user
    const existing = await this.findOne({ name: data.name, user: data.user });
    if (existing) {
      const error = new Error("Directory with this name already exists");
      error.code = 11000; // Simulate MongoDB duplicate key error
      throw error;
    }

    const docRef = await directoriesCollection.add({
      name: data.name,
      user: data.user,
      createdAt: new Date(),
    });

    const doc = await docRef.get();
    return new Directory({ id: doc.id, ...doc.data() });
  }

  async save() {
    if (this.id) {
      await directoriesCollection.doc(this.id).update({
        name: this.name,
        user: this.user,
      });
    } else {
      // Check for duplicate
      const existing = await Directory.findOne({
        name: this.name,
        user: this.user,
      });
      if (existing) {
        const error = new Error("Directory with this name already exists");
        error.code = 11000;
        throw error;
      }

      const docRef = await directoriesCollection.add({
        name: this.name,
        user: this.user,
        createdAt: new Date(),
      });
      this.id = docRef.id;
      this._id = docRef.id;
    }

    return this;
  }
}

module.exports = Directory;
