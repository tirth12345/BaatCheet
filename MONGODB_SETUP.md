# MongoDB Integration Setup Guide

## 📦 MongoDB Installation

### Option 1: Local MongoDB (Windows)

1. **Download MongoDB Community Edition**
   - Visit: https://www.mongodb.com/try/download/community
   - Select your Windows version (64-bit recommended)
   - Download the installer (.msi file)

2. **Install MongoDB**
   - Run the installer
   - Choose "Complete" install
   - During setup, check "Install MongoDB as a Service"
   - For "Service Configuration":
     - **Recommended**: Select **"Run the MongoDB service as Network Service user"**
     - This provides network access while maintaining security isolation
     - For local development on your machine, this is the best choice
   - MongoDB will start automatically

3. **Verify Installation**
   ```bash
   mongod --version
   ```

4. **Start MongoDB Service** (if not running)
   ```bash
   # Windows Services (search for "Services" in Windows)
   # Or via terminal:
   net start MongoDB
   ```

---

### Service User Options Explained

| User Type | Security | Local Dev | Production | Notes |
|-----------|----------|-----------|------------|-------|
| **Network Service** | ⭐⭐⭐ High | ✅ Recommended | ✅ Good | Best for local dev & production |
| **Local Service** | ⭐⭐ Medium | ✅ Works | ⚠️ Limited | Less network access |
| **Local System** | ⭐ Low | ✅ Works | ❌ Not Safe | Full system privileges - risky |

**For Your Setup (Local Development):** Use **Network Service** ← Best choice

---

### Option 2: MongoDB Atlas (Cloud - Recommended for Production)

1. **Create a free account**: https://www.mongodb.com/cloud/atlas
2. **Create a cluster**
3. **Update `.env` with your connection string**:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/baatcheet
   ```

---

## ✅ Verify MongoDB Connection

### Test 1: Check MongoDB is Running
```bash
# Open a new terminal and run:
mongo
# Or (newer MongoDB versions):
mongosh
```

You should see a MongoDB prompt. Type `exit` to quit.

### Test 2: Start Backend Server
```bash
cd backend
npm run dev
```

You should see:
```
MongoDB connected successfully
Server running on http://localhost:5001
```

---

## 🗄️ Database Structure

The MongoDB database `baatcheet` has these collections:

### Users Collection
```javascript
{
  _id: ObjectId,
  username: String (unique),
  email: String (unique),
  password: String (hashed with bcryptjs),
  phone: String,
  profilePicture: String,
  createdAt: Date
}
```

### Comments Collection
```javascript
{
  _id: ObjectId,
  userId: String,
  newsId: Number,
  newsTitle: String,
  comment: String,
  timestamp: Date
}
```

### Discussions Collection
```javascript
{
  _id: ObjectId,
  id: Number (unique),
  title: String,
  category: String,
  author: String,
  content: String,
  createdAt: Date,
  userId: String,
  replies: [{
    id: Number,
    author: String,
    content: String,
    createdAt: Date,
    userId: String,
    likes: Number
  }],
  views: Number,
  likes: Number
}
```

### NewsStats Collection
```javascript
{
  _id: ObjectId,
  newsId: Number (unique),
  upvotes: Number,
  comments: Number,
  shares: Number,
  views: Number,
  createdAt: Date
}
```

---

## 🧪 Test API Endpoints

Once server is running, test these:

```bash
# Get all news
curl http://localhost:5001/api/news?limit=3

# Create a user
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Create discussion
curl -X POST http://localhost:5001/api/discussions \
  -H "Content-Type: application/json" \
  -d '{"title":"Great News!","category":"Technology","content":"This is amazing","author":"testuser","userId":"USER_ID"}'
```

---

## 🔐 Security Notes

✅ **What's Now Secure:**
- Passwords are hashed with bcryptjs (not stored in plain text)
- Unique email/username enforcement
- Data persists in MongoDB (not lost on server restart)

⚠️ **For Production:**
- Use MongoDB Atlas with SSL/TLS
- Implement JWT tokens for auth
- Add rate limiting
- Use environment variables for sensitive data
- Enable MongoDB authentication

---

## 📝 Migration from File-Based Storage

All previous data in `data/users.txt`, `data/comments.txt`, and `data/discussions.json` should be:

1. **Manually migrated** to MongoDB if needed
2. Or **archived** for backup
3. **Deleted** once verified in MongoDB (optional)

The application now only uses MongoDB for persistence.

---

## 🐛 Troubleshooting

### "MongoDB connection error"
- Ensure MongoDB is running: `net start MongoDB`
- Check `MONGODB_URI` in `.env`
- Verify `localhost:27017` is accessible

### "Cannot find module 'mongoose'"
- Run: `npm install` in backend folder
- Verify `node_modules/mongoose` exists

### "Password authentication failed"
- If using MongoDB Atlas, check username/password in connection string
- Whitelist your IP address in Atlas

---

## ✨ Next Steps

1. Install and start MongoDB
2. Start backend: `npm run dev`
3. Test endpoints (curl commands above)
4. Verify data persists after restart
5. Frontend still works without changes (API is same)

**Questions?** Check server logs or MongoDB Atlas dashboard.
