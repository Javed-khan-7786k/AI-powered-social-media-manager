const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/generate-caption', aiController.generateCaption);
router.post('/generate-hashtags', aiController.generateHashtags);
router.post('/transform-tone', aiController.transformTone);

module.exports = router;
