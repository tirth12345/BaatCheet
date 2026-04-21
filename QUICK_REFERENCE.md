# 🎯 QUICK REFERENCE - Command Checklist

## One-Page Cheatsheet for Backend Setup

---

## 📋 SETUP (Do This First)

```bash
# 1. Install dependencies
cd backend
npm install

# 2. Start backend server
npm run dev

# Expected: "Server running on http://localhost:5000"
```

---

## ✅ QUICK TESTS (Verify It Works)

```bash
# Test 1: Get all news
curl http://localhost:5000/api/news?limit=3

# Test 2: Search
curl "http://localhost:5000/api/news/search?q=technology"

# Test 3: Category
curl http://localhost:5000/api/news/category/Business

# Test 4: Single article
curl http://localhost:5000/api/news/1
```

Expected: JSON responses with real news data ✅

---

## 🌐 FRONTEND SETUP

```bash
# Update this file
frontend/Terminal/.env

# Add this line:
VITE_API_BASE_URL=http://localhost:5000

# Then start frontend
cd frontend/Terminal
npm run dev

# Should see real news on homepage ✅
```

---

## 📚 DOCUMENTATION FILES (Read In This Order)

```
1. QUICK_START.md                    ← 3-step quick start
2. SETUP_CHECKLIST.md                ← Verify everything works
3. README_BACKEND.md                 ← Backend overview
4. ARCHITECTURE.md                   ← How it all connects
5. BACKEND_API_DOCS.md               ← API reference
6. FRONTEND_INTEGRATION_GUIDE.md      ← React examples
```

---

## 🔧 COMMON COMMANDS

```bash
# Start backend (development)
npm run dev

# Start backend (production)
npm start

# Install packages
npm install

# Use different port
PORT=5001 npm run dev

# Stop server
Ctrl+C

# Check if port is available
lsof -i :5000  (Mac/Linux)
netstat -ano | findstr :5000  (Windows)
```

---

## 🆘 TROUBLESHOOTING QUICK REFERENCE

```bash
# Can't find module 'axios'
npm install axios dotenv

# Port 5000 already in use
PORT=5001 npm run dev

# Can't connect to backend
- Verify backend is running
- Check port is 5000
- Check firewall settings
- Try: curl http://localhost:5000/api/news

# No news showing
- Check .env file has API key
- Check backend console for errors
- Refresh browser page
- Check frontend .env has correct URL
```

---

## 📊 API ENDPOINTS (Copy-Paste Ready)

### News
```
http://localhost:5000/api/news?limit=10
http://localhost:5000/api/news/1
http://localhost:5000/api/news/category/Technology
http://localhost:5000/api/news/search?q=ai
http://localhost:5000/api/news/1/discussions
```

### Auth
```
http://localhost:5000/api/auth/signup           [POST]
http://localhost:5000/api/auth/login            [POST]
http://localhost:5000/api/auth/update-profile   [PUT]
```

### Comments
```
http://localhost:5000/api/user/comments         [POST]
http://localhost:5000/api/user/comments/1       [DELETE]
http://localhost:5000/api/user/comments/user123 [GET]
```

### Community
```
http://localhost:5000/api/discussions
http://localhost:5000/api/discussions/trending
http://localhost:5000/api/trending-topics
http://localhost:5000/api/community-stats
http://localhost:5000/api/top-contributors
```

---

## 🎯 DAILY WORKFLOW

### Morning - Start Development
```bash
# Navigate to backend
cd backend

# Start server
npm run dev

# In another terminal, start frontend
cd frontend/Terminal
npm run dev

# Open http://localhost:5173
```

### During Development
```bash
# Test API changes
curl http://localhost:5000/api/...

# Check server logs
Watch the terminal running "npm run dev"

# Reload browser
Ctrl+R or Cmd+R
```

### When Done
```bash
# Stop server
Ctrl+C (in terminal)

# Stop frontend
Ctrl+C (in terminal)
```

---

## 📁 KEY FILES REFERENCE

```
backend/
├── .env                      ← API key here
├── server.js                 ← All routes/logic
├── package.json              ← Dependencies
└── data/
    ├── users.txt            ← User data
    └── comments.txt         ← Comments data

frontend/Terminal/
├── .env                      ← Set VITE_API_BASE_URL
└── src/
    ├── Components/Navbar.tsx        ← Search
    ├── Components/NewsFeed.tsx      ← News display
    └── pages/News.tsx               ← News page
```

---

## 🔐 SECURITY CHECKLIST

- [ ] .env file created with API key
- [ ] .gitignore includes .env
- [ ] No API key in code
- [ ] No secrets in GitHub
- [ ] frontend .env has correct URL
- [ ] Backend running locally only
- [ ] No passwords in logs

---

## ✨ FEATURES WORKING

- [x] Real-time news from newsdata.io
- [x] Search with relevance ranking
- [x] Category filtering
- [x] User authentication
- [x] Comments system
- [x] Intelligent 30-min caching
- [x] Graceful error handling
- [x] Fallback to mock data
- [x] File uploads
- [x] Community features

---

## 📞 HELP RESOURCES

**Setup Issues?**
→ QUICK_START.md or SETUP_CHECKLIST.md

**API Questions?**
→ BACKEND_API_DOCS.md

**React Integration?**
→ FRONTEND_INTEGRATION_GUIDE.md

**System Design?**
→ ARCHITECTURE.md

**Detailed Guide?**
→ BACKEND_SETUP_GUIDE.md

---

## 🚀 SUCCESS CHECKLIST

Before considering it done:

- [ ] npm install completed
- [ ] Backend starts: `npm run dev`
- [ ] Frontend .env updated
- [ ] Frontend starts
- [ ] Real news displays
- [ ] Search works
- [ ] Categories filter
- [ ] No console errors
- [ ] curl tests pass
- [ ] Documentation read

---

## 💡 PRO TIPS

1. **Keep Terminal Open** - Leave `npm run dev` running
2. **Use DevTools** - Check Network tab for API calls
3. **Check Logs** - Backend console shows what's happening
4. **Test API First** - Use curl before testing frontend
5. **Read Docs** - Everything is documented
6. **Ask Chat** - AI can help with specific questions

---

## 🎊 YOU'RE READY!

```bash
cd backend && npm install && npm run dev
```

Then in another terminal:
```bash
cd frontend/Terminal && npm run dev
```

Visit http://localhost:5173 and see real news! 🎉

---

**Bookmark this file for quick reference!**
**Print it and keep by your desk!**

---

Last Updated: January 30, 2026  
Status: ✅ READY TO USE  
Version: 1.0 Complete
