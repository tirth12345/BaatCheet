# News Archiving System

## Overview
The news system now keeps all news articles in the database instead of discarding old ones. News articles are automatically archived after 7 days but remain accessible in the database and can be viewed on the website.

## Features

### 1. Persistent News Storage
- All fetched news articles are saved to MongoDB
- News is never deleted, only archived
- New news is added incrementally (accumulates over time)

### 2. Automatic Archiving
- News older than 7 days is automatically marked as archived
- Auto-archive runs on server startup and every 24 hours
- Archived news is hidden by default but can be viewed

### 3. API Endpoints

#### Get Current News (Non-Archived)
```
GET /api/news
GET /api/news/all
```

#### Get All News (Including Archived)
```
GET /api/news/all?includeArchived=true
GET /api/news?includeArchived=true
```

#### Get Archived News Only
```
GET /api/news/archived
GET /api/news/archived?limit=50
```

#### Archive a News Article
```
POST /api/news/:id/archive
```

#### Unarchive a News Article
```
POST /api/news/:id/unarchive
```

#### Get News by Category
```
GET /api/news/category/:category
GET /api/news/category/:category?includeArchived=true
```

### 4. Frontend Integration

The News page now includes a toggle button to show/hide archived news:
- Default view: Shows only current (non-archived) news
- Click "📰 Current News Only" to toggle
- When active: Shows "📦 Showing All News" and displays all news including archived

### 5. Database Schema

#### News Model
```javascript
{
  newsId: Number,          // Unique identifier
  title: String,           // Article title
  content: String,         // Article content
  author: String,          // Author/source
  category: String,        // Category (Technology, Politics, etc.)
  timestamp: String,       // Human-readable timestamp
  image: String,           // Image URL
  url: String,             // Original article URL
  source: String,          // News source
  pubDate: String,         // Original publication date
  fetchedAt: Date,         // When article was fetched (indexed)
  isArchived: Boolean,     // Archive status (indexed)
  createdAt: Date,         // MongoDB timestamp
  updatedAt: Date          // MongoDB timestamp
}
```

## Configuration

### Archive Settings
You can customize the archive behavior by modifying these settings in `server.js`:

```javascript
// Archive news older than X days
const ARCHIVE_AGE_DAYS = 7; // Default: 7 days

// Auto-archive interval
const ARCHIVE_INTERVAL = 24 * 60 * 60 * 1000; // Default: 24 hours
```

### API Fetch Interval
Control how often new news is fetched from the API:

```javascript
const API_FETCH_INTERVAL = 30 * 60 * 1000; // Default: 30 minutes
```

## How It Works

1. **News Fetching**: Every 30 minutes, the server fetches fresh news from the newsdata.io API
2. **Deduplication**: Before saving, the system checks if an article already exists (based on newsId)
3. **Accumulation**: Only new articles are added; existing ones are skipped
4. **Auto-Archiving**: Every 24 hours, articles older than 7 days are marked as archived
5. **Display**: Frontend can choose to show current news only or include archived news

## Benefits

✅ **Historical Data**: Keep a complete history of all news articles
✅ **Performance**: Archived news doesn't clutter the main feed
✅ **Flexibility**: Users can view old news when needed
✅ **Storage Efficient**: Uses MongoDB indexing for fast queries
✅ **No Data Loss**: Nothing is ever deleted

## Usage Examples

### View Current News
Navigate to `/news` - default view shows only current news

### View All News (Including Archived)
Click the toggle button "📰 Current News Only" to switch to "📦 Showing All News"

### Manually Archive News
```javascript
fetch('http://localhost:5000/api/news/123/archive', { method: 'POST' })
```

### Search Archived News
The search functionality automatically searches all news including archived articles when the toggle is active.

## Migration

If you have an existing database, all news will be automatically marked as non-archived (`isArchived: false`) by default. The auto-archive function will run on the next server start and mark old articles appropriately.
