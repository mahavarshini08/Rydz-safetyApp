
// server/index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);


// ---- middleware
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json()); // parse JSON bodies

// ---- socket.io
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// store latest locations (in memory)
const clients = new Map(); // key: id, value: { latitude, longitude, timestamp, via }

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
    // broadcast to everyone (e.g., a dashboard)
    socket.broadcast.emit("location_broadcast", { id: socket.id, ...entry });
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    clients.delete(socket.id);
  });
});

// ---- routes

// Root — avoids "Cannot GET /"
app.get("/", (_req, res) => {
  res.send("🚗 Ride Safety Backend is running ✅");
});

// Debug: all last-seen locations
app.get("/locations", (_req, res) => {
  const obj = {};
  for (const [id, val] of clients.entries()) obj[id] = val;
  res.json(obj);
});

// Background updates via HTTP (recommended for TaskManager)
app.post("/locations", (req, res) => {
  const { latitude, longitude, timestamp, riderId } = req.body || {};
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ error: "latitude and longitude are required numbers" });
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

  // Optionally broadcast so any socket dashboards get updates too
  io.emit("location_broadcast", { id, ...entry });

  res.json({ ok: true, id });
});

// ---- start server
const PORT = process.env.PORT || 4000;
// bind to 0.0.0.0 so devices on LAN can reach it
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
