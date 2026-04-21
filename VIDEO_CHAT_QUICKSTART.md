# Video Chat - Quick Start Guide

## Prerequisites Installed
- ✅ Backend: Socket.io, simple-peer
- ✅ Frontend: socket.io-client, simple-peer, @types/simple-peer
- ✅ Database Models: VideoRoom, ChatMessage, Recording
- ✅ Socket handlers and API routes configured

## 5-Minute Setup

### Step 1: Start the Backend Server
```bash
cd backend
npm start
# Server will run on http://localhost:5000
```

### Step 2: Initialize Video Rooms
In another terminal, run:
```bash
curl -X POST http://localhost:5000/api/video-chat/initialize-rooms
```

You should see:
```json
[
  { "_id": "...", "name": "General Chat", ... },
  { "_id": "...", "name": "Tech Talk", ... },
  { "_id": "...", "name": "News Discussion", ... },
  { "_id": "...", "name": "Community Hub", ... }
]
```

### Step 3: Start the Frontend
In another terminal:
```bash
cd frontend/Terminal
npm run dev
# Frontend runs on http://localhost:3000 (or shown in terminal)
```

### Step 4: Test the Feature
1. Open browser at `http://localhost:3000`
2. Click **Video Chat** in navbar
3. If not logged in, it will redirect to home
4. Login/Signup first
5. Go back to Video Chat
6. See available rooms and click "Join Room"
7. Grant camera/microphone permissions
8. Start a video call!

## Testing with Multiple Users

### Option 1: Multiple Browser Windows
1. Open 2-4 browser windows to `http://localhost:3000`
2. Login with different accounts in each
3. Navigate to Video Chat
4. Each user joins the same room
5. They will see each other's videos

### Option 2: Multiple Devices on Same Network
1. Get your computer's IP address: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. On another device, navigate to `http://<your-ip>:3000`
3. Login and join same room
4. All devices will show video streams

## Verify Everything Works

### Checklist
- [ ] Backend server running (check port 5000)
- [ ] MongoDB connected to backend
- [ ] Video rooms initialized (4 rooms created)
- [ ] Frontend server running
- [ ] Can navigate to /video-chat page
- [ ] Requires login to access
- [ ] Can see room list
- [ ] Can click Join Room
- [ ] Camera/mic permissions work
- [ ] Video displays on screen
- [ ] Chat works
- [ ] Voice recognition works

## Common Issues

### "Cannot find module 'socket.io'"
Make sure you ran: `npm install socket.io simple-peer` in backend

### "Cannot find module 'socket.io-client'"
Make sure you ran: `npm install socket.io-client simple-peer` in frontend

### Socket connection fails
- Check backend is running on port 5000
- Check SOCKET_SERVER URL in VideoChatRoom.tsx matches your backend
- Check browser console for network errors

### No camera/microphone
- Check browser permissions (allow camera/mic)
- Check device is not in use by another app
- Try incognito/private window mode

### No rooms showing
- Did you run the initialize-rooms endpoint?
- Check MongoDB is connected
- Check backend console for errors

## Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/baatcheet
PORT=5000
CLIENT_URL=http://localhost:3000
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000
```

## File Structure - What Was Added

```
backend/
├── models/
│   ├── VideoRoom.js          [NEW]
│   ├── ChatMessage.js         [NEW]
│   └── Recording.js           [NEW]
├── routes/
│   └── videoChat.js           [NEW]
├── socketHandlers.js          [NEW]
└── server.js                  [MODIFIED - added Socket.io]

frontend/Terminal/src/
├── pages/
│   ├── VideoChat.tsx          [NEW]
│   ├── VideoChat.css          [NEW]
│   ├── VideoChatRoom.tsx      [NEW]
│   └── VideoChatRoom.css      [NEW]
├── Components/
│   └── Navbar.tsx             [MODIFIED - added Video Chat link]
└── App.tsx                    [MODIFIED - added routes]
```

## Features Available

### Video Controls
- Toggle microphone on/off
- Toggle camera on/off
- Start/stop recording

### Chat Features
- Text messaging in video room
- Voice-to-text transcription
- Message history
- Voice messages badge

### Room Management
- Pre-created rooms
- Room list display
- Max participant limit
- Active/inactive status

## Next Steps

1. **Customize Rooms** - Edit room names/descriptions:
   ```javascript
   // In backend/routes/videoChat.js
   // Modify the defaultRooms array
   ```

2. **Add Recording Download** - Let users download recorded videos

3. **Implement Chat History** - Persist and display old messages

4. **Add Notifications** - Alert when new user joins

5. **Screen Sharing** - Add screen share capability

6. **Advance Permissions** - Implement user roles

## Support

See full documentation in `VIDEO_CHAT_GUIDE.md` for:
- Detailed API endpoints
- Socket.io events reference
- Browser requirements
- Performance optimization
- Security recommendations
- Troubleshooting guide
