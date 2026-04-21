const ChatMessage = require('./models/ChatMessage');
const VideoRoom = require('./models/VideoRoom');

// Store active connections and their room/user info
const activeConnections = new Map(); // socketId => { userId, userName, roomId }
const roomParticipants = new Map(); // roomId => Set of socketIds
const roomExpirations = new Map(); // roomId => { timer, warningTimer }

const ROOM_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const WARNING_BEFORE_MS = 5 * 60 * 1000; // 5 minutes warning

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    // User joins a video room
    socket.on('join-room', async (data) => {
      try {
        const { roomId, userId, userName } = data;
        
        // Verify room exists
        const room = await VideoRoom.findById(roomId);
        if (!room) {
          socket.emit('error', 'Room not found');
          return;
        }

        // Check room capacity
        if (!roomParticipants.has(roomId)) {
          roomParticipants.set(roomId, new Set());
        }

        const participants = roomParticipants.get(roomId);
        if (participants.size >= room.maxParticipants) {
          socket.emit('error', 'Room is full');
          return;
        }

        // Join the socket to the room
        socket.join(roomId);
        
        // Store connection info
        activeConnections.set(socket.id, { userId, userName, roomId });
        participants.add(socket.id);

        // Calculate remaining time
        const currentTime = new Date();
        const startTime = new Date(room.createdAt);
        const elapsedTime = currentTime - startTime;
        const remainingTime = Math.max(0, ROOM_DURATION_MS - elapsedTime);

        // Notify user about room info and remaining time
        socket.emit('room-info', {
          roomName: room.name,
          createdAt: room.createdAt,
          expiresAt: new Date(startTime.getTime() + ROOM_DURATION_MS),
          remainingTime: remainingTime
        });

        // Setup timers for this room if not already running
        if (!roomExpirations.has(roomId)) {
          const expirationTime = startTime.getTime() + ROOM_DURATION_MS;
          const warningTime = expirationTime - WARNING_BEFORE_MS;

          const warningDelay = warningTime - currentTime.getTime();
          const expirationDelay = expirationTime - currentTime.getTime();

          const timers = {};

          if (warningDelay > 0) {
            timers.warningTimer = setTimeout(() => {
              io.to(roomId).emit('room-warning', {
                message: 'This session will end in 5 minutes.',
                remainingTime: WARNING_BEFORE_MS
              });
            }, warningDelay);
          }

          if (expirationDelay > 0) {
            timers.timer = setTimeout(async () => {
              io.to(roomId).emit('room-expired', {
                message: 'The 60-minute session has ended.'
              });
              
              // Set room to inactive in DB
              const expiredRoom = await VideoRoom.findById(roomId);
              if (expiredRoom) {
                expiredRoom.isActive = false;
                await expiredRoom.save();
              }

              // Disconnect everyone in the room
              const roomSocks = roomParticipants.get(roomId);
              if (roomSocks) {
                for (const sid of roomSocks) {
                  const s = io.sockets.sockets.get(sid);
                  if (s) s.disconnect();
                }
              }
              
              roomExpirations.delete(roomId);
              roomParticipants.delete(roomId);

              // Notify all clients to refresh their room list
              io.emit('rooms-updated');
            }, expirationDelay);
          }

          roomExpirations.set(roomId, timers);
        }

        // Notify all clients that a new room is available
        io.emit('rooms-updated');

        // Notify others that user joined
        socket.to(roomId).emit('user-joined', {
          socketId: socket.id,
          userName: userName,
          totalParticipants: participants.size,
        });

        // Send existing participants to new user
        const existingParticipants = Array.from(participants)
          .filter(id => id !== socket.id)
          .map(id => ({
            socketId: id,
            userName: activeConnections.get(id)?.userName,
          }));

        socket.emit('existing-users', existingParticipants);
        
        console.log(`User ${userName} joined room ${roomId}. Participants: ${participants.size}`);
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    // Handle call signal (WebRTC)
    socket.on('call-user', (data) => {
      const { to, offer } = data;
      socket.to(to).emit('incoming-call', {
        from: socket.id,
        from_name: activeConnections.get(socket.id)?.userName,
        offer: offer,
      });
    });

    // Handle call answer (WebRTC)
    socket.on('answer-call', (data) => {
      const { to, answer } = data;
      socket.to(to).emit('call-answered', {
        from: socket.id,
        answer: answer,
      });
    });

    // Handle ICE candidates (WebRTC)
    socket.on('ice-candidate', (data) => {
      const { to, candidate } = data;
      socket.to(to).emit('ice-candidate', {
        from: socket.id,
        candidate: candidate,
      });
    });

    // Handle chat messages
    socket.on('send-message', async (data) => {
      try {
        const { message, roomId } = data;
        const userInfo = activeConnections.get(socket.id);

        if (!userInfo) {
          socket.emit('error', 'User not in room');
          return;
        }

        // Save message to database
        const chatMsg = new ChatMessage({
          roomId: roomId,
          userId: userInfo.userId,
          userName: userInfo.userName,
          message: message,
          isVoiceTranscribed: false,
        });

        await chatMsg.save();

        // Broadcast to room
        io.to(roomId).emit('new-message', {
          userName: userInfo.userName,
          message: message,
          timestamp: new Date(),
          isVoiceTranscribed: false,
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // Handle voice transcribed message
    socket.on('send-voice-message', async (data) => {
      try {
        const { message, roomId } = data;
        const userInfo = activeConnections.get(socket.id);

        if (!userInfo) {
          socket.emit('error', 'User not in room');
          return;
        }

        // Save transcribed message to database
        const chatMsg = new ChatMessage({
          roomId: roomId,
          userId: userInfo.userId,
          userName: userInfo.userName,
          message: message,
          isVoiceTranscribed: true,
        });

        await chatMsg.save();

        // Broadcast to room
        io.to(roomId).emit('new-message', {
          userName: userInfo.userName,
          message: message,
          timestamp: new Date(),
          isVoiceTranscribed: true,
        });
      } catch (error) {
        console.error('Error sending voice message:', error);
        socket.emit('error', 'Failed to send voice message');
      }
    });

    // Handle user leaving
    const handleUserLeave = async (socketId, userInfo) => {
      try {
        if (!userInfo) return;
        const { roomId, userId } = userInfo;
        const participants = roomParticipants.get(roomId);
        
        // Remove from local participants state and emit to others
        if (participants && participants.has(socketId)) {
          participants.delete(socketId);
          io.to(roomId).emit('user-left', {
            socketId: socketId,
            totalParticipants: participants.size,
          });
        }

        // Check if owner left
        let roomData = null;
        try {
          roomData = await VideoRoom.findById(roomId);
        } catch (err) {}
        
        const isOwner = roomData && roomData.createdBy && roomData.createdBy === userId;

        if (isOwner) {
          // Owner left completely: kill the room
          if (roomData.isActive) {
            roomData.isActive = false;
            await roomData.save();
            io.to(roomId).emit('room-expired', {
              message: 'The room owner has ended the video chat.'
            });
            io.emit('rooms-updated'); // refresh UI everywhere
          }
          
          // Boot other participants
          if (participants) {
            for (const sid of participants) {
              const s = io.sockets.sockets.get(sid);
              if (s && s.id !== socketId) s.disconnect();
            }
          }
          
          roomParticipants.delete(roomId);
          const timers = roomExpirations.get(roomId);
          if (timers) {
            if (timers.timer) clearTimeout(timers.timer);
            if (timers.warningTimer) clearTimeout(timers.warningTimer);
            roomExpirations.delete(roomId);
          }
        } else if (participants && participants.size === 0) {
          // Not owner, but room is empty so clean it up anyway
          roomParticipants.delete(roomId);
          const timers = roomExpirations.get(roomId);
          if (timers) {
            if (timers.timer) clearTimeout(timers.timer);
            if (timers.warningTimer) clearTimeout(timers.warningTimer);
            roomExpirations.delete(roomId);
          }
          if (roomData && roomData.isActive) {
            roomData.isActive = false;
            await roomData.save();
            io.emit('rooms-updated');
          }
        }

        activeConnections.delete(socketId);
      } catch (error) {
        console.error('Error handling user leave:', error);
      }
    };

    // Handle user leaving via disconnection
    socket.on('disconnect', async () => {
      const userInfo = activeConnections.get(socket.id);
      await handleUserLeave(socket.id, userInfo);
      console.log(`User disconnected`);
    });

    // Handle explicit leave button
    socket.on('leave-room', async (data) => {
      const userInfo = activeConnections.get(socket.id) || { roomId: data.roomId };
      await handleUserLeave(socket.id, userInfo);
      socket.leave(data.roomId);
    });
  });
};
