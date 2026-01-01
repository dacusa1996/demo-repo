const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const maintenanceController = require('../controllers/maintenanceController');

router.get('/', auth, maintenanceController.list);
router.post('/', auth, maintenanceController.create);
router.patch('/:id/status', auth, maintenanceController.updateStatus);

module.exports = router;
