# 🏗️ Backend Architecture Overview

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────┐   │
│  │ Navbar   │  │NewsFeed  │  │ News Page    │  │Dashboard │   │
│  │ (Search) │  │(Display) │  │ (Category)   │  │(Profile) │   │
│  └────┬─────┘  └─────┬────┘  └──────┬───────┘  └─────┬────┘   │
│       │              │              │                 │         │
└───────┼──────────────┼──────────────┼─────────────────┼─────────┘
        │              │              │                 │
        └──────────────┼──────────────┼─────────────────┘
                       ▼              ▼                   
        HTTP Requests to Backend API
                       │              │
┌──────────────────────┼──────────────┼──────────────────────┐
│                      ▼              ▼                      │
│              Express.js Backend Server                     │
│                  (server.js)                               │
│                                                            │
│  ┌────────────────────────────────────────────────┐       │
│  │           API Routes & Handlers                │       │
│  │                                                │       │
│  │  GET    /api/news                             │       │
│  │  GET    /api/news/category/:category          │       │
│  │  GET    /api/news/search?q=query              │       │
│  │  GET    /api/news/:id                         │       │
│  │  POST   /api/auth/signup                      │       │
│  │  POST   /api/auth/login                       │       │
│  │  POST   /api/user/comments                    │       │
│  │  GET    /api/discussions                      │       │
│  │  ... (12+ more endpoints)                     │       │
│  └────────────────────────────────────────────────┘       │
│                       │                                    │
│  ┌────────────────────┼────────────────────┐              │
│  │                    ▼                    │              │
│  │  ┌──────────────────────────────────┐  │              │
│  │  │   fetchNewsFromAPI()             │  │              │
│  │  │  - Check cache (30 min)          │  │              │
│  │  │  - If expired → API call         │  │              │
│  │  │  - Transform data                │  │              │
│  │  │  - Cache results                 │  │              │
│  │  └──────────────────────────────────┘  │              │
│  │                    │                    │              │
│  │     ┌──────────────┴──────────────┐    │              │
│  │     ▼                             ▼    │              │
│  │  Cache       newsdata.io API            │              │
│  │  (In-memory)  (External)                │              │
│  │                                        │              │
│  │  ┌──────────────────────────────────┐  │              │
│  │  │  File Operations                 │  │              │
│  │  │  - users.txt (auth)              │  │              │
│  │  │  - comments.txt (discussions)    │  │              │
│  │  │  - /uploads (profile pictures)   │  │              │
│  │  └──────────────────────────────────┘  │              │
│  └────────────────────────────────────────┘              │
│                                                            │
└────────────────────────────────────────────────────────────┘
        ▲              │
        │              │
  Environment    JSON Responses
   Variables     (with error handling)
   (.env file)


```

## API Endpoints Map

### News Management
```
GET /api/news                   → Fetch all news (default limit: all)
GET /api/news?limit=10          → Fetch with limit
GET /api/news/all               → Explicitly get all
GET /api/news/:id               → Get single article
GET /api/news/category/:cat     → Filter by category
GET /api/news/search?q=term     → Search with relevance scoring
GET /api/news/:id/discussions   → Get article comments
```

### User Authentication
```
POST /api/auth/signup                → Create new account
POST /api/auth/login                 → Login user
PUT  /api/auth/update-profile        → Update profile (with image)
GET  /api/user/comments/:userId      → Get user's comments
```

### Comments & Discussions
```
POST   /api/user/comments            → Add comment
DELETE /api/user/comments/:id        → Delete comment
GET    /api/discussions              → Get all discussions
GET    /api/discussions/trending     → Trending discussions
GET    /api/discussions/recent       → Recent discussions
GET    /api/discussions/most-viewed  → Most viewed
GET    /api/discussions/top-replies  → Top replies
```

### Community Features
```
GET /api/trending-topics      → Get trending hashtags
GET /api/community-stats      → Community statistics
GET /api/top-contributors     → Top contributors
```

## Data Flow Diagram

### News Display Flow
```
User Opens App
      │
      ▼
Frontend: GET /api/news?limit=20
      │
      ▼
Backend: Check cache
      │
      ├─ Cache valid? (< 30 min old)
      │  ▼
      │  Return cached data (~100ms)
      │
      └─ Cache expired?
         ▼
         Fetch from newsdata.io API (~1-2s)
         ▼
         Transform API response
         ▼
         Cache the data
         ▼
         Return to frontend
      
      ▼
Frontend: Display news articles
```

### Search Flow
```
User Types "technology" in search
      │
      ▼
Debounce 300ms
      │
      ▼
Frontend: GET /api/news/search?q=technology
      │
      ▼
Backend: 
  1. Get cached news data
  2. Score relevance (title: +3, content: +2, author: +1, category: +1)
  3. Filter by score > 0
  4. Sort by relevance
  5. Return top 20
      │
      ▼
Frontend: Show search results in dropdown
```

### Category Filter Flow
```
User Clicks "Technology" category
      │
      ▼
Frontend: GET /api/news/category/Technology
      │
      ▼
Backend:
  1. Get all cached news
  2. Filter: category == "Technology"
  3. Return filtered list
      │
      ▼
Frontend: Display Technology news
```

## Component Interaction

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Navbar                NewsFeed              News Page  │
│  ├─ Search ────────┐   │                     │          │
│  │ (debounced)    │   │                     │          │
│  └─ Dropdown ◄────┴───┤                     │          │
│                       │ ◄─────────────────┐ │          │
│  AuthModal            │ ◄────────────────┐│ │          │
│  ├─ Login            │                   │││          │
│  └─ Signup           │                   │││          │
│                       │                   │││          │
│                       ▼                   │││          │
│                   Sidebar               ▼▼▼          │
│                   Category Filter     Click Article  │
│                                            │          │
└────────────────────────────────────────────┼──────────┘
                                             │
                        ┌────────────────────┴────────────────┐
                        │                                     │
            ┌───────────▼──────────┐          ┌──────────────▼────┐
            │  News Article View   │          │  Detail Page      │
            │  - Show full article │          │  - Full content   │
            │  - Comments          │          │  - More comments  │
            │  - Share             │          │  - Related         │
            └──────────────────────┘          └───────────────────┘
```

## Cache Management

```
Application Start
      │
      ▼
newsCache = { data: [], timestamp: 0 }
      │
      ▼
First Request → API call → Cache store
      │
      ├─ Subsequent requests (< 30 min)
      │  └─ Return cache (fast)
      │
      ├─ Request after 30 min
      │  └─ Check timestamp
      │     └─ Refresh from API
      │
      └─ API Error
         └─ Fall back to cached data
            └─ If no cache → Use mock data
```

## Error Handling Flow

```
Request arrives at Backend
      │
      ▼
Try {
      │
      ├─ Fetch data
      │
      ├─ If API call fails
      │  └─ Return cached data (if available)
      │
      ├─ If no cache → Return mock data
      │
      └─ If success → Update cache
}
      │
      ▼
Catch {
      └─ Return error response
         ├─ 400: Bad request
         ├─ 401: Unauthorized
         ├─ 404: Not found
         └─ 500: Server error
}
```

## Technology Stack

```
┌─────────────────────────────────────┐
│  Frontend                           │
│  ├─ React 18+                       │
│  ├─ TypeScript                      │
│  ├─ Vite (Build tool)               │
│  └─ React Router (Navigation)       │
└─────────────────────────────────────┘
            │
            │ HTTP/REST
            ▼
┌─────────────────────────────────────┐
│  Backend                            │
│  ├─ Node.js                         │
│  ├─ Express.js 4.18                 │
│  ├─ Axios (HTTP client)             │
│  ├─ CORS middleware                 │
│  ├─ Multer (file upload)            │
│  └─ dotenv (config)                 │
└─────────────────────────────────────┘
            │
            │ HTTP API
            ▼
┌─────────────────────────────────────┐
│  External Services                  │
│  ├─ newsdata.io (News source)       │
│  └─ Image hosting (placeholders)    │
└─────────────────────────────────────┘
            │
            │ File I/O
            ▼
┌─────────────────────────────────────┐
│  Local Storage                      │
│  ├─ users.txt                       │
│  ├─ comments.txt                    │
│  └─ /uploads/ (pictures)            │
└─────────────────────────────────────┘
```

## Performance Characteristics

```
Operation              Time        Why
─────────────────────────────────────────
Fresh API call         1-2s        newsdata.io response
Cached request        ~100ms       In-memory data
Search                ~500ms       Filter + relevance
Category filter       ~200ms       Array filter
Single article         ~50ms       Direct lookup
Auth operations       ~100ms       File I/O
File upload           ~500ms       Disk write
```

## Scalability Notes

### Current Architecture
✅ Single backend server (localhost:5000)
✅ In-memory caching
✅ File-based data storage
✅ Suitable for: Development, small deployments

### For Production Scale
→ Add database (MongoDB/PostgreSQL)
→ Implement JWT authentication
→ Use Redis for distributed caching
→ Add rate limiting
→ Deploy to cloud (AWS/Heroku/Vercel)
→ CDN for static assets
→ Load balancing for multiple servers

---

This architecture provides a solid foundation for a news discussion platform with real-time data integration! 🚀
