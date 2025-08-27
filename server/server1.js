const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Allow connections from your Expo app
const io = new Server(server, {
  cors: {
    origin: "*", // for development, allow all
    methods: ["GET", "POST"],
  },
});

// store latest locations
let clients = {};

io.on("connection", (socket) => {
  console.log("✅ Client connected:", socket.id);

  socket.on("location_update", (point) => {
    console.log("📍 Location from", socket.id, point);
    clients[socket.id] = point;

    // broadcast to all other clients (if needed)
    socket.broadcast.emit("location_broadcast", {
      id: socket.id,
      ...point,
    });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
    delete clients[socket.id];
  });
});

// 👉 Root route so browser doesn't show "Cannot GET /"
app.get("/", (req, res) => {
  res.send("Ride Safety Backend is running ✅");
});

// 👉 Optional: expose all live clients
app.get("/locations", (req, res) => {
  res.json(clients);
});

// Start server
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
