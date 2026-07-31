const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { apiLimiter } = require('../middleware/rateLimiter');

router.post('/upload', apiLimiter, postController.createPost);
router.post('/quote', apiLimiter, postController.uploadQuote);
router.get('/history', postController.getHistory);
router.delete('/:id', postController.deletePost);

module.exports = router;
