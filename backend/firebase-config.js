// Firebase configuration
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable not found');
  }
} catch (error) {
  console.error('❌ Firebase service account not found. Please add FIREBASE_SERVICE_ACCOUNT to your .env file.');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Get Firestore instance
const db = admin.firestore();

// Get Auth instance
const auth = admin.auth();

module.exports = { admin, db, auth };
