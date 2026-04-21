const mongoose = require('mongoose');

const videoRoomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: '',
  },
  maxParticipants: {
    type: Number,
    default: 4,
    min: 2,
    max: 10,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('VideoRoom', videoRoomSchema);
