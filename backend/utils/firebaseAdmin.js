// utils/firebaseAdmin.js
const admin = require("firebase-admin");

/**
 * Initialize Firebase Admin exactly once.
 * Prefer a service account JSON in env: FIREBASE_SERVICE_ACCOUNT (stringified JSON)
 * or fall back to Application Default Credentials.
 */
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    if (svc.private_key && typeof svc.private_key === "string") {
      svc.private_key = svc.private_key.replace(/\\n/g, "\n");
    }

    admin.initializeApp({
      credential: admin.credential.cert(svc),
    });
  } else {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

module.exports = admin;
