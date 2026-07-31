const aiService = require('../services/aiService');

exports.generateCaption = async (req, res) => {
  try {
    const { prompt, tone = 'Professional', includeCTA = true } = req.body;
    const caption = await aiService.generateCaption(prompt, tone, includeCTA);
    const hashtags = await aiService.generateHashtags(caption, 5);

    res.json({
      success: true,
      data: {
        caption,
        tone,
        hashtags,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.generateHashtags = async (req, res) => {
  try {
    const { content, count = 5 } = req.body;
    const hashtags = await aiService.generateHashtags(content, count);
    res.json({ success: true, count: hashtags.length, hashtags });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.transformTone = async (req, res) => {
  try {
    const { content, tone = 'Professional' } = req.body;
    const transformed = await aiService.transformTone(content, tone);
    res.json({ success: true, tone, content: transformed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
