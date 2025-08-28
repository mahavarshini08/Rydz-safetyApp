// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");

// --- Register / Signup
router.post("/register", async (req, res) => {
  try {
    const { name, phone, emergencyContacts } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    const existing = await User.findOne({ phone });
    if (existing) return res.status(400).json({ error: "User already exists" });

    const user = new User({ name, phone, emergencyContacts: emergencyContacts || [] });
    await user.save();

    res.json({ message: "User registered", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Login
router.post("/login", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
