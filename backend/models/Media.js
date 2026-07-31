const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileUrl: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    category: {
      type: String,
      enum: ['image', 'video', 'document'],
      required: true,
    },
    linkedInMediaUrn: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Media || mongoose.model('Media', mediaSchema);
