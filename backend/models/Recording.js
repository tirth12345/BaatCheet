const mongoose = require('mongoose');

const recordingSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VideoRoom',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  filename: {
    type: String,
    required: true,
  },
  participants: [
    {
      userId: mongoose.Schema.Types.ObjectId,
      userName: String,
    },
  ],
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in seconds
    required: true,
  },
  fileSize: {
    type: Number, // in bytes
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Recording', recordingSchema);
