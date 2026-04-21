const mongoose = require('mongoose');

const newsStatsSchema = new mongoose.Schema({
  newsId: {
    type: Number,
    required: true,
    unique: true
  },
  upvotes: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NewsStats', newsStatsSchema);
