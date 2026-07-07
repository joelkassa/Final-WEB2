const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authRateLimiter } = require('../middleware/rateLimiter');

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);

module.exports = router;










