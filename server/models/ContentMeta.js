const mongoose = require('mongoose');

const contentMetaSchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  url: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: 'Untitled',
  },
  mimeType: {
    type: String,
    default: 'text/html',
  },
  size: {
    type: Number,
    default: 0,
  },
  peerId: {
    type: String,
    required: true,
  },
  assets: [{
    hash: String,
    url: String,
    mimeType: String,
    size: Number,
  }],
}, {
  timestamps: true,
});

module.exports = mongoose.model('ContentMeta', contentMetaSchema);
