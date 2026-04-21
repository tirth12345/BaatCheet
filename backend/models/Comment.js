const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  newsId: {
    type: Number,
    required: true
  },
  newsTitle: {
    type: String,
    required: true
  },
  comment: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Comment', commentSchema);
