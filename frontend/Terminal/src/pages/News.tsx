import React, { useEffect, useState } from 'react';
import './News.css';
import { useNavigate } from 'react-router-dom';

interface NewsPost {
    id: number;
    title: string;
    category: string;
    author: string;
    timestamp: string;
    content: string;
    comments: number;
    upvotes: number;
    shares?: number;
    views?: number;
    image?: string;
}

const fallbackPosts: NewsPost[] = [];

const NewsPost: React.FC<{ 
    post: NewsPost; 
    onNavigate: (id: number) => void;
    onUpvote: (id: number) => void;
    onShare: (id: number) => void;
    onView: (id: number) => void;
    onComments: (id: number) => void;
    onBookmark: (id: number) => void;
    isBookmarked: boolean;
}> = ({ post, onNavigate, onUpvote, onShare, onView, onComments, onBookmark, isBookmarked }) => {
    // Truncate content to 150 characters for preview
    const previewContent = post.content.length > 150 
        ? post.content.substring(0, 150) + '...' 
        : post.content;

    return (
    <article 
        className="news-post"
        onClick={() => { onView(post.id); onNavigate(post.id); }}
        style={{ cursor: 'pointer' }}
    >
        <div className="post-header">
            <span className="category-badge">{post.category}</span>
            <div className="post-meta">
                <span className="author">{post.author}</span>
                <span className="timestamp">{post.timestamp}</span>
            </div>
        </div>
        {post.image && (
            <div className="post-image">
                <img src={post.image} alt={post.title} />
            </div>
        )}
        <h3 className="post-title">{post.title}</h3>
        <p className="post-content">{previewContent}</p>
        <div className="post-actions">
            <button className="action-btn" onClick={(e) => { e.stopPropagation(); onUpvote(post.id); }}>
                <span>👍 {post.upvotes}</span>
            </button>
            <button className="action-btn" onClick={(e) => { e.stopPropagation(); onComments(post.id); }}>
                <span>💬 {post.comments}</span>
            </button>
            <button className="action-btn" onClick={(e) => e.stopPropagation()}>
                <span>👁️ {post.views || 0}</span>
            </button>
            <button className="action-btn" onClick={(e) => { e.stopPropagation(); onShare(post.id); }}>
                <span>🔗 {post.shares || 0}</span>
            </button>
            <button className={`action-btn bookmark ${isBookmarked ? 'bookmarked' : ''}`} onClick={(e) => { e.stopPropagation(); onBookmark(post.id); }}>
                <span>🔖</span>
            </button>
        </div>
    </article>
    );
};

const News: React.FC = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const navigate = useNavigate();
    const [allNews, setAllNews] = useState<NewsPost[]>(fallbackPosts);
    const [, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const loadNews = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const url = showArchived 
                    ? `${apiBaseUrl}/api/news/all?includeArchived=true`
                    : `${apiBaseUrl}/api/news/all`;
                    
                const response = await fetch(url, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to load news.');
                }

                const data: NewsPost[] = await response.json();
                setAllNews(data.length ? data : fallbackPosts);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load news right now.');
                    setAllNews(fallbackPosts);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadNews();
        return () => controller.abort();
    }, [apiBaseUrl, showArchived]);

    const updatePostStats = (id: number, stats: Partial<NewsPost>) => {
        setAllNews(prev => prev.map(post => (post.id === id ? { ...post, ...stats } : post)));
    };

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

    const handleUpvote = async (id: number) => {
        if (hasInteracted(id, 'like')) {
            return;
        }
        try {
            const response = await fetch(`${apiBaseUrl}/api/news/${id}/upvote`, { method: 'POST' });
            if (response.ok) {
                const stats = await response.json();
                updatePostStats(id, stats);
                markInteracted(id, 'like');
            }
        } catch {
            // Ignore network errors silently
        }
    };

    const handleShare = async (id: number) => {
        const shareUrl = `${window.location.origin}/news/${id}`;
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

        if (shared && !hasInteracted(id, 'share')) {
            try {
                const response = await fetch(`${apiBaseUrl}/api/news/${id}/share`, { method: 'POST' });
                if (response.ok) {
                    const stats = await response.json();
                    updatePostStats(id, stats);
                    markInteracted(id, 'share');
                }
            } catch {
                // Ignore network errors silently
            }
        }
    };

    const handleComments = (id: number) => {
        handleView(id);
        navigate(`/news/${id}`);
        setTimeout(() => {
            const anchor = document.getElementById('comments-section');
            if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth' });
            }
        }, 0);
    };

    const handleView = (id: number) => {
        if (!hasInteracted(id, 'view')) {
            fetch(`${apiBaseUrl}/api/news/${id}/view`, { method: 'POST' })
                .then(response => response.ok ? response.json() : null)
                .then(stats => {
                    if (stats) {
                        updatePostStats(id, stats);
                        markInteracted(id, 'view');
                    }
                })
                .catch(() => undefined);
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

    const handleBookmark = (id: number) => {
        try {
            const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            const post = allNews.find(p => p.id === id);
            if (!post) return;

            const index = bookmarks.findIndex((b: any) => b.id === id);
            
            if (index >= 0) {
                bookmarks.splice(index, 1);
            } else {
                bookmarks.push({
                    ...post,
                    bookmarkedAt: new Date().toISOString()
                });
            }
            
            localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
            setAllNews(prev => [...prev]); // Trigger re-render
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    return (
        <main className="news-page-container">
            <div className="news-page-content">
                {/* Page Header */}
                <div className="page-header">
                    <h1>📰 News Hub</h1>
                    <p>Browse all news stories from our community.</p>
                </div>

                {/* Search Bar and Filters */}
                <div className="news-search">
                    <input type="text" placeholder="Search news stories..." />
                    <button 
                        className={`archive-toggle ${showArchived ? 'active' : ''}`}
                        onClick={() => setShowArchived(!showArchived)}
                        title={showArchived ? 'Hide archived news' : 'Show all news including archived'}
                    >
                        {showArchived ? '📦 Showing All News' : '📰 Current News Only'}
                    </button>
                </div>

                {/* News List */}
                <div className="news-list">
                    {/* Loading message removed API sync */}
                    {error && <p className="error">{error}</p>}
                    <div className="posts-container">
                        {allNews.map(post => (
                            <NewsPost 
                                key={post.id} 
                                post={post} 
                                onNavigate={(id) => navigate(`/news/${id}`)}
                                onUpvote={handleUpvote}
                                onShare={handleShare}
                                onView={handleView}
                                onComments={handleComments}
                                onBookmark={handleBookmark}
                                isBookmarked={isBookmarked(post.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
};

export default News;
