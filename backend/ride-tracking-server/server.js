// backend/server.js
require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken"); 

// Import models & utils
const User = require("../models/user"); // adjust path if needed

// Import routes
const authRoutes = require("../routes/auth");
const rideRoutes = require("../routes/rides");

const app = express();
const server = http.createServer(app);

// ---- middleware
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// JWT verification middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// ---- routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", authenticateToken, rideRoutes);

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

// ---- MongoDB
const MONGO = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/rydz";
mongoose
  .connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Mongo connected"))
  .catch((err) => console.error("❌ Mongo connection error", err));

// ---- start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
