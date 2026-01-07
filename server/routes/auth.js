const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateSignup, validateLogin, validatePasswordUpdate } = require('../middleware/validation');

const router = express.Router();

/**
 * Authentication Routes
 */

// Public routes
router.post('/signup', validateSignup, authController.signup);
router.post('/login', validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/refresh-token', authController.refreshToken);
router.get('/verify', authController.verifyTokenEndpoint);

// Protected routes
router.use(protect); // All routes after this middleware are protected

router.get('/me', authController.getMe);
router.patch('/update-password', validatePasswordUpdate, authController.updatePassword);
router.post('/logout-all', authController.logoutAllDevices);

module.exports = router;