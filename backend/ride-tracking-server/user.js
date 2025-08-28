// backend/ride-tracking-server/models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  pushToken: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
