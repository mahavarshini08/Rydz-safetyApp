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

// --- Update Ride (add new location point)
router.post("/:id/update", async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "latitude and longitude required" });
    }

    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    ride.route.push({ latitude, longitude });
    await ride.save();

    res.json({ message: "Point added", ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- End Ride
router.post("/:id/end", async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    ride.endTime = new Date();
    await ride.save();

    res.json({ message: "Ride ended", ride });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// --- Get Ride Details
router.get("/:id", async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate("userId", "name phone");
    if (!ride) return res.status(404).json({ error: "Ride not found" });

    res.json(ride);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Emergency alert route
router.post("/emergency", async (req, res) => {
  try {
    const { rideId, currentLocation, destination, emergencyContact, deviation } = req.body;
    const { userId } = req.user;

    if (!rideId || !currentLocation || !emergencyContact) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Log the emergency alert
    console.log("🚨 EMERGENCY ALERT:", {
      rideId,
      userId,
      currentLocation,
      destination,
      emergencyContact,
      deviation,
      timestamp: new Date().toISOString()
    });

    // TODO: Implement actual emergency notification system
    // This could include:
    // - SMS to emergency contacts
    // - Push notifications
    // - Email alerts
    // - Integration with emergency services

    // For now, just log and acknowledge
    res.json({ 
      message: "Emergency alert received and logged",
      alertId: `alert-${Date.now()}`,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error("Emergency alert error:", err);
    res.status(500).json({ error: "Failed to process emergency alert" });
  }
});

module.exports = router;
