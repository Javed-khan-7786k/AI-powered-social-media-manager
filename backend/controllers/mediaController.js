const path = require('path');
const Media = require('../models/Media');
const { memoryStore } = require('../config/db');

exports.uploadMedia = async (req, res) => {
  try {
    if (!req.file && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ success: false, error: 'No media file provided.' });
    }

    const files = req.files || [req.file];
    const uploadedMediaList = [];

    for (const file of files) {
      let category = 'image';
      if (file.mimetype.startsWith('video/')) {
        category = 'video';
      } else if (file.mimetype.startsWith('application/')) {
        category = 'document';
      }

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

      const mediaRecord = {
        originalName: file.originalname,
        fileName: file.filename,
        filePath: file.path,
        fileUrl: fileUrl,
        mimeType: file.mimetype,
        size: file.size,
        category: category,
      };

      let saved;
      if (Media.db && Media.db.readyState === 1) {
        saved = await Media.create(mediaRecord);
      } else {
        saved = { _id: `media_${Date.now()}_${Math.random()}`, ...mediaRecord };
        memoryStore.media.unshift(saved);
      }

      uploadedMediaList.push(saved);
    }

    return res.status(201).json({
      success: true,
      message: 'Media uploaded successfully.',
      count: uploadedMediaList.length,
      data: uploadedMediaList,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
