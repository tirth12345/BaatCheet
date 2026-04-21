const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  newsId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'News Source'
  },
  category: {
    type: String,
    default: 'General',
    index: true
  },
  timestamp: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 font-family=%22Arial%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ENews Image%3C/text%3E%3C/svg%3E'
  },
  url: {
    type: String
  },
  source: {
    type: String
  },
  pubDate: {
    type: String
  },
  fetchedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Index for searching
newsSchema.index({ title: 'text', content: 'text', author: 'text', source: 'text' });

module.exports = mongoose.model('News', newsSchema);
