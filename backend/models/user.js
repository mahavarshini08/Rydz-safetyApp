// backend/models/user.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  pushToken: String,
  emergencyContacts: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
