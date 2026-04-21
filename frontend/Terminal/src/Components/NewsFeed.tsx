import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './NewsFeed.css';

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

interface NewsFeedProps {
    limit?: number;
    selectedCategory?: string;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ limit, selectedCategory = 'All' }) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState<string>('');

    const fallbackPosts: NewsPost[] = [];

    const [newsPosts, setNewsPosts] = useState<NewsPost[]>(fallbackPosts);
    const [, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadNews = async () => {
            setIsLoading(true);
            setError(null);

            try {
                let url = `${apiBaseUrl}/api/news`;
                const params = new URLSearchParams();
                
                if (limit) {
                    params.append('limit', limit.toString());
                }
                
                if (selectedCategory && selectedCategory !== 'All') {
                    url = `${apiBaseUrl}/api/news/category/${selectedCategory}`;
                }

                const queryString = params.toString();
                const fullUrl = queryString ? `${url}?${queryString}` : url;

                const response = await fetch(fullUrl, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to load news feed.');
                }

                const data: NewsPost[] = await response.json();
                setNewsPosts(data.length ? data : fallbackPosts);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load news feed right now.');
                    setNewsPosts(fallbackPosts);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadNews();

        return () => controller.abort();
    }, [apiBaseUrl, limit, selectedCategory]);

    // Filter posts by search query and category
    const filteredPosts = useMemo(() => {
        let filtered = newsPosts;

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(post =>
                post.title.toLowerCase().includes(query) ||
                post.content.toLowerCase().includes(query) ||
                post.author.toLowerCase().includes(query)
            );
        }

        // Limit results if specified
        if (limit) {
            filtered = filtered.slice(0, limit);
        }

        return filtered;
    }, [newsPosts, searchQuery, limit]);

    const updatePostStats = (id: number, stats: Partial<NewsPost>) => {
        setNewsPosts(prev => prev.map(post => (post.id === id ? { ...post, ...stats } : post)));
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

    const handleOpen = (id: number) => {
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
        navigate(`/news/${id}`);
    };

    const handleComments = (id: number) => {
        handleOpen(id);
        setTimeout(() => {
            const anchor = document.getElementById('comments-section');
            if (anchor) {
                anchor.scrollIntoView({ behavior: 'smooth' });
            }
        }, 0);
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
            const post = newsPosts.find(p => p.id === id);
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
            setNewsPosts(prev => [...prev]); // Trigger re-render
        } catch (error) {
            console.error('Error toggling bookmark:', error);
        }
    };

    // Categories memoization (available for use if needed)
    useMemo(() => {
        const unique = new Set<string>();
        newsPosts.forEach(post => unique.add(post.category));
        return ['All', ...Array.from(unique)];
    }, [newsPosts]);

    return (
        <div className="news-feed">
            <div className="feed-header">
                <h2>Latest News</h2>
                <h3>Catch up on breaking stories and trending discussions.</h3>
                {/* Search Bar */}
                <div className="news-search">
                    <input 
                        type="text" 
                        placeholder="Search news stories..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>


                {/* <div className="filter-buttons">
                    {categories.map((category, index) => (
                        <button
                            key={category}
                            className={`filter-btn ${index === 0 ? 'active' : ''}`}
                        >
                            {category}
                        </button>
                    ))}
                </div> */}
            </div>

            {/* Loading text removed as per user request */}
            
            {/* add <p>Catch up on breaking stories and trending discussions.</p> */}
            {error && <p>{error}</p>}
            
            <div className="posts-container">
                {filteredPosts.map(post => {
                    // Truncate content to 150 characters for preview
                    const previewContent = post.content.length > 150 
                        ? post.content.substring(0, 150) + '...' 
                        : post.content;

                    return (
                    <article 
                        key={post.id} 
                        className="news-post"
                        onClick={() => handleOpen(post.id)}
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
                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleUpvote(post.id); }}>
                                <span>👍 {post.upvotes}</span>
                            </button>
                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleComments(post.id); }}>
                                <span>💬 {post.comments}</span>
                            </button>
                            <button className="action-btn" onClick={(e) => e.stopPropagation()}>
                                <span>👁️ {post.views ?? 0}</span>
                            </button>
                            <button className="action-btn" onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}>
                                <span>🔗 {post.shares ?? 0}</span>
                            </button>
                            <button className={`action-btn bookmark ${isBookmarked(post.id) ? 'bookmarked' : ''}`} onClick={(e) => { e.stopPropagation(); handleBookmark(post.id); }}>
                                <span>🔖</span>
                            </button>
                        </div>
                    </article>
                    );
                })}
            </div>
        </div>
    );
};

export default NewsFeed;
