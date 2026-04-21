const express = require('express');
const PDFDocument = require('pdfkit');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Comment = require('./models/Comment');
const Discussion = require('./models/Discussion');
const NewsStats = require('./models/NewsStats');
const News = require('./models/News');
const VideoRoom = require('./models/VideoRoom');
const ChatMessage = require('./models/ChatMessage');
const Recording = require('./models/Recording');
const Otp = require('./models/Otp');
const { sendOtpEmail } = require('./utils/emailService');

// Import socket handlers
const setupSocketHandlers = require('./socketHandlers');

const app = express();

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/baatcheet';
mongoose.connect(MONGODB_URI)
.then(async () => {
        console.log('MongoDB connected successfully');
        await migrateUsersFromFile();
})
.catch(err => console.error('MongoDB connection error:', err));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// CORS - allow frontend origins (localhost for dev, Vercel URL for production)
const allowedOrigins = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000']
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import video chat routes
const videoChatRoutes = require('./routes/videoChat');
app.use('/api/video-chat', videoChatRoutes);

// newsdata.io API Configuration
const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY || 'pub_508c06f3f33f6aa8d6255fc5e2f3e2a83b2f9';
const NEWSDATA_API_URL = 'https://newsdata.io/api/1/news';

// Cache for news data (still used for performance, but backed by database)
let newsCache = {
    data: [],
    timestamp: 0,
    cacheValidDuration: 30 * 60 * 1000 // 30 minutes cache
};

// Track last API fetch time
let lastApiFetch = 0;
const API_FETCH_INTERVAL = 30 * 60 * 1000; // Fetch new news every 30 minutes

// In-memory stats for user interactions (using MongoDB for persistence)
const newsStats = new Map();

function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
        hash = ((hash << 5) - hash) + value.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
}

function getStableNewsId(article) {
    const key = article.link || `${article.title}-${article.pubDate}`;
    return hashString(key || `${article.title}-${Date.now()}`);
}

async function getOrInitStats(id) {
    // Use findOneAndUpdate with upsert to prevent race conditions
    const stats = await NewsStats.findOneAndUpdate(
        { newsId: id },
        { $setOnInsert: { newsId: id } },
        { upsert: true, new: true }
    );
    return stats;
}

async function updateStats(id, delta) {
    // Use atomic update to prevent race conditions
    const update = { $setOnInsert: { newsId: id } };
    
    if (delta.upvotes) {
        update.$inc = update.$inc || {};
        update.$inc.upvotes = delta.upvotes;
    }
    if (delta.comments) {
        update.$inc = update.$inc || {};
        update.$inc.comments = delta.comments;
    }
    if (delta.shares) {
        update.$inc = update.$inc || {};
        update.$inc.shares = delta.shares;
    }
    if (delta.views) {
        update.$inc = update.$inc || {};
        update.$inc.views = delta.views;
    }

    const stats = await NewsStats.findOneAndUpdate(
        { newsId: id },
        update,
        { upsert: true, new: true }
    );
    return stats;
}

async function syncStatsToCache(id) {
    const stats = await NewsStats.findOne({ newsId: id });
    if (!stats) {
        return;
    }
    
    // Update cache if present
    if (newsCache.data && newsCache.data.length) {
        const index = newsCache.data.findIndex(item => item.id === id);
        if (index !== -1) {
            newsCache.data[index] = {
                ...newsCache.data[index],
                upvotes: stats.upvotes,
                comments: stats.comments,
                shares: stats.shares,
                views: stats.views
            };
        }
    }
}

// Save news articles to database
async function saveNewsToDatabase(newsArticles) {
    try {
        const savedNews = [];
        for (const article of newsArticles) {
            // Use findOneAndUpdate with upsert to prevent race conditions
            const newsDoc = await News.findOneAndUpdate(
                { newsId: article.id },
                {
                    $setOnInsert: {
                        newsId: article.id,
                        title: article.title,
                        content: article.content,
                        author: article.author,
                        category: article.category,
                        timestamp: article.timestamp,
                        image: article.image,
                        url: article.url,
                        source: article.source,
                        pubDate: article.pubDate || new Date().toISOString(),
                        fetchedAt: new Date()
                    }
                },
                { upsert: true, new: true }
            );
            savedNews.push(newsDoc);
            console.log(`Saved/updated article: ${article.title}`);
        }
        return savedNews;
    } catch (error) {
        console.error('Error saving news to database:', error);
        return [];
    }
}

// Get news from database with stats
async function getNewsFromDatabase(options = {}) {
    try {
        const { 
            limit = 0, 
            category = null, 
            includeArchived = false,
            sortBy = '-fetchedAt' // Default: newest first
        } = options;

        const query = includeArchived ? {} : { isArchived: false };
        if (category) {
            query.category = new RegExp(`^${category}$`, 'i');
        }

        let newsQuery = News.find(query).sort(sortBy);
        if (limit > 0) {
            newsQuery = newsQuery.limit(limit);
        }

        const newsArticles = await newsQuery;
        
        // Attach stats to each article
        const newsWithStats = await Promise.all(newsArticles.map(async (article) => {
            const stats = await getOrInitStats(article.newsId);
            return {
                id: article.newsId,
                title: article.title,
                content: article.content,
                author: article.author,
                category: article.category,
                timestamp: article.timestamp,
                image: article.image,
                url: article.url,
                source: article.source,
                upvotes: stats.upvotes,
                comments: stats.comments,
                shares: stats.shares,
                views: stats.views,
                bookmarks: Math.floor(Math.random() * 50),
                fetchedAt: article.fetchedAt,
                isArchived: article.isArchived
            };
        }));

        return newsWithStats;
    } catch (error) {
        console.error('Error getting news from database:', error);
        return [];
    }
}

// Function to fetch news from newsdata.io API
async function fetchNewsFromAPI(params = {}) {
    try {
        // Check if we should fetch new news from API
        const shouldFetchFromAPI = Date.now() - lastApiFetch > API_FETCH_INTERVAL;
        
        if (shouldFetchFromAPI) {
            const config = {
                params: {
                    apikey: NEWSDATA_API_KEY,
                    language: 'en'
                }
            };

            console.log('Fetching fresh news from newsdata.io API...');
            const response = await axios.get(NEWSDATA_API_URL, config);
            
            if (response.data && response.data.results) {
                // Transform API response to match app format
                const transformedNews = response.data.results.map((article) => {
                    const id = getStableNewsId(article);
                    return {
                        id,
                        title: article.title,
                        content: article.description || article.content || '',
                        author: article.source_id || 'News Source',
                        category: article.category && article.category[0] ? article.category[0].charAt(0).toUpperCase() + article.category[0].slice(1) : 'General',
                        timestamp: formatTimestamp(article.pubDate),
                        image: article.image_url || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%23e0e0e0%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2224%22 font-family=%22Arial%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22%3ENews Image%3C/text%3E%3C/svg%3E',
                        url: article.link,
                        source: article.source_name || article.source_id,
                        pubDate: article.pubDate
                    };
                });

                // Save new news to database
                await saveNewsToDatabase(transformedNews);
                lastApiFetch = Date.now();
                console.log(`Fetched and saved ${transformedNews.length} articles from API`);
            }
        }

        // Always return news from database (includes old and new)
        const allNews = await getNewsFromDatabase({ limit: params.limit || 0 });
        
        // Update cache
        newsCache.data = allNews;
        newsCache.timestamp = Date.now();
        
        return allNews;
    } catch (error) {
        console.error('Error fetching news from API:', error.message);
        // Try to return news from database if API fails
        const dbNews = await getNewsFromDatabase();
        if (dbNews.length > 0) {
            return dbNews;
        }
        // Return fallback news if database is also empty
        return [];
    }
}

// Fallback news data if API fails
async function getFallbackNews() {
    const base = [
        {
            id: 1,
            title: "Breaking: Major Technology Breakthrough Announced",
            content: "Scientists announce major technology advances in artificial intelligence that could transform industries.",
            author: "Tech News Daily",
            category: "Technology",
            timestamp: "2 hours ago",
            image: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%22%236366f1%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 font-family=%22Arial%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22%3EAI Breakthrough%3C/text%3E%3C/svg%3E",
            views: 1200,
            source: "Tech News Daily"
        },
        {
            id: 2,
            title: "New International Standard Adopted Globally",
            content: "International bodies adopt new standards for better compatibility and security across platforms.",
            author: "Tech Standards",
            category: "Technology",
            timestamp: "4 hours ago",
            image: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%228b5cf6%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 font-family=%22Arial%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22%3ETech Standard%3C/text%3E%3C/svg%3E",
            views: 890,
            source: "Tech Standards"
        },
        {
            id: 3,
            title: "Quantum Computing Reaches Major Milestone",
            content: "Researchers achieve milestone in quantum computing with practical applications now possible.",
            author: "Science Today",
            category: "Technology",
            timestamp: "6 hours ago",
            image: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%2310b981%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 font-family=%22Arial%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22%3EQuantum Computing%3C/text%3E%3C/svg%3E",
            views: 2100,
            source: "Science Today"
        },
        {
            id: 4,
            title: "Space Mission Launches Successfully",
            content: "The space agency launches an initiative to explore deep space with advanced robotics.",
            author: "Space News",
            category: "Science",
            timestamp: "8 hours ago",
            image: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%220ea5e9%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 font-family=%22Arial%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22%3ESpace Tech%3C/text%3E%3C/svg%3E",
            views: 3400,
            source: "Space News"
        },
        {
            id: 5,
            title: "Government Invests in Green Energy",
            content: "The government announces major investment in renewable energy and clean technology infrastructure.",
            author: "Energy Times",
            category: "Politics",
            timestamp: "12 hours ago",
            image: "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22200%22%3E%3Crect fill=%2359bb45%22 width=%22300%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-size=%2220%22 font-family=%22Arial%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23fff%22%3EGreen Energy%3C/text%3E%3C/svg%3E",
            views: 1500,
            source: "Energy Times"
        }
    ];

    return await Promise.all(base.map(async (item) => {
        const stats = await getOrInitStats(item.id);
        return {
            ...item,
            upvotes: stats.upvotes,
            comments: stats.comments,
            shares: stats.shares,
            bookmarks: Math.floor(Math.random() * 50),
            views: stats.views
        };
    }));
}

// Helper function to format timestamp
function formatTimestamp(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Discussions are stored in MongoDB
async function readDiscussions() {
    try {
        return await Discussion.find().sort({ createdAt: -1 });
    } catch (error) {
        console.error('Error reading discussions:', error);
        return [];
    }
}

async function writeDiscussions(discussions) {
    try {
        // This is handled by MongoDB save operations
        return true;
    } catch (error) {
        console.error('Error writing discussions:', error);
        return false;
    }
}

function buildDiscussionListItem(discussion) {
    const content = discussion.content || '';
    const excerpt = content.length > 120 ? `${content.substring(0, 120)}...` : content;
    const createdAt = discussion.createdAt || discussion.timestamp || new Date().toISOString();
    return {
        id: discussion.id,
        title: discussion.title,
        topic: discussion.category || discussion.topic || 'General',
        author: discussion.author || 'User',
        timestamp: formatTimestamp(createdAt),
        excerpt,
        replies: Array.isArray(discussion.replies) ? discussion.replies.length : 0,
        views: discussion.views || 0,
        likes: discussion.likes || 0
    };
}

// Mock Trending Topics
const trendingTopics = [
    { id: 1, hashtag: "#AI", posts: 2345 },
    { id: 2, hashtag: "#TechNews", posts: 1890 },
    { id: 3, hashtag: "#Innovation", posts: 1567 },
    { id: 4, hashtag: "#ClimateAction", posts: 1234 },
    { id: 5, hashtag: "#StartupLife", posts: 987 }
];

// Mock Community Stats
const communityStats = {
    totalUsers: 15420,
    activeUsers: 3847,
    totalPosts: 28934
};

// Mock Top Contributors
const topContributors = [
    { id: 1, name: "Alex Kumar", posts: 234, avatar: "AK" },
    { id: 2, name: "Sarah Chen", posts: 189, avatar: "SC" },
    { id: 3, name: "Mike Johnson", posts: 167, avatar: "MJ" },
    { id: 4, name: "Emma Wilson", posts: 145, avatar: "EW" },
    { id: 5, name: "David Brown", posts: 134, avatar: "DB" }
];

// Routes

// Get all news with optional limit and archived filter
app.get('/api/news', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 0;
        const includeArchived = req.query.includeArchived === 'true';
        
        const newsData = await fetchNewsFromAPI({ limit });
        
        // If includeArchived is false, filter out archived news
        const filteredNews = includeArchived 
            ? newsData 
            : newsData.filter(news => !news.isArchived);
        
        res.json(limit > 0 ? filteredNews.slice(0, limit) : filteredNews);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Get all news (including archived if specified)
app.get('/api/news/all', async (req, res) => {
    try {
        const includeArchived = req.query.includeArchived === 'true';
        const newsData = await getNewsFromDatabase({ includeArchived });
        res.json(newsData);
    } catch (error) {
        console.error('Error fetching news:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Get archived news only
app.get('/api/news/archived', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 0;
        const archivedNews = await News.find({ isArchived: true })
            .sort('-fetchedAt')
            .limit(limit > 0 ? limit : 0);
        
        const newsWithStats = await Promise.all(archivedNews.map(async (article) => {
            const stats = await getOrInitStats(article.newsId);
            return {
                id: article.newsId,
                title: article.title,
                content: article.content,
                author: article.author,
                category: article.category,
                timestamp: article.timestamp,
                image: article.image,
                url: article.url,
                source: article.source,
                upvotes: stats.upvotes,
                comments: stats.comments,
                shares: stats.shares,
                views: stats.views,
                bookmarks: Math.floor(Math.random() * 50),
                fetchedAt: article.fetchedAt,
                isArchived: article.isArchived
            };
        }));
        
        res.json(newsWithStats);
    } catch (error) {
        console.error('Error fetching archived news:', error);
        res.status(500).json({ error: 'Failed to fetch archived news' });
    }
});

// Archive a news article
app.post('/api/news/:id/archive', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const newsArticle = await News.findOne({ newsId: id });
        
        if (!newsArticle) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        newsArticle.isArchived = true;
        await newsArticle.save();
        
        res.json({ message: 'Article archived successfully', article: newsArticle });
    } catch (error) {
        console.error('Error archiving article:', error);
        res.status(500).json({ error: 'Failed to archive article' });
    }
});

// Unarchive a news article
app.post('/api/news/:id/unarchive', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const newsArticle = await News.findOne({ newsId: id });
        
        if (!newsArticle) {
            return res.status(404).json({ error: 'Article not found' });
        }
        
        newsArticle.isArchived = false;
        await newsArticle.save();
        
        res.json({ message: 'Article unarchived successfully', article: newsArticle });
    } catch (error) {
        console.error('Error unarchiving article:', error);
        res.status(500).json({ error: 'Failed to unarchive article' });
    }
});

// Get news by category with optional limit
app.get('/api/news/category/:category', async (req, res) => {
    try {
        const category = req.params.category;
        const limit = req.query.limit ? parseInt(req.query.limit) : 0;
        const includeArchived = req.query.includeArchived === 'true';
        
        const newsData = await getNewsFromDatabase({ 
            category, 
            limit,
            includeArchived 
        });
        
        res.json(newsData);
    } catch (error) {
        console.error('Error fetching news by category:', error);
        res.status(500).json({ error: 'Failed to fetch news' });
    }
});

// Search news - with debouncing and optimized search
app.get('/api/news/search', async (req, res) => {
    try {
        const query = req.query.q || '';
        
        if (!query.trim()) {
            return res.json([]);
        }
        
        // Get news data
        const newsData = await fetchNewsFromAPI();
        const searchTerm = query.toLowerCase();
        
        // Search in multiple fields with relevance scoring
        const results = newsData
            .map(news => {
                let relevanceScore = 0;
                
                // Title match (highest priority)
                if (news.title.toLowerCase().includes(searchTerm)) {
                    relevanceScore += 3;
                }
                
                // Content match
                if (news.content.toLowerCase().includes(searchTerm)) {
                    relevanceScore += 2;
                }
                
                // Author/source match
                if (news.author.toLowerCase().includes(searchTerm) || news.source?.toLowerCase().includes(searchTerm)) {
                    relevanceScore += 1;
                }
                
                // Category match
                if (news.category.toLowerCase().includes(searchTerm)) {
                    relevanceScore += 1;
                }
                
                return { ...news, relevanceScore };
            })
            .filter(news => news.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .map(({ relevanceScore, ...news }) => news)
            .slice(0, 20); // Limit to top 20 results
        
        res.json(results);
    } catch (error) {
        console.error('Error searching news:', error);
        res.status(500).json({ error: 'Failed to search news' });
    }
});

// Get single news article
app.get('/api/news/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // Query database directly for better performance
        const newsArticle = await News.findOne({ newsId: id });
        
        if (newsArticle) {
            // Get stats for this article
            const stats = await NewsStats.findOne({ newsId: id });
            res.json({
                id: newsArticle.newsId,
                title: newsArticle.title,
                content: newsArticle.content,
                author: newsArticle.author,
                category: newsArticle.category,
                timestamp: newsArticle.timestamp,
                image: newsArticle.image,
                url: newsArticle.url,
                source: newsArticle.source,
                pubDate: newsArticle.pubDate,
                upvotes: stats?.upvotes || 0,
                comments: stats?.comments || 0,
                shares: stats?.shares || 0,
                views: stats?.views || 0
            });
        } else {
            res.status(404).json({ error: 'Article not found' });
        }
    } catch (error) {
        console.error('Error fetching article:', error);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

// Increment upvotes
app.post('/api/news/:id/upvote', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid article id' });
        }
        const stats = await updateStats(id, { upvotes: 1 });
        await syncStatsToCache(id);
        res.json(stats.toObject());
    } catch (error) {
        console.error('Error upvoting:', error);
        res.status(500).json({ error: 'Failed to upvote' });
    }
});

// Increment shares
app.post('/api/news/:id/share', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid article id' });
        }
        const stats = await updateStats(id, { shares: 1 });
        await syncStatsToCache(id);
        res.json(stats.toObject());
    } catch (error) {
        console.error('Error sharing:', error);
        res.status(500).json({ error: 'Failed to share' });
    }
});

// Increment views
app.post('/api/news/:id/view', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ error: 'Invalid article id' });
        }
        const stats = await updateStats(id, { views: 1 });
        await syncStatsToCache(id);
        res.json(stats.toObject());
    } catch (error) {
        console.error('Error recording view:', error);
        res.status(500).json({ error: 'Failed to record view' });
    }
});

// Get news discussions
app.get('/api/news/:id/discussions', async (req, res) => {
    try {
        const newsId = parseInt(req.params.id);
        if (Number.isNaN(newsId)) {
            return res.status(400).json({ error: 'Invalid article id' });
        }

        const comments = await readComments();
        const users = await readUsers();

        const discussions = comments
            .filter(comment => parseInt(comment.newsId) === newsId)
            .map(comment => {
                const user = users.find(u => u._id == comment.userId);
                const authorName = user ? user.username : 'User';
                return {
                    id: comment._id,
                    author: authorName,
                    avatar: authorName.slice(0, 2).toUpperCase(),
                    content: comment.comment,
                    timestamp: comment.timestamp,
                    likes: 0,
                    replies: 0
                };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json(discussions);
    } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});

// Get trending topics
app.get('/api/trending-topics', (req, res) => {
    res.json(trendingTopics);
});

// Get community stats
app.get('/api/community-stats', (req, res) => {
    res.json(communityStats);
});

// Get top contributors
app.get('/api/top-contributors', (req, res) => {
    res.json(topContributors);
});

// Get trending discussions
app.get('/api/discussions/trending', async (req, res) => {
    try {
        const discussions = await readDiscussions();
        const list = discussions
            .map(buildDiscussionListItem)
            .sort((a, b) => (b.likes + b.replies + b.views) - (a.likes + a.replies + a.views));
        const limit = req.query.limit ? parseInt(req.query.limit) : list.length;
        res.json(list.slice(0, limit));
    } catch (error) {
        console.error('Error fetching trending discussions:', error);
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});

// Get recent discussions
app.get('/api/discussions/recent', async (req, res) => {
    try {
        const discussions = await readDiscussions();
        const list = discussions
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .map(buildDiscussionListItem);
        res.json(list);
    } catch (error) {
        console.error('Error fetching recent discussions:', error);
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});

// Get most viewed discussions
app.get('/api/discussions/most-viewed', async (req, res) => {
    try {
        const discussions = await readDiscussions();
        const list = discussions
            .map(buildDiscussionListItem)
            .sort((a, b) => b.views - a.views);
        res.json(list);
    } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});

// Get top replies discussions
app.get('/api/discussions/top-replies', async (req, res) => {
    try {
        const discussions = await readDiscussions();
        const list = discussions
            .map(buildDiscussionListItem)
            .sort((a, b) => b.replies - a.replies);
        res.json(list);
    } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});

// Get all discussions
app.get('/api/discussions', async (req, res) => {
    try {
        const discussions = await readDiscussions();
        res.json(discussions.map(buildDiscussionListItem));
    } catch (error) {
        console.error('Error fetching discussions:', error);
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});

// Get discussions created by a user
app.get('/api/user/discussions/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const discussions = await readDiscussions();
        const userDiscussions = discussions
            .filter(d => String(d.userId) === String(userId))
            .map(buildDiscussionListItem);
        res.json(userDiscussions);
    } catch (error) {
        console.error('Error fetching user discussions:', error);
        res.status(500).json({ error: 'Failed to fetch discussions' });
    }
});

// Delete a discussion
app.delete('/api/discussions/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { userId } = req.body;

        const discussion = await Discussion.findOne({ id });
        if (!discussion) {
            return res.status(404).json({ error: 'Discussion not found' });
        }

        if (String(discussion.userId) !== String(userId)) {
            return res.status(403).json({ error: 'Unauthorized to delete this discussion' });
        }

        // Delete all comments associated with this discussion
        await Comment.deleteMany({ newsId: id });
        
        // Delete the discussion
        await Discussion.deleteOne({ id });
        res.json({ success: true, message: 'Discussion and comments deleted successfully' });
    } catch (error) {
        console.error('Error deleting discussion:', error);
        res.status(500).json({ error: 'Failed to delete discussion' });
    }
});

// Get single discussion detail
app.get('/api/discussions/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const discussion = await Discussion.findOne({ id });

        if (!discussion) {
            return res.status(404).json({ error: 'Discussion not found' });
        }

        if (req.query.trackView === '1') {
            discussion.views = (discussion.views || 0) + 1;
            await discussion.save();
        }

        const createdAt = discussion.createdAt || new Date().toISOString();
        res.json({
            id: discussion.id,
            title: discussion.title,
            category: discussion.category || discussion.topic || 'General',
            author: discussion.author || 'User',
            timestamp: formatTimestamp(createdAt),
            content: discussion.content || '',
            replies: Array.isArray(discussion.replies)
                ? discussion.replies.map(reply => ({
                    ...reply,
                    timestamp: formatTimestamp(reply.createdAt || reply.timestamp || new Date().toISOString())
                }))
                : [],
            views: discussion.views || 0,
            likes: discussion.likes || 0
        });
    } catch (error) {
        console.error('Error fetching discussion:', error);
        res.status(500).json({ error: 'Failed to fetch discussion' });
    }
});

// Create new discussion
app.post('/api/discussions', async (req, res) => {
    try {
        const { title, category, content, author, userId } = req.body;

        if (!title || !category || !content || !author) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const discussions = await readDiscussions();
        const newId = discussions.length > 0 ? Math.max(...discussions.map(d => d.id)) + 1 : 1;

        const newDiscussion = new Discussion({
            id: newId,
            title,
            category,
            author,
            content,
            createdAt: new Date().toISOString(),
            userId,
            replies: [],
            views: 0,
            likes: 0
        });

        await newDiscussion.save();
        res.status(201).json(buildDiscussionListItem(newDiscussion));
    } catch (error) {
        console.error('Error creating discussion:', error);
        res.status(500).json({ error: 'Failed to create discussion' });
    }
});

// Like discussion
app.post('/api/discussions/:id/like', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const discussion = await Discussion.findOne({ id });

        if (!discussion) {
            return res.status(404).json({ error: 'Discussion not found' });
        }

        discussion.likes = (discussion.likes || 0) + 1;
        await discussion.save();
        res.json({ likes: discussion.likes });
    } catch (error) {
        console.error('Error liking discussion:', error);
        res.status(500).json({ error: 'Failed to like discussion' });
    }
});

// Add reply to discussion
app.post('/api/discussions/:id/replies', async (req, res) => {
    try {
        const { author, content, userId } = req.body;
        const discussionId = parseInt(req.params.id);

        if (!author || !content) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const discussion = await Discussion.findOne({ id: discussionId });
        if (!discussion) {
            return res.status(404).json({ error: 'Discussion not found' });
        }

        const newReply = {
            id: Date.now(),
            author,
            content,
            createdAt: new Date().toISOString(),
            userId,
            likes: 0
        };

        discussion.replies = Array.isArray(discussion.replies) ? discussion.replies : [];
        discussion.replies.push(newReply);
        await discussion.save();

        res.status(201).json({
            ...newReply,
            timestamp: formatTimestamp(newReply.createdAt)
        });
    } catch (error) {
        console.error('Error adding reply:', error);
        res.status(500).json({ error: 'Failed to add reply' });
    }
});

// Like reply
app.post('/api/discussions/:id/replies/:replyId/like', async (req, res) => {
    try {
        const discussionId = parseInt(req.params.id);
        const replyId = parseInt(req.params.replyId);

        const discussion = await Discussion.findOne({ id: discussionId });
        if (!discussion || !Array.isArray(discussion.replies)) {
            return res.status(404).json({ error: 'Discussion not found' });
        }

        const reply = discussion.replies.find(r => r.id === replyId);
        if (!reply) {
            return res.status(404).json({ error: 'Reply not found' });
        }

        reply.likes = (reply.likes || 0) + 1;
        await discussion.save();
        res.json({ likes: reply.likes });
    } catch (error) {
        console.error('Error liking reply:', error);
        res.status(500).json({ error: 'Failed to like reply' });
    }
});

// ========== AUTHENTICATION ENDPOINTS ==========

// Helper functions for database operations
async function migrateUsersFromFile() {
    const usersFilePath = path.join(__dirname, 'data', 'users.txt');
    if (!fs.existsSync(usersFilePath)) {
        return;
    }

    try {
        const fileContents = fs.readFileSync(usersFilePath, 'utf8');
        const lines = fileContents.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length === 0) {
            return;
        }

        let migratedCount = 0;
        for (const line of lines) {
            try {
                const legacyUser = JSON.parse(line);
                if (!legacyUser?.email || !legacyUser?.username || !legacyUser?.password) {
                    continue;
                }

                const existing = await User.findOne({ email: legacyUser.email });
                if (existing) {
                    continue;
                }

                const isBcryptHash = typeof legacyUser.password === 'string' && legacyUser.password.startsWith('$2');
                const hashedPassword = isBcryptHash
                    ? legacyUser.password
                    : await bcrypt.hash(legacyUser.password, 10);

                const userDoc = {
                    username: legacyUser.username,
                    email: legacyUser.email,
                    password: hashedPassword,
                    phone: legacyUser.phone || '',
                    profilePicture: legacyUser.profilePicture || '',
                    createdAt: legacyUser.createdAt ? new Date(legacyUser.createdAt) : new Date()
                };

                await User.updateOne(
                    { email: legacyUser.email },
                    { $setOnInsert: userDoc },
                    { upsert: true }
                );
                migratedCount += 1;
            } catch (lineError) {
                console.error('Failed to migrate user line:', lineError);
            }
        }

        if (migratedCount > 0) {
            console.log(`Migrated ${migratedCount} legacy users into MongoDB`);
        }
    } catch (error) {
        console.error('Error migrating users from file:', error);
    }
}

async function readUsers() {
    try {
        return await User.find();
    } catch (error) {
        console.error('Error reading users:', error);
        return [];
    }
}

async function readComments() {
    try {
        return await Comment.find();
    } catch (error) {
        console.error('Error reading comments:', error);
        return [];
    }
}

// Signup endpoint
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const newUser = new User({
            username,
            email,
            password,
            phone: phone || '',
            profilePicture: ''
        });

        await newUser.save();
        res.json(newUser.toJSON());
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json(user.toJSON());
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Helper to generate 6 digit OTP
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==========================================
// OTP-Based Authentication Routes
// ==========================================

// 1. Send OTP for Signup
app.post('/api/auth/send-signup-otp', async (req, res) => {
    try {
        const { username, email, password, phone } = req.body;
        
        // Ensure email doesn't already exist
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Generate OTP
        const otpCode = generateOtp();
        
        // Save OTP to DB (overwriting any previous unused OTP for this email and type)
        await Otp.deleteMany({ email, type: 'signup' });
        const newOtp = new Otp({
            email,
            otp: otpCode,
            type: 'signup',
            tempUserData: { username, email, password, phone }
        });
        await newOtp.save();
        
        // Send email
        await sendOtpEmail(email, otpCode, 'signup');
        
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send signup OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// 2. Verify OTP for Signup
app.post('/api/auth/verify-signup', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        // Find the valid OTP record
        const otpRecord = await Otp.findOne({ email, otp, type: 'signup' });
        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        
        // Extract temp user data
        const { username, password, phone } = otpRecord.tempUserData;
        
        // Double check email isn't taken in the time gap
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        
        // Create the user
        const newUser = new User({
            username, email, password, phone: phone || '', profilePicture: ''
        });
        await newUser.save();
        
        // Clean up OTP record
        await Otp.deleteOne({ _id: otpRecord._id });
        
        res.json(newUser.toJSON());
    } catch (error) {
        console.error('Verify signup OTP error:', error);
        res.status(500).json({ error: 'Failed to complete signup' });
    }
});

// 3. Send OTP for Login
app.post('/api/auth/send-login-otp', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Ensure user exists and password is correct before sending OTP
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const otpCode = generateOtp();
        await Otp.deleteMany({ email, type: 'login' });
        const newOtp = new Otp({ email, otp: otpCode, type: 'login' });
        await newOtp.save();
        
        await sendOtpEmail(email, otpCode, 'login');
        
        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send login OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// 4. Verify OTP for Login
app.post('/api/auth/verify-login', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const otpRecord = await Otp.findOne({ email, otp, type: 'login' });
        if (!otpRecord) {
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        }
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        await Otp.deleteOne({ _id: otpRecord._id });
        
        res.json(user.toJSON());
    } catch (error) {
        console.error('Verify login OTP error:', error);
        res.status(500).json({ error: 'Failed to verify login' });
    }
});

// Update profile endpoint
app.put('/api/auth/update-profile', upload.single('profilePicture'), async (req, res) => {
    try {
        const userData = JSON.parse(req.body.userData);
        
        const user = await User.findById(userData.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Update user data
        if (userData.username) user.username = userData.username;
        if (userData.email) user.email = userData.email;
        if (userData.phone !== undefined) user.phone = userData.phone;

        // Update profile picture if uploaded
        if (req.file) {
            user.profilePicture = `/uploads/${req.file.filename}`;
        }

        await user.save();
        res.json(user.toJSON());
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user comments
app.get('/api/user/comments/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const comments = await Comment.find({ userId });
        res.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
});

// Add comment
app.post('/api/user/comments', async (req, res) => {
    try {
        console.log('Full req.body received:', JSON.stringify(req.body));
        const { userId, newsId, newsTitle, comment } = req.body;
        
        console.log('Extracted values:', { userId, newsId, newsTitle, comment });

        const newComment = new Comment({
            userId,
            newsId,
            newsTitle,
            comment,
            timestamp: new Date()
        });

        await newComment.save();

        const parsedId = parseInt(newsId);
        if (!Number.isNaN(parsedId)) {
            await updateStats(parsedId, { comments: 1 });
            await syncStatsToCache(parsedId);
        }

        res.json(newComment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// Delete comment
app.delete('/api/user/comments/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        const { userId } = req.body;

        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        await Comment.findByIdAndDelete(commentId);

        const parsedNewsId = parseInt(comment.newsId);
        if (!Number.isNaN(parsedNewsId)) {
            await updateStats(parsedNewsId, { comments: -1 });
            await syncStatsToCache(parsedNewsId);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Auto-archive old news (news older than 7 days)
async function autoArchiveOldNews() {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const result = await News.updateMany(
            { 
                fetchedAt: { $lt: sevenDaysAgo },
                isArchived: false 
            },
            { 
                $set: { isArchived: true } 
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`Auto-archived ${result.modifiedCount} old news articles`);
        }
    } catch (error) {
        console.error('Error auto-archiving news:', error);
    }
}

// Run auto-archive on server start
autoArchiveOldNews();

// Run auto-archive every 24 hours
const ARCHIVE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
setInterval(autoArchiveOldNews, ARCHIVE_INTERVAL);

// PDF Export for Video Chat Sessions
app.get('/api/video-rooms/:roomId/export-pdf', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    // Fetch room details
    const room = await VideoRoom.findById(roomId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Fetch messages
    const messages = await ChatMessage.find({ roomId }).sort({ timestamp: 1 });

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=session-report-${roomId}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('BaatCheet Video Chat Session Report', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).text(`Room Name: ${room.name}`);
    doc.text(`Description: ${room.description || 'N/A'}`);
    doc.text(`Date: ${new Date(room.createdAt).toLocaleString()}`);
    doc.text(`Session Duration: 60 minutes`);
    doc.moveDown();

    doc.fontSize(16).text('Messages & Transcripts', { underline: true });
    doc.moveDown();

    if (messages.length === 0) {
      doc.fontSize(12).text('No messages recorded during this session.');
    } else {
      messages.forEach((msg) => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const prefix = msg.isVoiceTranscribed ? '[TRANSCRIPT]' : '[CHAT]';
        
        doc.fontSize(10).fillColor('#444').text(`${timestamp} `, { continued: true });
        doc.fillColor(msg.isVoiceTranscribed ? '#1d4ed8' : '#000').text(`${prefix} `, { continued: true });
        doc.fillColor('#000').font('Helvetica-Bold').text(`${msg.userName}: `, { continued: true });
        doc.font('Helvetica').text(msg.message);
        doc.moveDown(0.5);
      });
    }

    // Footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(
        `Generated by BaatCheet | Page ${i + 1}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
    }

    doc.end();
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Create HTTP server and attach Socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Setup Socket handlers for video chat
setupSocketHandlers(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
