const express = require('express');
const router = express.Router();
const { login, register, forgot, listResets, resolveReset } = require('../controllers/authController');
const { auth, requireAdmin } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', register);
// POST /api/auth/login
router.post('/login', login);
// forgot password request (clerk/dept head)
router.post('/forgot', forgot);
// admin: list reset requests
router.get('/forgot', auth, requireAdmin, listResets);
// admin: resolve reset
router.patch('/forgot/:id', auth, requireAdmin, resolveReset);

module.exports = router;
