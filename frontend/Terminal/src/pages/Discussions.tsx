import React, { useEffect, useState } from 'react';
import './Discussions.css';
import { useNavigate } from 'react-router-dom';
import CreateDiscussion from '../Components/CreateDiscussion';

interface Discussion {
    id: number;
    title: string;
    topic: string;
    author: string;
    timestamp: string;
    excerpt: string;
    replies: number;
    views: number;
    likes: number;
}

type DiscussionSection = 'trending' | 'recent' | 'mostViewed' | 'topReplies';

const fallbackDiscussions: Discussion[] = [];

const DiscussionCard: React.FC<{ discussion: Discussion; onCardClick: (id: number) => void; onLike: (id: number) => void; hasLiked: boolean }> = ({ discussion, onCardClick, onLike, hasLiked }) => (
    <div className="discussion-card" onClick={() => onCardClick(discussion.id)}>
        <div className="discussion-header">
            <span className="topic-badge">{discussion.topic}</span>
            <div className="discussion-meta">
                <span className="author">{discussion.author}</span>
                <span className="timestamp">{discussion.timestamp}</span>
            </div>
        </div>
        <h3 className="discussion-title">{discussion.title}</h3>
        <p className="discussion-excerpt">{discussion.excerpt}</p>
        <div className="discussion-stats">
            <button className="stat-btn" onClick={(e) => e.stopPropagation()}>💬 {discussion.replies} Replies</button>
            <button className="stat-btn" onClick={(e) => e.stopPropagation()}>👁️ {discussion.views.toLocaleString()} Views</button>
            <button className="stat-btn" onClick={(e) => { e.stopPropagation(); onLike(discussion.id); }} disabled={hasLiked}>
                ❤️ {discussion.likes} Likes
            </button>
            <button className="stat-btn view-btn" onClick={(e) => { e.stopPropagation(); onCardClick(discussion.id); }}>→ View Discussion</button>
        </div>
    </div>
);

const DiscussionSection: React.FC<{ title: string; discussions: Discussion[]; isLoading: boolean; error: string | null; onCardClick: (id: number) => void; onLike: (id: number) => void; hasLiked: (id: number) => boolean }> = ({
    title,
    discussions,
    isLoading,
    error,
    onCardClick,
    onLike,
    hasLiked
}) => (
    <div className="discussion-section">
        <h2>{title}</h2>
        {isLoading && <p className="loading">Loading {title.toLowerCase()}...</p>}
        {error && <p className="error">{error}</p>}
        {!isLoading && !error && discussions.length === 0 && (
            <p className="empty-state">No discussions yet. Start the first one!</p>
        )}
        <div className="discussions-container">
            {discussions.map(discussion => (
                <DiscussionCard
                    key={discussion.id}
                    discussion={discussion}
                    onCardClick={onCardClick}
                    onLike={onLike}
                    hasLiked={hasLiked(discussion.id)}
                />
            ))}
        </div>
    </div>
);

const Discussions: React.FC = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<DiscussionSection>('trending');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [trendingDiscussions, setTrendingDiscussions] = useState<Discussion[]>(fallbackDiscussions);
    const [recentDiscussions, setRecentDiscussions] = useState<Discussion[]>(fallbackDiscussions);
    const [mostViewedDiscussions, setMostViewedDiscussions] = useState<Discussion[]>(fallbackDiscussions);
    const [topRepliesDiscussions, setTopRepliesDiscussions] = useState<Discussion[]>(fallbackDiscussions);
    const [loadingState, setLoadingState] = useState<Record<DiscussionSection, boolean>>({
        trending: false,
        recent: false,
        mostViewed: false,
        topReplies: false
    });
    const [errorState, setErrorState] = useState<Record<DiscussionSection, string | null>>({
        trending: null,
        recent: null,
        mostViewed: null,
        topReplies: null
    });

    useEffect(() => {
        const controller = new AbortController();

        const loadDiscussionData = async () => {
            const endpoints = [
                { key: 'trending' as DiscussionSection, url: '/api/discussions/trending', setState: setTrendingDiscussions },
                { key: 'recent' as DiscussionSection, url: '/api/discussions/recent', setState: setRecentDiscussions },
                { key: 'mostViewed' as DiscussionSection, url: '/api/discussions/most-viewed', setState: setMostViewedDiscussions },
                { key: 'topReplies' as DiscussionSection, url: '/api/discussions/top-replies', setState: setTopRepliesDiscussions }
            ];

            for (const endpoint of endpoints) {
                setLoadingState(prev => ({ ...prev, [endpoint.key]: true }));
                setErrorState(prev => ({ ...prev, [endpoint.key]: null }));

                try {
                    const response = await fetch(`${apiBaseUrl}${endpoint.url}`, {
                        signal: controller.signal
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to load ${endpoint.key} discussions.`);
                    }

                    const data: Discussion[] = await response.json();
                    endpoint.setState(data.length ? data : []);
                } catch (err) {
                    if (!(err instanceof DOMException && err.name === 'AbortError')) {
                        setErrorState(prev => ({ ...prev, [endpoint.key]: `Unable to load ${endpoint.key} discussions.` }));
                        endpoint.setState([]);
                    }
                } finally {
                    setLoadingState(prev => ({ ...prev, [endpoint.key]: false }));
                }
            }
        };

        loadDiscussionData();
        return () => controller.abort();
    }, [apiBaseUrl]);

    const getLikeKey = (id: number) => `discussion:${id}:like`;

    const hasLiked = (id: number) => {
        try {
            return localStorage.getItem(getLikeKey(id)) === '1';
        } catch {
            return false;
        }
    };

    const markLiked = (id: number) => {
        try {
            localStorage.setItem(getLikeKey(id), '1');
        } catch {
            // Ignore storage errors
        }
    };

    const updateDiscussionLikes = (id: number, likes: number) => {
        setTrendingDiscussions(prev => prev.map(d => (d.id === id ? { ...d, likes } : d)));
        setRecentDiscussions(prev => prev.map(d => (d.id === id ? { ...d, likes } : d)));
        setMostViewedDiscussions(prev => prev.map(d => (d.id === id ? { ...d, likes } : d)));
        setTopRepliesDiscussions(prev => prev.map(d => (d.id === id ? { ...d, likes } : d)));
    };

    const handleLike = async (id: number) => {
        if (hasLiked(id)) {
            return;
        }
        try {
            const response = await fetch(`${apiBaseUrl}/api/discussions/${id}/like`, { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                updateDiscussionLikes(id, data.likes);
                markLiked(id);
            }
        } catch {
            // Ignore network errors silently
        }
    };

    const handleDiscussionClick = (id: number) => {
        navigate(`/discussions/${id}`);
    };

    const handleCreateSuccess = () => {
        // Reload discussions
        setActiveTab('recent');
    };

    return (
        <main className="discussions-page-container">
            <div className="discussions-page-content">
                {/* Page Header */}
                <div className="page-header">
                    <div className="header-content">
                        <div>
                            <h1>💬 Community Discussions</h1>
                            <p>Join thousands in meaningful conversations about the topics you care about.</p>
                        </div>
                        <button className="create-discussion-btn" onClick={() => setIsModalOpen(true)}>
                            ✨ Start Discussion
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="discussions-search">
                    <input type="text" placeholder="Search discussions..." />
                </div>

                {/* Tab Navigation */}
                <div className="discussion-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'trending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('trending')}
                    >
                        🔥 Trending
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('recent')}
                    >
                        ⏱️ Recent
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'mostViewed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mostViewed')}
                    >
                        👀 Most Viewed
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'topReplies' ? 'active' : ''}`}
                        onClick={() => setActiveTab('topReplies')}
                    >
                        ✉️ Top Replies
                    </button>
                </div>

                {/* Content */}
                <div className="discussion-content">
                    {activeTab === 'trending' && (
                        <DiscussionSection
                            title="Trending Discussions"
                            discussions={trendingDiscussions}
                            isLoading={loadingState.trending}
                            error={errorState.trending}
                            onCardClick={handleDiscussionClick}
                            onLike={handleLike}
                            hasLiked={hasLiked}
                        />
                    )}
                    {activeTab === 'recent' && (
                        <DiscussionSection
                            title="Recent Discussions"
                            discussions={recentDiscussions}
                            isLoading={loadingState.recent}
                            error={errorState.recent}
                            onCardClick={handleDiscussionClick}
                            onLike={handleLike}
                            hasLiked={hasLiked}
                        />
                    )}
                    {activeTab === 'mostViewed' && (
                        <DiscussionSection
                            title="Most Viewed"
                            discussions={mostViewedDiscussions}
                            isLoading={loadingState.mostViewed}
                            error={errorState.mostViewed}
                            onCardClick={handleDiscussionClick}
                            onLike={handleLike}
                            hasLiked={hasLiked}
                        />
                    )}
                    {activeTab === 'topReplies' && (
                        <DiscussionSection
                            title="Top Replies"
                            discussions={topRepliesDiscussions}
                            isLoading={loadingState.topReplies}
                            error={errorState.topReplies}
                            onCardClick={handleDiscussionClick}
                            onLike={handleLike}
                            hasLiked={hasLiked}
                        />
                    )}
                </div>

                <CreateDiscussion
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onCreateSuccess={handleCreateSuccess}
                />
            </div>
        </main>
    );
};

export default Discussions;
