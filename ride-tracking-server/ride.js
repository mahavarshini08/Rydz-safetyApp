const mongoose = require("mongoose");

const RideSchema = new mongoose.Schema({
  userId: String,
  startTime: Date,
  endTime: Date,
  route: [
    { latitude: Number, longitude: Number, timestamp: Date }
  ]
});

module.exports = mongoose.model("Ride", RideSchema);
