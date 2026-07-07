const { hashPassword, comparePassword } = require('../utils/hash');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken
} = require('../utils/jwt');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 
};

async function register(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required.' });
    }
    if (!['client', 'worker'].includes(role)) {
      return res.status(400).json({ message: 'Role must be client or worker.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.createUser({ name, email, passwordHash, role });

    await issueTokens(res, user);
    return res.status(201).json({ user: sanitizeUser(user), accessToken: res.locals.accessToken });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Could not create account.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.is_banned) {
      return res.status(403).json({ message: 'This account has been banned.' });
    }

    const validPassword = await comparePassword(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    await issueTokens(res, user);
    return res.json({ user: sanitizeUser(user), accessToken: res.locals.accessToken });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Could not log in.' });
  }
}

async function refresh(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'No refresh token provided.' });
    }

    const stored = await RefreshToken.findValidRefreshToken(token);
    if (!stored) {
      return res.status(401).json({ message: 'Refresh token invalid or expired.' });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch (err) {
      return res.status(401).json({ message: 'Refresh token invalid or expired.' });
    }

    const user = await User.findUserById(payload.userId);
    if (!user || user.is_banned) {
      return res.status(401).json({ message: 'Account no longer active.' });
    }

    await RefreshToken.deleteRefreshToken(token);
    await issueTokens(res, user);

    const accessToken = signAccessToken(user);
    return res.json({ accessToken });
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(500).json({ message: 'Could not refresh session.' });
  }
}

async function logout(req, res) {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      await RefreshToken.deleteRefreshToken(token);
    }
    res.clearCookie('refreshToken', REFRESH_COOKIE_OPTIONS);
    return res.json({ message: 'Logged out.' });
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json({ message: 'Could not log out.' });
  }
}

async function forgotPassword(req, res) {
  return res.json({ message: 'If that email exists, a reset link has been sent.' });
}

async function issueTokens(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.storeRefreshToken(user.id, refreshToken, expiresAt);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  res.locals.accessToken = accessToken;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

module.exports = { register, login, refresh, logout, forgotPassword };







