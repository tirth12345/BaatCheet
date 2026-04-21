# Video Chat Implementation Guide

## Overview
The video chat feature allows 3-4 people to have live video conversations. Only logged-in users can access this feature. The system uses WebRTC for peer-to-peer video/audio connections and Socket.io for real-time signaling and messaging.

## Architecture

### Technology Stack
- **Backend**: Node.js/Express with Socket.io
- **Frontend**: React with TypeScript
- **Real-time Communication**: Socket.io for signaling, WebRTC for peer connections
- **Database**: MongoDB for storing rooms, messages, and recordings
- **Speech Recognition**: Web Speech API for speech-to-text

### Key Components

#### Backend Files
1. **models/VideoRoom.js** - MongoDB schema for video rooms
2. **models/ChatMessage.js** - Schema for chat messages
3. **models/Recording.js** - Schema for recording metadata
4. **socketHandlers.js** - Socket.io event handlers for video/voice/chat
5. **routes/videoChat.js** - REST API endpoints for room management

#### Frontend Files
1. **pages/VideoChat.tsx** - Room selection/lobby page
2. **pages/VideoChatRoom.tsx** - Main video chat interface with all controls
3. **pages/VideoChat.css** - Styling for lobby
4. **pages/VideoChatRoom.css** - Styling for chat room
5. **Components/Navbar.tsx** - Updated with Video Chat link

## Features

### Core Features
✅ **Multi-party Video Chat** (up to 4 people)
✅ **Real-time Audio/Video** using WebRTC
✅ **Text Chat** during video calls
✅ **Speech-to-Text** - Voice recognition converts speech to text messages
✅ **Screen Recording** - Record your own video stream
✅ **Microphone/Camera Controls** - Toggle on/off during call
✅ **Pre-created Rooms** - Users join existing rooms
✅ **User Authentication** - Only logged-in users can join

### UI Features
✅ **Multiple Video Displays** - Grid layout showing all participants
✅ **Control Panel** - Easy-to-access buttons for all actions
✅ **Chat Panel** - Side panel for sending/receiving messages
✅ **Status Indicators** - Shows recording/listening status
✅ **Participant Counter** - Display number of people in room
✅ **Error Handling** - User-friendly error messages

## Setup Instructions

### 1. Initialize Database Rooms
Before using the video chat feature, you need to create the default rooms:

```bash
# Make a POST request to initialize rooms
curl -X POST http://localhost:5000/api/video-chat/initialize-rooms
```

This creates 4 default rooms:
- General Chat
- Tech Talk
- News Discussion
- Community Hub

### 2. User Flow

#### Step 1: Login/Signup
Users must be authenticated to access video chat. They can:
- Click the profile icon in navbar
- Choose "Login" or "Sign Up"
- Complete authentication

#### Step 2: Navigate to Video Chat
- Click "Video Chat" link in navbar (visible to all users)
- View available video chat rooms
- Click "Join Room" button

#### Step 3: Join a Room
- Grant camera/microphone permissions (browser will prompt)
- Video stream starts automatically
- See own video on the screen
- Automatically connects to other participants in room

#### Step 4: Use Controls
During a video call, users can:
- **🎤** - Toggle microphone on/off
- **📷** - Toggle camera on/off
- **⏺️** - Start/stop recording
- **🎙️** - Start/stop voice recognition
- **💬** - Open/close chat panel
- **☎️** - Leave room (red button)

#### Step 5: Chat & Voice Recognition
- Type messages in chat panel and click "Send"
- Click voice recognition button to enable speech-to-text
- Speaking will be converted to text and sent as message
- Messages show 🎤 badge if voice-transcribed

## API Endpoints

### Get All Rooms
```
GET /api/video-chat/rooms
Response: Array of room objects
```

### Get Room Details
```
GET /api/video-chat/rooms/:roomId
Response: Room object with recent messages
```

### Get Chat Messages
```
GET /api/video-chat/rooms/:roomId/messages?limit=50&skip=0
Response: Array of chat messages
```

### Get Room Recordings
```
GET /api/video-chat/rooms/:roomId/recordings
Response: Array of recording metadata
```

### Create Room (Admin)
```
POST /api/video-chat/rooms
Headers: x-user-id, x-user-name
Body: { name, description, maxParticipants }
Response: Created room object
```

### Update Room (Admin)
```
PUT /api/video-chat/rooms/:roomId
Headers: x-user-id, x-user-name
Body: { description, maxParticipants, isActive }
Response: Updated room object
```

### Delete Room (Admin)
```
DELETE /api/video-chat/rooms/:roomId
Headers: x-user-id, x-user-name
Response: Success message
```

### Save Recording
```
POST /api/video-chat/rooms/:roomId/recordings
Headers: x-user-id, x-user-name
Body: { title, filename, participants, startTime, endTime, fileSize }
Response: Recording metadata
```

### Initialize Default Rooms
```
POST /api/video-chat/initialize-rooms
Response: Array of created rooms
```

## Socket.io Events

### Client → Server Events

#### join-room
```javascript
socket.emit('join-room', {
  roomId: 'room_id',
  userId: 'user_id',
  userName: 'User Name'
});
```

#### call-user
```javascript
socket.emit('call-user', {
  to: 'socketId',
  offer: {/* RTCSessionDescription */}
});
```

#### answer-call
```javascript
socket.emit('answer-call', {
  to: 'socketId',
  answer: {/* RTCSessionDescription */}
});
```

#### ice-candidate
```javascript
socket.emit('ice-candidate', {
  to: 'socketId',
  candidate: {/* RTCIceCandidate */}
});
```

#### send-message
```javascript
socket.emit('send-message', {
  message: 'Hello world',
  roomId: 'room_id'
});
```

#### send-voice-message
```javascript
socket.emit('send-voice-message', {
  message: 'Transcribed text from speech',
  roomId: 'room_id'
});
```

#### leave-room
```javascript
socket.emit('leave-room', {
  roomId: 'room_id'
});
```

### Server → Client Events

#### user-joined
```javascript
socket.on('user-joined', {
  socketId: 'new_user_socket_id',
  userName: 'User Name',
  totalParticipants: 2
});
```

#### existing-users
```javascript
socket.on('existing-users', [
  { socketId: 'id1', userName: 'User 1' },
  { socketId: 'id2', userName: 'User 2' }
]);
```

#### incoming-call
```javascript
socket.on('incoming-call', {
  from: 'caller_socket_id',
  from_name: 'Caller Name',
  offer: {/* RTCSessionDescription */}
});
```

#### call-answered
```javascript
socket.on('call-answered', {
  from: 'answerer_socket_id',
  answer: {/* RTCSessionDescription */}
});
```

#### ice-candidate
```javascript
socket.on('ice-candidate', {
  from: 'peer_socket_id',
  candidate: {/* RTCIceCandidate */}
});
```

#### new-message
```javascript
socket.on('new-message', {
  userName: 'User Name',
  message: 'Message text',
  timestamp: '2026-02-23T...',
  isVoiceTranscribed: false
});
```

#### user-left
```javascript
socket.on('user-left', {
  socketId: 'left_user_socket_id',
  totalParticipants: 1
});
```

## Browser Requirements

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 11+)
- **Mobile**: Supported but recommended on WiFi

### Required Permissions
- Camera access
- Microphone access
- (Optional) Storage for recordings

## Troubleshooting

### Camera/Microphone Not Working
1. Check browser permissions
2. Verify device is not in use by another application
3. Try in a different browser
4. Restart the browser

### Connection Issues
1. Ensure backend server is running on port 5000
2. Check network connectivity
3. Verify Socket.io address in code
4. Check browser console for network errors

### No Sound
1. Ensure microphone is connected
2. Check browser volume settings
3. Verify microphone is selected in browser
4. Test microphone in system settings

### Speech Recognition Not Working
1. Use Chrome, Edge, or Safari
2. Ensure HTTPS connection (or localhost)
3. Grant speech recognition permissions
4. Speak clearly and close to microphone

## Recording Feature

### How Recording Works
- Clicking record button starts recording your local stream
- Recording stops when you click stop button
- Recorded data is stored in browser memory
- You can download or upload the recording

### Recording Data
Recordings are stored as blobs with metadata:
```javascript
{
  roomId: "room_id",
  title: "Recording Title",
  filename: "recording.webm",
  participants: [{userId, userName}],
  startTime: "2026-02-23T...",
  endTime: "2026-02-23T...",
  duration: 300, // seconds
  fileSize: 5242880 // bytes
}
```

## Performance Optimization

### Recommendations
1. **Limit participants** - 4 is recommended maximum
2. **Use WiFi** - Better than cellular for stability
3. **Close other tabs** - Reduces CPU/bandwidth usage
4. **Disable camera** if not needed - Saves bandwidth
5. **Use Chrome** - Best WebRTC support

### Bandwidth Estimates
- 1-to-1 call: 0.5-1 Mbps upload/download
- 3-way call: 1.5-3 Mbps upload/download
- 4-way call: 2-4 Mbps upload/download

## Security Considerations

### Implemented
✅ Authentication required to join
✅ User identification in messages
✅ Room-based access control
✅ Message logging

### Recommendations
- Use HTTPS in production
- Implement rate limiting on API endpoints
- Add user roles/permissions for room management
- Encrypt sensitive data in transit
- Regular security audits

## Future Enhancements

- [ ] Group recording (all participants)
- [ ] Screen sharing
- [ ] File sharing in chat
- [ ] Room scheduling
- [ ] Recording playback/download
- [ ] Chat history persistence
- [ ] User presence indicators
- [ ] Mobile app support
- [ ] End-to-end encryption
- [ ] Room moderation features

## File Summary

### New Backend Files
- `backend/models/VideoRoom.js` - Room schema
- `backend/models/ChatMessage.js` - Chat message schema
- `backend/models/Recording.js` - Recording schema
- `backend/socketHandlers.js` - Socket event handling
- `backend/routes/videoChat.js` - API routes

### New Frontend Files
- `frontend/src/pages/VideoChat.tsx` - Room lobby
- `frontend/src/pages/VideoChat.css` - Lobby styles
- `frontend/src/pages/VideoChatRoom.tsx` - Chat interface
- `frontend/src/pages/VideoChatRoom.css` - Chat styles

### Modified Files
- `backend/server.js` - Added Socket.io setup
- `frontend/src/App.tsx` - Added video chat routes
- `frontend/src/Components/Navbar.tsx` - Added video chat link

## Testing the Feature

### Manual Testing Checklist
- [ ] User can navigate to Video Chat page
- [ ] User must be logged in to join room
- [ ] Can see list of available rooms
- [ ] Can join a room successfully
- [ ] Video stream appears on screen
- [ ] Can toggle microphone on/off
- [ ] Can toggle camera on/off
- [ ] Can send text messages
- [ ] Can use voice recognition
- [ ] Can start/stop recording
- [ ] Multiple users can connect
- [ ] Can hear audio from other participants
- [ ] Can see video from other participants
- [ ] Leaving room works correctly
- [ ] Errors are handled gracefully

## Support & Questions

For issues or questions:
1. Check browser console for error messages
2. Review this documentation
3. Check Socket.io connection status
4. Verify backend server is running
5. Test with different browsers
