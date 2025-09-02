// Firebase configuration for backend
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
let serviceAccount;
let adminApp;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Validate service account
    if (serviceAccount && serviceAccount.private_key && serviceAccount.client_email) {
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin initialized with service account');
    } else {
      throw new Error('Invalid service account format');
    }
  } else {
    throw new Error('No service account provided');
  }
} catch (error) {
  console.log('⚠️ Firebase Admin initialization failed:', error.message);
  console.log('⚠️ Firebase features will be limited');
  
  // Try to initialize without credentials (for basic functionality)
  try {
    adminApp = admin.initializeApp();
    console.log('✅ Firebase Admin initialized (limited mode)');
  } catch (initError) {
    console.log('⚠️ Firebase Admin already initialized or error:', initError.message);
  }
}

// Get Firestore instance (with error handling)
let db;
try {
  db = admin.firestore();
} catch (error) {
  console.log('⚠️ Firestore not available:', error.message);
  db = null;
}

// Get Auth instance (with error handling)
let auth;
try {
  auth = admin.auth();
} catch (error) {
  console.log('⚠️ Auth not available:', error.message);
  auth = null;
}

module.exports = { admin, db, auth };
