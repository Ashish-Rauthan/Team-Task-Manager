const express = require('express');
const router  = express.Router();

const { requireAuth }                   = require('../middleware/auth');
const { requireRole }                   = require('../middleware/roles');
const { signupRules, loginRules, validate } = require('../middleware/validate');
const {
  signup, login, logout, me, updateMe, listUsers, updateUserRole
} = require('../controllers/authController');

// Public
router.post('/signup', signupRules, validate, signup);
router.post('/login',  loginRules,  validate, login);
router.post('/logout', logout);

// Authenticated
router.get('/me',   requireAuth, me);
router.patch('/me', requireAuth, updateMe);

// Admin only
router.get('/users',             requireAuth, requireRole('admin'), listUsers);
router.patch('/users/:id/role',  requireAuth, requireRole('admin'), updateUserRole);

module.exports = router;
