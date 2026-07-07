const crypto = require('crypto');
const pool = require('../config/db');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function storeRefreshToken(userId, token, expiresAt) {
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
    [userId, hashToken(token), expiresAt]
  );
}

async function findValidRefreshToken(token) {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND expires_at > now()`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
}

async function deleteRefreshToken(token) {
  await pool.query(
    `DELETE FROM refresh_tokens WHERE token_hash = $1`,
    [hashToken(token)]
  );
}

async function deleteAllUserRefreshTokens(userId) {
  await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [userId]);
}

module.exports = {
  storeRefreshToken,
  findValidRefreshToken,
  deleteRefreshToken,
  deleteAllUserRefreshTokens
};




