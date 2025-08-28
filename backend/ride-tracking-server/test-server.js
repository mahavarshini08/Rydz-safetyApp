// Test script to verify server setup
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

console.log("🔍 Testing server setup...");
console.log("Environment variables:");
console.log("MONGO_URI:", process.env.MONGO_URI || "NOT SET");
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "SET" : "NOT SET");
console.log("PORT:", process.env.PORT || "NOT SET (will use 4000)");

// Test basic imports
try {
  const User = require("../models/user");
  const Ride = require("../models/Ride");
  const authRoutes = require("../routes/auth");
  const rideRoutes = require("../routes/rides");
  console.log("✅ All imports successful");
} catch (err) {
  console.error("❌ Import error:", err.message);
}

// Test MongoDB connection
mongoose
  .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rydz", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB connection test successful");
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection test failed:", err.message);
  });

console.log("�� Test completed");
