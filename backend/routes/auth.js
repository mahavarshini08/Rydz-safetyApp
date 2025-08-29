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

    const existing = await User.findByPhone(phone);
    if (existing) return res.status(400).json({ error: "User already exists" });

    const user = await User.create({ name, phone, emergencyContacts: emergencyContacts || [] });

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

    const user = await User.findByPhone(phone);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, phone: user.phone }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });

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
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (emergencyContacts) updateData.emergencyContacts = emergencyContacts;
    if (pushToken) updateData.pushToken = pushToken;

    await User.update(userId, updateData);

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

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
