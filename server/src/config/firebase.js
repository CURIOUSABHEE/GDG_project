const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// You need to download your service account key from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
// Save it as 'serviceAccountKey.json' in the server root folder

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // For production (e.g., Render) - use environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // For local development - use file
  try {
    serviceAccount = require("../../serviceAccountKey.json");
  } catch (error) {
    console.error("Firebase service account key not found!");
    console.error(
      "Please download it from Firebase Console and save as server/serviceAccountKey.json",
    );
    console.error(
      "Or set FIREBASE_SERVICE_ACCOUNT environment variable with the JSON content",
    );
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { admin, db };
