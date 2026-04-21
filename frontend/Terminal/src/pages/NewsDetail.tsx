import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './NewsDetail.css';
import DiscussionThread from '../Components/DiscussionThread';

interface NewsPost {
    id: number;
    title: string;
    category: string;
    author: string;
    timestamp: string;
    content: string;
    fullContent?: string;
    comments: number;
    upvotes: number;
    shares?: number;
    views?: number;
    image?: string;
    url?: string;
}

const fallbackNews: NewsPost = {
    id: 1,
    title: "Breaking: Major Technology Breakthrough Announced",
    category: "Technology",
    author: "TechUser123",
    timestamp: "2 hours ago",
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    fullContent: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
    comments: 45,
    upvotes: 234
};

const NewsDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    const [news, setNews] = useState<NewsPost>(fallbackNews);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getInteractionKey = (id: number, action: 'view' | 'like' | 'share') => `news:${id}:${action}`;

    const hasInteracted = (id: number, action: 'view' | 'like' | 'share') => {
        try {
            return localStorage.getItem(getInteractionKey(id, action)) === '1';
        } catch {
            return false;
        }
    };

    const markInteracted = (id: number, action: 'view' | 'like' | 'share') => {
        try {
            localStorage.setItem(getInteractionKey(id, action), '1');
        } catch {
            // Ignore storage errors
        }
    };

    const isBookmarked = (id: number) => {
        try {
            const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            return bookmarks.some((b: any) => b.id === id);
        } catch {
            return false;
        }
    };

    const handleBookmark = async () => {
        try {
            const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            const index = bookmarks.findIndex((b: any) => b.id === news.id);
            
            if (index >= 0) {
                // Remove bookmark
                bookmarks.splice(index, 1);
            } else {
                // Add bookmark
                bookmarks.push({
                    id: news.id,
                    title: news.title,
                    category: news.category,
                    author: news.author,
                    timestamp: news.timestamp,
                    content: news.content,
                    fullContent: news.fullContent,
                    comments: news.comments,
                    upvotes: news.upvotes,
                    shares: news.shares,
                    views: news.views,
                    image: news.image,
                    url: news.url,
                    bookmarkedAt: new Date().toISOString()
                });
            }
            
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            setNews(prev => ({ ...prev })); // Trigger re-render
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    const updateNewsStats = (stats: Partial<NewsPost>) => {
        setNews(prev => ({ ...prev, ...stats }));
    };

    const incrementView = (newsId: number) => {
        if (hasInteracted(newsId, 'view')) {
            return;
        }
        fetch(`${apiBaseUrl}/api/news/${newsId}/view`, { method: 'POST' })
            .then(response => response.ok ? response.json() : null)
            .then(stats => {
                if (stats) {
                    updateNewsStats(stats);
                    markInteracted(newsId, 'view');
                }
            })
            .catch(() => undefined);
    };

    const handleUpvote = async () => {
        if (hasInteracted(news.id, 'like')) {
            return;
        }
        try {
            const response = await fetch(`${apiBaseUrl}/api/news/${news.id}/upvote`, { method: 'POST' });
            if (response.ok) {
                const stats = await response.json();
                updateNewsStats(stats);
                markInteracted(news.id, 'like');
            }
        } catch {
            // Ignore network errors silently
        }
    };

    const handleShare = async () => {
        const shareUrl = `${window.location.origin}/news/${news.id}`;
        let shared = false;

        try {
            if (navigator.share) {
                await navigator.share({ url: shareUrl });
                shared = true;
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareUrl);
                shared = true;
            }
        } catch {
            shared = false;
        }

        if (shared && !hasInteracted(news.id, 'share')) {
            try {
                const response = await fetch(`${apiBaseUrl}/api/news/${news.id}/share`, { method: 'POST' });
                if (response.ok) {
                    const stats = await response.json();
                    updateNewsStats(stats);
                    markInteracted(news.id, 'share');
                }
            } catch {
                // Ignore network errors silently
            }
        }
    };

    useEffect(() => {
        const controller = new AbortController();

        const loadNews = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${apiBaseUrl}/api/news/${id}`, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to load news article.');
                }

                const data: NewsPost = await response.json();
                setNews(data);
                incrementView(data.id);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load this news article.');
                    setNews(fallbackNews);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (id) {
            loadNews();
        }

        return () => controller.abort();
    }, [id, apiBaseUrl]);

    const handleBack = () => {
        navigate('/news');
    };

    return (
        <main className="news-detail-container">
            <div className="news-detail-content">
                {/* Back Button */}
                <button className="back-btn" onClick={handleBack}>
                    ← Back to News
                </button>

                {isLoading && <p className="loading">Loading article...</p>}
                {error && <p className="error">{error}</p>}

                {!isLoading && !error && (
                    <article className="news-detail-article">
                        {/* Article Header */}
                        <div className="article-header">
                            <span className="category-badge">{news.category}</span>
                            <h1 className="article-title">{news.title}</h1>
                            <div className="article-meta">
                                <span className="author">By {news.author}</span>
                                <span className="timestamp">{news.timestamp}</span>
                            </div>
                        </div>

                        {/* Featured Image */}
                        {news.image && (
                            <div className="article-image">
                                <img src={news.image} alt={news.title} />
                            </div>
                        )}

                        {/* Article Content */}
                        <div className="article-content">
                            <p>{news.fullContent || news.content}</p>
                        </div>

                        {/* Article Actions */}
                        <div className="article-actions">
                            <button className="action-btn upvote" onClick={handleUpvote}>
                                <span>👍 {news.upvotes} Upvotes</span>
                            </button>
                            <button className="action-btn comments">
                                <span>💬 {news.comments} Comments</span>
                            </button>
                            <button className="action-btn">
                                <span>👁️ {news.views ?? 0} Views</span>
                            </button>
                            <button className="action-btn share" onClick={handleShare}>
                                <span>🔗 {news.shares ?? 0} Shares</span>
                            </button>
                            <button 
                                className={`action-btn bookmark ${isBookmarked(news.id) ? 'bookmarked' : ''}`}
                                onClick={handleBookmark}
                            >
                                <span>{isBookmarked(news.id) ? '🔖 Bookmarked' : '🔖 Bookmark'}</span>
                            </button>
                        </div>

                        {/* Comments Section */}
                        <div id="comments-section">
                            <DiscussionThread newsId={parseInt(id || '0')} />
                        </div>
                    </article>
                )}
            </div>
        </main>
    );
};

export default NewsDetail;
