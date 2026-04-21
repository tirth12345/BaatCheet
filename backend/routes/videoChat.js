const express = require('express');
const router = express.Router();
const VideoRoom = require('../models/VideoRoom');
const Recording = require('../models/Recording');
const ChatMessage = require('../models/ChatMessage');

// Middleware to check if user is authenticated
const authenticateUser = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userName = req.headers['x-user-name'];

  if (!userId || !userName) {
    return res.status(401).json({ error: 'Unauthorized - Please login' });
  }

  req.userId = userId;
  req.userName = userName;
  next();
};

// GET all active video rooms
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await VideoRoom.find({ isActive: true });
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET specific room details
router.get('/rooms/:roomId', async (req, res) => {
  try {
    const room = await VideoRoom.findById(req.params.roomId);
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get recent chat messages
    const messages = await ChatMessage.find({ roomId: room._id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({
      ...room.toObject(),
      recentMessages: messages.reverse(),
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// POST create new room (admin only - you can modify this based on your auth system)
router.post('/rooms', authenticateUser, async (req, res) => {
  try {
    const { name, description, maxParticipants } = req.body;

    // Check if room with same name exists
    const existingRoom = await VideoRoom.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ error: 'Room with this name already exists' });
    }

    const newRoom = new VideoRoom({
      name,
      description: description || '',
      maxParticipants: maxParticipants || 4,
      isActive: true,
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT update room
router.put('/rooms/:roomId', authenticateUser, async (req, res) => {
  try {
    const { description, maxParticipants, isActive } = req.body;
    
    const room = await VideoRoom.findByIdAndUpdate(
      req.params.roomId,
      {
        description: description !== undefined ? description : undefined,
        maxParticipants: maxParticipants !== undefined ? maxParticipants : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(room);
  } catch (error) {
    console.error('Error updating room:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE room
router.delete('/rooms/:roomId', authenticateUser, async (req, res) => {
  try {
    const room = await VideoRoom.findByIdAndDelete(req.params.roomId);

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Also delete associated messages and recordings
    await ChatMessage.deleteMany({ roomId: req.params.roomId });
    await Recording.deleteMany({ roomId: req.params.roomId });

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// GET chat messages for a room
router.get('/rooms/:roomId/messages', async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;
    
    const messages = await ChatMessage.find({ roomId: req.params.roomId })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .sort({ timestamp: -1 });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST save recording
router.post('/rooms/:roomId/recordings', authenticateUser, async (req, res) => {
  try {
    const { title, filename, participants, startTime, endTime, fileSize } = req.body;
    
    const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 1000);

    const recording = new Recording({
      roomId: req.params.roomId,
      title,
      filename,
      participants,
      startTime,
      endTime,
      duration,
      fileSize,
    });

    await recording.save();
    res.status(201).json(recording);
  } catch (error) {
    console.error('Error saving recording:', error);
    res.status(500).json({ error: 'Failed to save recording' });
  }
});

// GET recordings for a room
router.get('/rooms/:roomId/recordings', async (req, res) => {
  try {
    const recordings = await Recording.find({ roomId: req.params.roomId }).sort({ createdAt: -1 });
    res.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    res.status(500).json({ error: 'Failed to fetch recordings' });
  }
});

// POST initialize pre-created rooms (run this once to set up default rooms)
router.post('/initialize-rooms', async (req, res) => {
  try {
    const defaultRooms = [
      {
        name: 'General Chat',
        description: 'General discussion room',
        maxParticipants: 4,
      },
      {
        name: 'Tech Talk',
        description: 'For tech discussions and help',
        maxParticipants: 4,
      },
      {
        name: 'News Discussion',
        description: 'Discuss the latest news',
        maxParticipants: 4,
      },
      {
        name: 'Community Hub',
        description: 'Community gathering place',
        maxParticipants: 4,
      },
    ];

    // Check if rooms already exist
    const existingCount = await VideoRoom.countDocuments();
    if (existingCount > 0) {
      return res.json({ message: 'Rooms already initialized' });
    }

    // Create default rooms
    const createdRooms = await VideoRoom.insertMany(defaultRooms);
    res.status(201).json(createdRooms);
  } catch (error) {
    console.error('Error initializing rooms:', error);
    res.status(500).json({ error: 'Failed to initialize rooms' });
  }
});

module.exports = router;
