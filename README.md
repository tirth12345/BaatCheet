# BaatCheet 🗣️

> A next-gen news discussion platform with real-time video chat, discussions, and a live news feed.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Node.js + Express + Socket.IO |
| Database | MongoDB (Atlas) |
| Real-time | WebRTC + Socket.IO |
| Auth | OTP-based email verification |

## Project Structure

```
BaatCheet/
├── backend/          # Express API + Socket.IO server
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes
│   ├── utils/        # Email service, helpers
│   └── server.js     # App entry point
└── frontend/
    └── Terminal/     # React + Vite app
        └── src/
```

## Local Development

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Backend
```bash
cd backend
cp .env.example .env    # fill in your values
npm install
npm run dev             # runs on http://localhost:5001
```

### Frontend
```bash
cd frontend/Terminal
cp .env.example .env    # fill in VITE_API_BASE_URL
npm install
npm run dev             # runs on http://localhost:5173
```

## Deployment

| Service | Purpose | Config |
|---|---|---|
| **MongoDB Atlas** | Database | M0 Free Cluster |
| **Render** | Backend API | Root: `backend/` |
| **Vercel** | Frontend | Root: `frontend/Terminal/` |

## Environment Variables

See `backend/.env.example` and `frontend/Terminal/.env.example` for all required variables.

## Features

- 📰 Live news feed (newsdata.io API)
- 💬 Threaded discussions per article
- 🎥 Video chat rooms (WebRTC)
- 🔐 OTP-based authentication
- 📊 News stats (upvotes, shares, views)
- 📱 Mobile responsive
