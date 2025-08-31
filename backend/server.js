require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");
const serviceAccount = require("./firebase-service-account.json");

// Routes
const authRoutes = require("./routes/auth");
const rideRoutes = require("./routes/rides");

// -------------------
// Initialize Firebase Admin
// -------------------
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Firebase middleware (only used for protected routes)
const auth = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

// -------------------
// Middleware
// -------------------
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// ✅ Simple test route
app.get("/api/test", (_req, res) => {
  res.json({ success: true, message: "Backend is working!" });
});

// ✅ Routes
app.use("/api/auth", authRoutes);
app.use("/api/rides", auth, rideRoutes);

app.get("/", (_req, res) => {
  res.json({ success: true, message: "🚗 Ride Safety Backend running ✅" });
});

// -------------------
// Socket.io for real-time location
// -------------------
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const clients = new Map();

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);

  socket.on("location_update", (point) => {
    const entry = {
      latitude: point.latitude,
      longitude: point.longitude,
      timestamp: point.timestamp || Date.now(),
    };
    clients.set(socket.id, entry);
    socket.broadcast.emit("location_broadcast", { id: socket.id, ...entry });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    clients.delete(socket.id);
  });
});

// Debug: get all last-seen locations
app.get("/locations", (_req, res) => {
  const obj = {};
  for (const [id, val] of clients.entries()) obj[id] = val;
  res.json(obj);
});

// Background location updates via HTTP
app.post("/locations", (req, res) => {
  const { latitude, longitude, timestamp, riderId } = req.body || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res
      .status(400)
      .json({ success: false, message: "latitude and longitude required" });
  }

  const id = riderId || `bg-${Date.now()}`;
  const entry = { latitude, longitude, timestamp: timestamp || Date.now() };
  clients.set(id, entry);
  io.emit("location_broadcast", { id, ...entry });

  res.json({ success: true, id });
});

// -------------------
// 🚨 SOS Alert API
// -------------------
app.post("/api/sos", async (req, res) => {
  try {
    const { latitude, longitude, emergencyContactToken, userId } = req.body;

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // 🚨 Push notification via Firebase (if FCM token exists)
    if (emergencyContactToken) {
      await admin.messaging().send({
        token: emergencyContactToken,
        notification: {
          title: "🚨 SOS Alert",
          body: "Your contact triggered an SOS!",
        },
        data: {
          latitude: String(latitude),
          longitude: String(longitude),
          userId: userId || "unknown",
        },
      });
    } else {
      console.log("⚠️ No FCM token, frontend must handle SMS fallback.");
    }

    return res.json({
      success: true,
      message: "🚨 SOS alert processed",
      location: { latitude, longitude },
    });
  } catch (err) {
    console.error("❌ SOS error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send SOS alert",
      error: err.message,
    });
  }
});

// -------------------
// Start server
// -------------------
const PORT = process.env.PORT || 4000;
server.listen(PORT, "192.168.1.7", () => {
  console.log(`🚀 Server running at http://192.168.1.7:${PORT}`);
});
