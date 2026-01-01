const express = require('express');
const router = express.Router();
const { auth, requireAdmin } = require('../middleware/auth');
const assetsController = require('../controllers/assetsController');

router.use(auth);
router.get('/', assetsController.list);
router.patch('/:id/status', assetsController.updateStatus);
router.post('/', requireAdmin, assetsController.create);
router.patch('/:id', requireAdmin, assetsController.update);
router.delete('/:id', requireAdmin, assetsController.remove);

module.exports = router;
