// Main server file
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// Import Firebase config
const { db } = require("./firebase-config");

// Import models
const User = require("./models/user");
const Ride = require("./models/Ride");

// Import routes
const authRoutes = require("./routes/auth");
const rideRoutes = require("./routes/rides");

// Import middleware
const { authenticateToken } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

// ---- middleware
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// ---- routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", authenticateToken, rideRoutes);

// 🚨 SOS Alert API Endpoint
app.post("/api/sos", async (req, res) => {
  try {
    const { userId, latitude, longitude, emergencyContact } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ error: "latitude and longitude are required" });
    }

    console.log("🚨 SOS Alert received:", { userId, latitude, longitude, emergencyContact });

    // TODO: Implement FCM notification to emergency contacts
    // For now, just log the alert
    res.json({ 
      success: true, 
      message: "SOS alert received and logged",
      location: { latitude, longitude }
    });
  } catch (error) {
    console.error("SOS alert error:", error);
    res.status(500).json({ error: "Failed to process SOS alert" });
  }
});

// Root route
app.get("/", (_req, res) => {
  res.send("🚗 Ride Safety Backend is running ✅");
});

// ---- socket.io
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// store latest locations (in memory)
const clients = new Map();

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("location_update", (point) => {
    const entry = {
      latitude: point.latitude,
      longitude: point.longitude,
      timestamp: point.timestamp || Date.now(),
      via: "socket",
    };
    clients.set(socket.id, entry);

    console.log("📍 [SOCKET]", socket.id, entry);
    socket.broadcast.emit("location_broadcast", { id: socket.id, ...entry });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    clients.delete(socket.id);
  });
});

// Debug: all last-seen locations
app.get("/locations", (_req, res) => {
  const obj = {};
  for (const [id, val] of clients.entries()) obj[id] = val;
  res.json(obj);
});

// Background updates via HTTP
app.post("/locations", (req, res) => {
  const { latitude, longitude, timestamp, riderId } = req.body || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ error: "latitude and longitude are required numbers" });
  }

  const id = riderId || `bg-${Date.now()}`;
  const entry = {
    latitude,
    longitude,
    timestamp: timestamp || Date.now(),
    via: "http",
  };

  clients.set(id, entry);

  console.log("📡 [HTTP ]", id, entry);

  io.emit("location_broadcast", { id, ...entry });

  res.json({ ok: true, id });
});

// ---- Firebase
console.log("✅ Firebase initialized");

// ---- start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://10.135.138.202:${PORT}`);
});
