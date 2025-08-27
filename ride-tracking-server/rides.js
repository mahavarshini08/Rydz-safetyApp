// routes/rides.js
const express = require("express");
const router = express.Router();
const Ride = require("../models/Ride");

// --- Start Ride
router.post("/start", async (req, res) => {
  try {
    const { userId, geofenceOrigin } = req.body;
    if (!userId || !geofenceOrigin) {
      return res.status(400).json({ error: "userId and geofenceOrigin required" });
    }

    const ride = new Ride({ userId, geofenceOrigin, route: [] });
    await ride.save();

    res.json({ message: "Ride started", rideId: ride._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- End Ride
router.post("/end", async (req, res) => {
  try {
    const { rideId, route } = req.body;
    if (!rideId) return res.status(400).json({ error: "rideId required" });

    const ride = await Ride.findById(rideId);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    ride.endTime = new Date();
    if (route && route.length) ride.route = route;
    await ride.save();

    res.json({ message: "Ride ended", ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Ride History (optional)
router.get("/history/:userId", async (req, res) => {
  try {
    const rides = await Ride.find({ userId: req.params.userId }).sort({ startTime: -1 });
    res.json(rides);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
