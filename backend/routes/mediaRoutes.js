const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const mediaController = require('../controllers/mediaController');

router.post('/upload', upload.array('files', 10), mediaController.uploadMedia);

module.exports = router;
