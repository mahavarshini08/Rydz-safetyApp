// backend/ride-tracking-server/socketHandlers/rideSocket.js
const Ride = require('../../models/Ride');
const User = require("../models/User");
const { verifyToken } = require("../../utils/jwt");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("socket connected:", socket.id);

    socket.on("authenticate", async ({ token }) => {
      try {
        const payload = verifyToken(token);
        if (payload && payload.id) {
          socket.userId = payload.id;
          console.log("socket authenticated user:", payload.id);
        }
      } catch (e) {
        console.warn("auth failed", e);
      }
    });

    socket.on("location_update", async (data) => {
      try {
        if (!socket.userId) return;
        let ride = await Ride.findOne({ userId: socket.userId, endTime: null });
        if (!ride) {
          ride = new Ride({ userId: socket.userId, path: [] });
        }
        ride.path.push({
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp,
        });
        await ride.save();
        io.emit("location_broadcast", {
          userId: socket.userId,
          latitude: data.latitude,
          longitude: data.longitude,
        });
      } catch (err) {
        console.error("location_update error:", err);
      }
    });

    socket.on("end_ride", async () => {
      try {
        if (!socket.userId) return;
        const ride = await Ride.findOne({ userId: socket.userId, endTime: null });
        if (ride) {
          ride.endTime = new Date();
          await ride.save();
        }
      } catch (err) {
        console.error("end_ride error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("socket disconnected:", socket.id);
    });
  });
};
