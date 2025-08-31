const express = require("express");
const router = express.Router();
const admin = require("../utils/firebaseAdmin"); // ✅ use central init

const db = admin.firestore();

// --------------------
// Start a new ride
// --------------------
router.post("/start", async (req, res) => {
  const { riderId, destination } = req.body;

  if (!riderId || !destination) {
    return res.status(400).json({ error: "riderId and destination required" });
  }

  try {
    const rideDoc = await db.collection("rides").add({
      riderId,
      destination,
      locations: [],
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ ok: true, rideId: rideDoc.id });
  } catch (err) {
    console.error("Error starting ride:", err);
    res.status(500).json({ error: "Failed to start ride" });
  }
});

// --------------------
// Update ride location
// --------------------
router.put("/:rideId/update", async (req, res) => {
  const { rideId } = req.params;
  const { lat, lng, timestamp } = req.body;

  try {
    const rideRef = db.collection("rides").doc(rideId);
    const rideSnap = await rideRef.get();

    if (!rideSnap.exists) {
      return res.status(404).json({ error: "Ride not found" });
    }

    await rideRef.update({
      locations: admin.firestore.FieldValue.arrayUnion({
        lat,
        lng,
        timestamp: timestamp || Date.now(),
      }),
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Error updating ride:", err);
    res.status(500).json({ error: "Failed to update ride" });
  }
});

// --------------------
// Fetch ride details (route + status)
// --------------------
router.get("/:rideId", async (req, res) => {
  const { rideId } = req.params;

  try {
    const rideRef = db.collection("rides").doc(rideId);
    const rideSnap = await rideRef.get();

    if (!rideSnap.exists) {
      return res.status(404).json({ error: "Ride not found" });
    }

    res.json({ ok: true, ride: { id: rideSnap.id, ...rideSnap.data() } });
  } catch (err) {
    console.error("Error fetching ride:", err);
    res.status(500).json({ error: "Failed to fetch ride" });
  }
});

// --------------------
// Send SOS alert
// --------------------
router.post("/:rideId/alert", async (req, res) => {
  const { rideId } = req.params;
  const { message, emergencyContactToken, lat, lng } = req.body;

  try {
    const rideRef = db.collection("rides").doc(rideId);
    const rideSnap = await rideRef.get();

    if (!rideSnap.exists) {
      return res.status(404).json({ error: "Ride not found" });
    }

    await admin.messaging().send({
      token: emergencyContactToken,
      notification: {
        title: "🚨 SOS Alert",
        body: message || "Your contact triggered an SOS!",
      },
      data: {
        rideId,
        lat: String(lat),
        lng: String(lng),
      },
    });

    res.json({ ok: true, message: "SOS alert sent!" });
  } catch (err) {
    console.error("Error sending SOS:", err);
    res.status(500).json({ error: "Failed to send SOS alert" });
  }
});

module.exports = router;
