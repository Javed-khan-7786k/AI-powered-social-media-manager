const Draft = require('../models/Draft');
const { memoryStore } = require('../config/db');

exports.getDrafts = async (req, res) => {
  try {
    let drafts = [];
    if (Draft.db && Draft.db.readyState === 1) {
      drafts = await Draft.find().sort({ updatedAt: -1 });
    } else {
      drafts = memoryStore.drafts;
    }
    res.json({ success: true, count: drafts.length, data: drafts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.saveDraft = async (req, res) => {
  try {
    const { title, content, author, hashtags, postType, mediaDetails, tone } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Draft content text is required.' });
    }

    const draftData = { title, content, author, hashtags, postType, mediaDetails, tone };
    let saved;

    if (Draft.db && Draft.db.readyState === 1) {
      saved = await Draft.create(draftData);
    } else {
      saved = { _id: `draft_${Date.now()}`, ...draftData, createdAt: new Date() };
      memoryStore.drafts.unshift(saved);
    }

    res.status(201).json({ success: true, message: 'Draft saved successfully.', data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;
    if (Draft.db && Draft.db.readyState === 1) {
      await Draft.findByIdAndDelete(id);
    } else {
      memoryStore.drafts = memoryStore.drafts.filter((d) => d._id !== id && d.id !== id);
    }
    res.json({ success: true, message: 'Draft deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
