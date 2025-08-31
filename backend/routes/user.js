const express = require("express");
const router = express.Router();
const admin = require("../utils/firebaseAdmin"); // ✅ use central init

const db = admin.firestore();

// Example: create a user profile
router.post("/register", async (req, res) => {
  const { uid, name, email } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: "uid and email required" });
  }

  try {
    await db.collection("users").doc(uid).set({
      name,
      email,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true, message: "User registered!" });
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).json({ error: "Failed to register user" });
  }
});

module.exports = router;
