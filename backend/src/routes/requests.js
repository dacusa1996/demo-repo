const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const controller = require('../controllers/requestsController');

router.use(auth);
router.get('/', controller.list);
router.post('/', controller.create);
router.patch('/:id/status', controller.updateStatus);

module.exports = router;
