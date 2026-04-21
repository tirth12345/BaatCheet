const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  userId: String,
  likes: {
    type: Number,
    default: 0
  }
});

const discussionSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    default: 'General'
  },
  author: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  userId: String,
  replies: [replySchema],
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  }
});

module.exports = mongoose.model('Discussion', discussionSchema);
