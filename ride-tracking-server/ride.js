// models/Ride.js
const mongoose = require("mongoose");

const PointSchema = new mongoose.Schema({
  latitude: Number,
  longitude: Number,
  timestamp: { type: Date, default: Date.now },
});

const RideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  geofenceOrigin: PointSchema,
  route: [PointSchema],
});

module.exports = mongoose.model("Ride", RideSchema);
