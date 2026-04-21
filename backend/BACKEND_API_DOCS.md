# Backend API - BaatCheet News Platform

This backend server provides REST API endpoints for the BaatCheet news discussion platform, integrated with the **newsdata.io** API for fetching real-time news articles.

## Features

✅ **Real-time News Fetching** - Integrates with newsdata.io API  
✅ **Smart Search** - Search news by title, content, author, or category with relevance scoring  
✅ **Category Filtering** - Get news articles by specific categories  
✅ **Intelligent Caching** - 30-minute cache to minimize API calls  
✅ **User Authentication** - Signup/Login with profile management  
✅ **Comments System** - Users can comment on news articles  
✅ **File Uploads** - Profile picture uploads with multer  

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create a `.env` file in the backend directory:

```env
# newsdata.io API Key
NEWSDATA_API_KEY=pub_508c06f3f33f6aa8d6255fc5e2f3e2a83b2f9

# Server Port
PORT=5000
NODE_ENV=development
```

> **Note**: Get your free API key from [newsdata.io](https://newsdata.io/)

### 3. Start the Server

**Development mode (with hot reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will be available at: `http://localhost:5000`

## API Endpoints

### News Endpoints

#### Get All News
```
GET /api/news?limit=10
```
- **Query Parameters:**
  - `limit` (optional): Number of articles to return (default: all)
- **Response:** Array of news articles

#### Get News by Category
```
GET /api/news/category/:category?limit=10
```
- **Parameters:**
  - `category`: Article category (e.g., Technology, Business, Sports, Entertainment, Politics, Science)
- **Query Parameters:**
  - `limit` (optional): Number of articles to return
- **Response:** Array of filtered articles

#### Search News
```
GET /api/news/search?q=search_term
```
- **Query Parameters:**
  - `q` (required): Search query string
- **Features:**
  - Searches across title, content, author, and category
  - Relevance scoring for better results
  - Returns top 20 matching results
- **Response:** Array of searched articles sorted by relevance

#### Get Single Article
```
GET /api/news/:id
```
- **Parameters:**
  - `id`: Article ID
- **Response:** Single article object

#### Get Article Discussions/Comments
```
GET /api/news/:id/discussions
```
- **Parameters:**
  - `id`: Article ID
- **Response:** Array of comments for the article

### Authentication Endpoints

#### User Signup
```
POST /api/auth/signup
```
- **Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1-555-0123"
}
```
- **Response:** User object (password excluded)

#### User Login
```
POST /api/auth/login
```
- **Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
- **Response:** User object

#### Update Profile
```
PUT /api/auth/update-profile
```
- **Headers:** `Content-Type: multipart/form-data`
- **Body:**
  - `userData`: JSON string with user data
  - `profilePicture` (optional): Image file
- **Response:** Updated user object

### Comments Endpoints

#### Get User Comments
```
GET /api/user/comments/:userId
```
- **Parameters:**
  - `userId`: User ID
- **Response:** Array of user's comments

#### Add Comment
```
POST /api/user/comments
```
- **Body:**
```json
{
  "userId": "user_id",
  "newsId": 1,
  "newsTitle": "Article Title",
  "comment": "User's comment text"
}
```
- **Response:** Created comment object

#### Delete Comment
```
DELETE /api/user/comments/:commentId
```
- **Parameters:**
  - `commentId`: Comment ID
- **Body:**
```json
{
  "userId": "user_id"
}
```
- **Response:** Success message

### Community Endpoints

#### Get Trending Topics
```
GET /api/trending-topics
```
- **Response:** Array of trending hashtags

#### Get Community Stats
```
GET /api/community-stats
```
- **Response:** Community statistics

#### Get Top Contributors
```
GET /api/top-contributors
```
- **Response:** Array of top contributors

#### Get Discussions
```
GET /api/discussions
GET /api/discussions/trending?limit=5
GET /api/discussions/recent
GET /api/discussions/most-viewed
GET /api/discussions/top-replies
```
- **Response:** Array of discussion threads

## News Data Structure

Each article returned includes:

```javascript
{
  id: 1,
  title: "Article Title",
  content: "Article description/content",
  author: "Source Name",
  category: "Technology",      // Technology, Business, Sports, Entertainment, Politics, Science, General
  timestamp: "2 hours ago",
  image: "https://image-url.com/image.jpg",
  upvotes: 234,
  comments: 45,
  shares: 89,
  bookmarks: 12,
  views: 1200,
  url: "https://original-article-url.com",
  source: "Source Name"
}
```

## Frontend Integration

### Environment Setup

Add to your frontend `.env` or `.env.local`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

### Example Usage - Fetch News

```typescript
// Fetch all news
const response = await fetch('http://localhost:5000/api/news?limit=10');
const news = await response.json();

// Search news
const searchResponse = await fetch(
  `http://localhost:5000/api/news/search?q=${searchTerm}`
);
const results = await searchResponse.json();

// Get news by category
const categoryResponse = await fetch(
  `http://localhost:5000/api/news/category/Technology`
);
const categoryNews = await categoryResponse.json();
```

## Caching Strategy

The API implements intelligent caching:
- **Cache Duration**: 30 minutes
- **Auto-Update**: Cache refreshes automatically after 30 minutes
- **Benefit**: Reduces API calls to newsdata.io and improves response times
- **Fallback**: If API fails, falls back to cached data or mock news

## Error Handling

All endpoints include error handling:
- **400**: Bad request (missing parameters)
- **401**: Unauthorized (authentication failed)
- **403**: Forbidden (permission denied)
- **404**: Not found (resource doesn't exist)
- **500**: Server error (API failure with fallback)

## Troubleshooting

### News not showing up
1. Check API key in `.env` file
2. Verify newsdata.io API key is valid and has quota
3. Check server logs for API errors
4. The app will fall back to mock data if API fails

### Search not working
- Ensure query parameter `q` is provided
- Check search query is not empty
- Search is case-insensitive

### CORS errors
- The server has CORS enabled for all origins
- If issues persist, verify `cors` middleware is properly configured

## File Structure

```
backend/
├── server.js              # Main server file with all routes
├── package.json           # Dependencies
├── .env                   # Environment variables
├── .gitignore            # Git ignore rules
├── data/                 # Data directory
│   ├── users.txt        # User data storage
│   └── comments.txt     # Comments storage
└── uploads/             # User uploads directory
```

## Performance Tips

1. **Use Pagination**: Always use `limit` parameter for large datasets
2. **Search Efficiently**: Use specific search terms for better results
3. **Category Filtering**: Filter by category before rendering to reduce data load
4. **Cache**: The 30-minute cache significantly reduces API calls

## API Key Security

⚠️ **Important**: The API key in `.env` is exposed in the frontend environment. For production:
1. Never commit `.env` to version control
2. Use server-side proxying for API calls
3. Implement rate limiting
4. Use separate API keys for different environments

## Dependencies

- **express**: Web framework
- **axios**: HTTP client for API calls
- **cors**: Cross-Origin Resource Sharing
- **multer**: File upload handling
- **dotenv**: Environment variable management

## Future Enhancements

- [ ] User authentication tokens (JWT)
- [ ] Advanced filtering and sorting
- [ ] User preferences and bookmarks
- [ ] Comment threading
- [ ] Real-time updates with WebSocket
- [ ] Analytics and statistics
- [ ] Rate limiting
- [ ] Database integration (MongoDB/PostgreSQL)

## Support

For newsdata.io API documentation, visit: https://newsdata.io/docs/
