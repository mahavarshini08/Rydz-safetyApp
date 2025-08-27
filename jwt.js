const jwt = require('jsonwebtoken');
const SECRET = 'YOUR_SECRET_KEY';

function generateToken(user) {
  return jwt.sign({ id: user._id }, SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

module.exports = { generateToken, verifyToken };
