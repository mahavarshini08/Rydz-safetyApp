// models/Ride.js
const admin = require("firebase-admin");
const { db } = require("../firebase-config");

const RIDE_COLLECTION = "rides";

const Ride = {
  // ✅ Create a new ride
  async create({ userId, pickup, dropoff, status }) {
    const rideRef = db.collection(RIDE_COLLECTION).doc();

    const rideData = {
      id: rideRef.id,
      userId,
      pickup,
      dropoff,
      status: status || "pending",
      locations: [],   // 📍 live tracking points
      emergencies: [], // 🚨 emergency logs
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await rideRef.set(rideData);
    const saved = await rideRef.get();
    return { id: rideRef.id, ...saved.data() };
  },

  // ✅ Get rides for a user
  async findByUser(userId) {
    const snapshot = await db
      .collection(RIDE_COLLECTION)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },

  // ✅ Find ride by ID
  async findById(rideId) {
    const doc = await db.collection(RIDE_COLLECTION).doc(rideId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // ✅ Update ride fields (status, dropoff, etc.)
  async update(rideId, data) {
    const rideRef = db.collection(RIDE_COLLECTION).doc(rideId);
    await rideRef.update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updated = await rideRef.get();
    return { id: rideId, ...updated.data() };
  },

  // ✅ Add location update
  async addLocation(rideId, { lat, lng, timestamp }) {
    const rideRef = db.collection(RIDE_COLLECTION).doc(rideId);
    await rideRef.update({
      locations: admin.firestore.FieldValue.arrayUnion({
        lat,
        lng,
        timestamp: timestamp || new Date().toISOString(),
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updated = await rideRef.get();
    return { id: rideId, ...updated.data() };
  },

  // ✅ Add emergency alert
  async addEmergency(rideId, { lat, lng, distance, timestamp }) {
    const rideRef = db.collection(RIDE_COLLECTION).doc(rideId);
    await rideRef.update({
      emergencies: admin.firestore.FieldValue.arrayUnion({
        lat,
        lng,
        distance: distance || null,
        timestamp: timestamp || new Date().toISOString(),
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updated = await rideRef.get();
    return { id: rideId, ...updated.data() };
  },
};

module.exports = Ride;
