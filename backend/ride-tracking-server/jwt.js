// utils/jwt.js
const jwt = require("jsonwebtoken");

// load secret from environment
const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
  throw new Error("❌ JWT_SECRET not found in .env file");
}

function generateToken(user) {
  return jwt.sign({ id: user._id }, SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
