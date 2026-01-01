const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const controller = require('../controllers/dashboardController');

router.use(auth);
router.get('/stats', controller.stats);
router.get('/recent', controller.recent);

module.exports = router;
