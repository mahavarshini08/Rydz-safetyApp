// routes/auth.js
const express = require("express");
const router = express.Router();
const User = require("../models/user");
const jwt = require("jsonwebtoken");

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

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, phone: user.phone }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

    res.json({ message: "Login successful", user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Update User Profile
router.put("/update", async (req, res) => {
  try {
    const { userId } = req.user; // From JWT middleware
    const { name, phone, emergencyContacts, pushToken } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Update fields if provided
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (emergencyContacts) user.emergencyContacts = emergencyContacts;
    if (pushToken) user.pushToken = pushToken;

    await user.save();

    res.json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get User Profile
router.get("/profile", async (req, res) => {
  try {
    const { userId } = req.user; // From JWT middleware

    const user = await User.findById(userId).select('-__v');
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
