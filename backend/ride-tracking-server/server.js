const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const rideSocket = require("./socketHandlers/rideSocket");
const User = require("./models/User");
const Ride = require("./models/Ride");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect("mongodb://127.0.0.1:27017/ride_safety", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  rideSocket(socket, io);
});

// Ride endpoints
app.post("/rides/start", async (req, res) => {
  const { userId } = req.body;
  const ride = await Ride.create({ userId, startTime: new Date(), route: [] });
  res.json({ success: true, rideId: ride._id });
});

app.post("/rides/end", async (req, res) => {
  const { rideId } = req.body;
  await Ride.findByIdAndUpdate(rideId, { endTime: new Date() });
  res.json({ success: true });
});

// Background location endpoint
app.post("/locations", async (req, res) => {
  const { latitude, longitude, timestamp, userId } = req.body;
  const ride = await Ride.findOne({ userId, endTime: null });
  if (ride) {
    ride.route.push({ latitude, longitude, timestamp });
    await ride.save();
  }
  res.json({ success: true });
});

const PORT = 4000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
