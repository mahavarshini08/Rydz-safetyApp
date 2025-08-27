const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  phone: String,
  pushToken: String,
  emergencyContacts: [
    { name: String, phone: String, pushToken: String }
  ]
});

module.exports = mongoose.model("User", UserSchema);
