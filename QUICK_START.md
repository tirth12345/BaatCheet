# 🚀 QUICK START - Backend Setup

## 3-Step Setup (2 minutes)

### Step 1️⃣: Install Packages
```bash
cd backend
npm install
```

### Step 2️⃣: Verify `.env` File
File should be at: `backend/.env`

Check it contains:
```env
NEWSDATA_API_KEY=pub_508c06f3f33f6aa8d6255fc5e2f3e2a83b2f9
PORT=5000
NODE_ENV=development
```

### Step 3️⃣: Start Backend
```bash
npm run dev
```

**Expected output:**
```
Server running on http://localhost:5000
```

---

## ✅ Test It Works

Open your browser and visit:
```
http://localhost:5000/api/news?limit=5
```

You should see JSON with real news articles!

---

## 🎯 Key Features Now Active

✅ **Real-time News** - From newsdata.io API  
✅ **Search** - Try: `http://localhost:5000/api/news/search?q=technology`  
✅ **Category Filter** - Try: `http://localhost:5000/api/news/category/Business`  
✅ **Smart Cache** - 30-minute intelligent caching  
✅ **Fallback** - Mock data if API is down  

---

## 📱 Frontend Configuration

Update your frontend `.env` file with:
```env
VITE_API_BASE_URL=http://localhost:5000
```

Then start frontend:
```bash
cd frontend/Terminal
npm run dev
```

**Now your frontend will display REAL news!** 🎉

---

## 🧪 Quick Test API Endpoints

```bash
# Get news
curl http://localhost:5000/api/news?limit=10

# Search
curl "http://localhost:5000/api/news/search?q=artificial%20intelligence"

# Category
curl http://localhost:5000/api/news/category/Technology

# Single article
curl http://localhost:5000/api/news/1
```

---

## 📚 Documentation

- **Full API Docs**: See `BACKEND_API_DOCS.md`
- **Setup Guide**: See `BACKEND_SETUP_GUIDE.md`
- **Frontend Guide**: See `FRONTEND_INTEGRATION_GUIDE.md`

---

## 🆘 Troubleshooting

**"Cannot find module axios"**
```bash
npm install axios
```

**Port 5000 already in use**
```bash
PORT=5001 npm run dev
```

**No news showing up**
- Check `.env` file exists with API key
- Refresh page after starting backend
- Check browser console for errors

---

## 📊 What's Included

| Component | Status | Notes |
|-----------|--------|-------|
| newsdata.io API | ✅ Ready | Real news from 150+ sources |
| Search | ✅ Ready | Multi-field search |
| Categories | ✅ Ready | 6+ news categories |
| Caching | ✅ Ready | 30-minute smart cache |
| User Auth | ✅ Works | Signup/login system |
| Comments | ✅ Works | Comments on articles |
| Discussions | ✅ Works | Community discussions |

---

**Your backend is ready! Start it now with `npm run dev` 🎊**
