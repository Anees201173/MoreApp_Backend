const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authorize = require('../middleware/authorize');

router.get('/', authorize(['admin']), userController.list);
router.get('/:id', authorize(['admin', 'user']), userController.get);
router.patch('/:id', authorize(['admin', 'user']), userController.update);

module.exports = router;
