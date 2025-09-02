const express = require("express");
const { admin, db } = require("../firebase-config");

const router = express.Router();

// 🔧 Helper: format Firestore user object
function formatUser(user) {
  const createdAt =
    user.createdAt && user.createdAt.toDate
      ? user.createdAt.toDate().toISOString()
      : user.createdAt;

  const updatedAt =
    user.updatedAt && user.updatedAt.toDate
      ? user.updatedAt.toDate().toISOString()
      : user.updatedAt;

  return {
    ...user,
    createdAt,
    updatedAt,
  };
}

/**
 * Signup (register user in Firebase Auth + Firestore)
 * ⚠️ Best practice: signup should usually be done client-side with Firebase SDK.
 */
router.post("/signup", async (req, res) => {
  const { name, phone, pushToken, email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // 1. Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name || "",
      phoneNumber: phone || undefined,
    });

    // 2. Store extra data in Firestore
    const userData = {
      id: userRecord.uid,
      name: name || "",
      phone: phone || "",
      email,
      pushToken: pushToken || null,
      createdAt: admin.firestore.Timestamp.now(),
    };

    await db.collection("users").doc(userRecord.uid).set(userData);

    // ✅ Return formatted data + custom token
    const idToken = await admin.auth().createCustomToken(userRecord.uid);

    res.json({ user: formatUser(userData), token: idToken });
  } catch (err) {
    console.error("❌ Signup failed:", err);
    res.status(500).json({ error: "Signup failed", details: err.message });
  }
});

/**
 * Login
 * 👉 Client logs in with Firebase SDK → sends ID token here for verification
 */
router.post("/login", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ error: "ID token required" });
  }

  try {
    // Verify token from Firebase
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    // Fetch user from Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found in Firestore" });
    }

    res.json({ user: formatUser(userDoc.data()), token: idToken });
  } catch (err) {
    console.error("❌ Login failed:", err);
    res.status(401).json({ error: "Invalid or expired token", details: err.message });
  }
});

/**
 * Get profile of logged-in user
 */
router.get("/me", async (req, res) => {
  const { uid } = req.user; // From middleware

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: formatUser(userDoc.data()) });
  } catch (err) {
    console.error("❌ Profile fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

/**
 * Update user profile
 */
router.put("/me", async (req, res) => {
  const { uid } = req.user;
  const { name, phone, pushToken } = req.body;

  try {
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (pushToken !== undefined) updateData.pushToken = pushToken;
    updateData.updatedAt = admin.firestore.Timestamp.now();

    await db.collection("users").doc(uid).update(updateData);

    // Fetch updated user
    const userDoc = await db.collection("users").doc(uid).get();
    res.json({ user: formatUser(userDoc.data()) });
  } catch (err) {
    console.error("❌ Profile update failed:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
