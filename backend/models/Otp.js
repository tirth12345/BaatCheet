const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['signup', 'login'],
    required: true
  },
  // The 'expires' property creates a MongoDB TTL index!
  // Documents will automatically be deleted 15 minutes (900 seconds) after creation.
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900 
  },
  // We can temporarily store the signup credentials to prevent passing them back from client
  tempUserData: {
    type: Object,
    required: false
  }
});

module.exports = mongoose.model('Otp', otpSchema);
