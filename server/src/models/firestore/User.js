const { db } = require("../../config/firebase");

const usersCollection = db.collection("users");

class User {
  constructor(data) {
    this.id = data.id;
    this._id = data.id; // For compatibility with existing code
    this.username = data.username;
    this.email = data.email || null;
    this.password = data.password || null;
    this.authenticators = data.authenticators || [];
    this.currentChallenge = data.currentChallenge || null;
  }

  static async findOne(query) {
    let snapshot;

    if (query.username) {
      snapshot = await usersCollection
        .where("username", "==", query.username)
        .limit(1)
        .get();
    } else if (query._id || query.id) {
      const docId = query._id || query.id;
      const doc = await usersCollection.doc(docId).get();
      if (doc.exists) {
        return new User({ id: doc.id, ...doc.data() });
      }
      return null;
    }

    if (snapshot && !snapshot.empty) {
      const doc = snapshot.docs[0];
      const userData = { id: doc.id, ...doc.data() };

      // Handle select('+password') - in Firestore we include it but normally exclude
      if (query._includePassword) {
        return new User(userData);
      }

      // By default, don't return password (simulating select: false)
      const { password, ...dataWithoutPassword } = userData;
      return new User(dataWithoutPassword);
    }

    return null;
  }

  static async findOneWithPassword(query) {
    query._includePassword = true;
    return this.findOne(query);
  }

  static async create(data) {
    const docRef = await usersCollection.add({
      username: data.username,
      email: data.email || null,
      password: data.password || null,
      authenticators: data.authenticators || [],
      currentChallenge: data.currentChallenge || null,
      createdAt: new Date(),
    });

    const doc = await docRef.get();
    return new User({ id: doc.id, ...doc.data() });
  }

  async save() {
    const data = {
      username: this.username,
      email: this.email,
      password: this.password,
      authenticators: this.authenticators.map((auth) => ({
        credentialID: auth.credentialID,
        credentialPublicKey:
          auth.credentialPublicKey instanceof Buffer
            ? auth.credentialPublicKey.toString("base64")
            : auth.credentialPublicKey,
        counter: auth.counter,
        credentialDeviceType: auth.credentialDeviceType,
        credentialBackedUp: auth.credentialBackedUp,
        transports: auth.transports || [],
      })),
      currentChallenge: this.currentChallenge,
    };

    if (this.id) {
      await usersCollection.doc(this.id).update(data);
    } else {
      const docRef = await usersCollection.add({
        ...data,
        createdAt: new Date(),
      });
      this.id = docRef.id;
      this._id = docRef.id;
    }

    return this;
  }

  // Helper to convert authenticator for verification
  getAuthenticatorForVerification(auth) {
    return {
      ...auth,
      credentialPublicKey:
        typeof auth.credentialPublicKey === "string"
          ? Buffer.from(auth.credentialPublicKey, "base64")
          : auth.credentialPublicKey,
      toObject: () => auth,
    };
  }
}

module.exports = User;
