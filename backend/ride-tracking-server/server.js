// backend/ride-tracking-server/server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const rideSocket = require('./socketHandlers/rideSocket');

const app = express();
app.use(express.json());
app.use(cors());

// Basic auth route (example)
const User = require('./models/User');
const jwtUtil = require('./jwt');

app.post('/auth/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone required' });
  let user = await User.findOne({ phone });
  if (!user) {
    // auto-create for demo — in production use proper signup
    user = await User.create({ phone });
  }
  const token = jwtUtil.generateToken(user);
  res.json({ token, user });
});

const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });

// attach socket handlers
rideSocket(io);

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rydz';
mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongo connected'))
  .catch((err) => console.error('Mongo connection error', err));

const PORT = process.env.PORT || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
