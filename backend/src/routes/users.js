const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const usersController = require('../controllers/usersController');

// Admin-only users API
router.use(auth, requireAdmin);
router.get('/', usersController.list);
router.post('/', usersController.create);
router.patch('/:id', usersController.update);

module.exports = router;
