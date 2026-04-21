# Frontend Integration Guide - News API

## Quick Setup

### 1. Install Dependencies in Backend
```bash
cd backend
npm install
```

### 2. Configure Environment
Create `.env` in backend folder:
```env
NEWSDATA_API_KEY=pub_508c06f3f33f6aa8d6255fc5e2f3e2a83b2f9
PORT=5000
```

### 3. Start Backend Server
```bash
npm run dev
```

### 4. Update Frontend `.env`
In `frontend/Terminal/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

## How to Use in React Components

### Fetch All News
```typescript
import { useEffect, useState } from 'react';

const MyComponent = () => {
    const [news, setNews] = useState([]);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    useEffect(() => {
        const loadNews = async () => {
            const response = await fetch(`${apiBaseUrl}/api/news?limit=10`);
            const data = await response.json();
            setNews(data);
        };
        loadNews();
    }, [apiBaseUrl]);

    return (
        <div>
            {news.map(article => (
                <div key={article.id}>
                    <h3>{article.title}</h3>
                    <p>{article.content}</p>
                    <img src={article.image} alt={article.title} />
                </div>
            ))}
        </div>
    );
};
```

### Search News (Already Implemented in Navbar)
```typescript
const searchNews = async (searchQuery: string) => {
    const response = await fetch(
        `${apiBaseUrl}/api/news/search?q=${encodeURIComponent(searchQuery)}`
    );
    const results: NewsPost[] = await response.json();
    setSearchResults(results);
};
```

### Get News by Category
```typescript
const loadCategoryNews = async (category: string) => {
    const response = await fetch(`${apiBaseUrl}/api/news/category/${category}`);
    const data = await response.json();
    setNews(data);
};
```

## News Data Structure

Each news article has this structure:

```typescript
interface NewsPost {
    id: number;                    // Unique identifier
    title: string;                 // Article title
    content: string;               // Article description/summary
    author: string;                // Source name
    category: string;              // Technology, Business, Sports, etc.
    timestamp: string;             // "2 hours ago" format
    image: string;                 // Article image URL
    upvotes: number;               // Number of upvotes
    comments: number;              // Number of comments
    shares: number;                // Number of shares
    bookmarks: number;             // Number of bookmarks
    views?: number;                // View count
    url?: string;                  // Original article URL
    source?: string;               // News source name
}
```

## Available News Categories

- Technology
- Business
- Sports
- Entertainment
- Politics
- Science
- General

## API Endpoints Summary

### News
```
GET /api/news?limit=10              → Get latest news
GET /api/news/:id                   → Get single article
GET /api/news/category/:category    → Get by category
GET /api/news/search?q=term         → Search news
GET /api/news/:id/discussions       → Get article discussions
```

### User Authentication
```
POST /api/auth/signup               → Create new user
POST /api/auth/login                → Login user
PUT /api/auth/update-profile        → Update profile
```

### Comments
```
GET /api/user/comments/:userId      → Get user comments
POST /api/user/comments             → Add comment
DELETE /api/user/comments/:id       → Delete comment
```

## Real-world Examples

### Example 1: News Feed Component
```typescript
import React, { useEffect, useState } from 'react';

interface NewsPost {
    id: number;
    title: string;
    content: string;
    author: string;
    category: string;
    timestamp: string;
    image: string;
}

const NewsFeed: React.FC = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const [posts, setPosts] = useState<NewsPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/api/news?limit=20`);
                const data = await response.json();
                setPosts(data);
            } catch (error) {
                console.error('Error fetching news:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, [apiBaseUrl]);

    if (isLoading) return <div>Loading...</div>;

    return (
        <div className="news-feed">
            {posts.map(post => (
                <article key={post.id} className="news-post">
                    <img src={post.image} alt={post.title} />
                    <h3>{post.title}</h3>
                    <p>{post.content}</p>
                    <div className="post-meta">
                        <span>{post.author}</span>
                        <span>{post.timestamp}</span>
                        <span className="category">{post.category}</span>
                    </div>
                </article>
            ))}
        </div>
    );
};

export default NewsFeed;
```

### Example 2: Search Component (Navbar)
```typescript
// Already implemented in your Navbar.tsx!
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<NewsPost[]>([]);

useEffect(() => {
    const controller = new AbortController();

    const searchNews = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            const response = await fetch(
                `${apiBaseUrl}/api/news/search?q=${encodeURIComponent(searchQuery)}`,
                { signal: controller.signal }
            );

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error('Search error:', err);
        }
    };

    const debounceTimer = setTimeout(searchNews, 300);
    return () => {
        clearTimeout(debounceTimer);
        controller.abort();
    };
}, [searchQuery, apiBaseUrl]);
```

### Example 3: Category Filter
```typescript
const [selectedCategory, setSelectedCategory] = useState('All');
const [categoryNews, setCategoryNews] = useState<NewsPost[]>([]);

const handleCategoryChange = async (category: string) => {
    setSelectedCategory(category);
    
    if (category === 'All') {
        // Load all news
        const response = await fetch(`${apiBaseUrl}/api/news`);
        const data = await response.json();
        setCategoryNews(data);
    } else {
        // Load category-specific news
        const response = await fetch(
            `${apiBaseUrl}/api/news/category/${category}`
        );
        const data = await response.json();
        setCategoryNews(data);
    }
};
```

## Debugging Tips

### Check if Backend is Running
```bash
# In terminal, test the API
curl http://localhost:5000/api/news?limit=5
```

### Check CORS Issues
- Backend has CORS enabled for all origins
- If you see CORS errors, ensure backend is running on port 5000

### Check API Key
- Verify `.env` file exists in backend folder
- Check API key is valid in newsdata.io dashboard

### Network Tab in DevTools
1. Open DevTools (F12)
2. Go to Network tab
3. Search for calls to `/api/news`
4. Check status code (200 = success, 404 = not found, 500 = server error)

## Performance Optimization

### 1. Limit Results
Always use the `limit` parameter:
```typescript
// Instead of this (loads all news)
fetch(`${apiBaseUrl}/api/news`)

// Do this (loads only 20)
fetch(`${apiBaseUrl}/api/news?limit=20`)
```

### 2. Pagination
Implement pagination for large datasets:
```typescript
const [page, setPage] = useState(1);
const itemsPerPage = 10;

const fetchPaginatedNews = async (pageNum: number) => {
    const start = (pageNum - 1) * itemsPerPage;
    const response = await fetch(`${apiBaseUrl}/api/news?limit=${itemsPerPage}`);
    // Implement offset logic based on your API
};
```

### 3. Caching
The backend caches news for 30 minutes, so:
- First request: 1-2 seconds
- Subsequent requests (within 30 min): ~100ms

### 4. Search Optimization
- Search is debounced at 300ms (already in your code!)
- Results limited to top 20 matches
- Sorted by relevance

## Troubleshooting

### "Cannot GET /api/news"
- Backend is not running
- Fix: Run `npm run dev` in backend folder

### Empty search results
- Search query might not match any articles
- Try different keywords
- Make sure news data is loaded first

### Images not loading
- Image URLs from newsdata.io might be broken
- Set fallback image in your component:
```typescript
<img 
    src={post.image} 
    alt={post.title}
    onError={(e) => {
        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=News';
    }}
/>
```

### Slow performance
- Check network tab in DevTools
- Use limit parameter to load fewer items
- Implement pagination
- Consider loading only what's visible (lazy loading)

## What's Working

✅ Real-time news from newsdata.io  
✅ Search with multi-field matching  
✅ Category filtering  
✅ Intelligent caching  
✅ User authentication  
✅ Comments system  
✅ Profile management  

## Next Steps

1. ✅ Backend is ready with newsdata.io integration
2. ✅ Search functionality is implemented
3. ✅ API routes are documented
4. Customize UI components as needed
5. Add more features (bookmarks, filters, etc.)

---

Need help? Check `BACKEND_API_DOCS.md` for complete API documentation.
