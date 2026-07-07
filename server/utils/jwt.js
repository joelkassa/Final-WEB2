const jwt = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function signAccessToken(user) {
  // Payload stays minimal — just enough to authenticate and authorize.
  // Never put sensitive data (password hash, etc.) in a JWT payload;
  // it's base64-encoded, not encrypted, and readable by anyone who has the token.
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRY }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  REFRESH_TOKEN_EXPIRY
};









