import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './DiscussionDetail.css';
import { useAuth } from '../context/AuthContext';

interface Reply {
    id: number;
    author: string;
    content: string;
    timestamp: string;
    likes: number;
}

interface DiscussionDetail {
    id: number;
    title: string;
    category: string;
    author: string;
    timestamp: string;
    content: string;
    replies: Reply[];
    views: number;
    likes: number;
}

const DiscussionDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
    const [replyText, setReplyText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [likes, setLikes] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const loadDiscussion = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const viewKey = `discussion:${id}:view`;
                let trackView = false;
                try {
                    trackView = localStorage.getItem(viewKey) !== '1';
                } catch {
                    trackView = false;
                }

                const url = `${apiBaseUrl}/api/discussions/${id}${trackView ? '?trackView=1' : ''}`;
                const response = await fetch(url, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to load discussion.');
                }

                const data: DiscussionDetail = await response.json();
                setDiscussion(data);
                setLikes(data.likes || 0);

                if (trackView) {
                    try {
                        localStorage.setItem(viewKey, '1');
                    } catch {
                        // Ignore storage errors
                    }
                }

                // Check if user already liked this discussion
                const likedDiscussions = JSON.parse(localStorage.getItem('likedDiscussions') || '[]');
                setHasLiked(likedDiscussions.includes(parseInt(id || '0')));
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load this discussion.');
                    setDiscussion(null);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadDiscussion();
        return () => controller.abort();
    }, [id, apiBaseUrl]);

    const handleLike = async () => {
        if (hasLiked || !discussion) return;

        try {
            const response = await fetch(`${apiBaseUrl}/api/discussions/${id}/like`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setLikes(data.likes);
                setHasLiked(true);

                // Save to localStorage
                const likedDiscussions = JSON.parse(localStorage.getItem('likedDiscussions') || '[]');
                if (!likedDiscussions.includes(parseInt(id || '0'))) {
                    likedDiscussions.push(parseInt(id || '0'));
                    localStorage.setItem('likedDiscussions', JSON.stringify(likedDiscussions));
                }
            }
        } catch (error) {
            console.error('Error liking discussion:', error);
        }
    };

    const handleSubmitReply = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setMessage('Please log in to reply');
            return;
        }

        if (!replyText.trim()) {
            setMessage('Reply cannot be empty');
            return;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/api/discussions/${id}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    author: user.username,
                    content: replyText,
                    userId: user.id
                })
            });

            if (response.ok) {
                const newReply = await response.json();
                setDiscussion(prev => prev ? ({
                    ...prev,
                    replies: [...prev.replies, newReply]
                }) : prev);
                setReplyText('');
                setMessage('Reply posted successfully!');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Failed to post reply');
            }
        } catch (error) {
            console.error('Error posting reply:', error);
            setMessage('Error posting reply');
        }
    };

    const handleLikeReply = async (replyId: number) => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/discussions/${id}/replies/${replyId}/like`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setDiscussion(prev => prev ? ({
                    ...prev,
                    replies: prev.replies.map(r =>
                        r.id === replyId ? { ...r, likes: data.likes } : r
                    )
                }) : prev);
            }
        } catch (error) {
            console.error('Error liking reply:', error);
        }
    };

    return (
        <main className="discussion-detail-container">
            <div className="discussion-detail-content">
                <button className="back-btn" onClick={() => navigate('/discussions')}>
                    ← Back to Discussions
                </button>

                {isLoading && <p className="loading">Loading discussion...</p>}
                {error && <p className="error">{error}</p>}

                {!isLoading && discussion && (
                    <>
                        {/* Discussion Header */}
                        <article className="discussion-article">
                            <div className="article-header">
                                <div className="header-info">
                                    <span className="category-badge">{discussion.category}</span>
                                    <div className="meta">
                                        <span className="author">{discussion.author}</span>
                                        <span className="timestamp">{discussion.timestamp}</span>
                                    </div>
                                </div>
                            </div>

                            <h1 className="article-title">{discussion.title}</h1>

                            <p className="article-content">{discussion.content}</p>

                            {/* Discussion Actions */}
                            <div className="article-actions">
                                <button
                                    className={`action-btn like ${hasLiked ? 'liked' : ''}`}
                                    onClick={handleLike}
                                    disabled={hasLiked}
                                >
                                    <span>❤️ {likes} Likes</span>
                                </button>
                                <button className="action-btn">
                                    <span>💬 {discussion.replies.length} Replies</span>
                                </button>
                                <button className="action-btn">
                                    <span>👁️ {discussion.views} Views</span>
                                </button>
                            </div>
                        </article>

                        {/* Add Reply Section */}
                        <section className="add-reply-section">
                            <h2>Join the Discussion</h2>
                            {message && (
                                <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                                    {message}
                                </div>
                            )}

                            {user ? (
                                <form onSubmit={handleSubmitReply} className="reply-form">
                                    <div className="form-group">
                                        <label>Your Reply</label>
                                        <textarea
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Share your thoughts..."
                                            rows={4}
                                        />
                                    </div>
                                    <button type="submit" className="submit-btn">
                                        Post Reply
                                    </button>
                                </form>
                            ) : (
                                <div className="login-prompt">
                                    <p>Please log in to participate in this discussion</p>
                                    <button onClick={() => navigate('/')} className="login-btn">
                                        Go to Login
                                    </button>
                                </div>
                            )}
                        </section>

                        {/* Replies Section */}
                        <section className="replies-section">
                            <h2>Replies ({discussion.replies.length})</h2>
                            {discussion.replies.length === 0 ? (
                                <p className="no-replies">No replies yet. Be the first to share your thoughts!</p>
                            ) : (
                                <div className="replies-list">
                                    {discussion.replies.map(reply => (
                                        <div key={reply.id} className="reply-card">
                                            <div className="reply-header">
                                                <span className="reply-author">{reply.author}</span>
                                                <span className="reply-timestamp">{reply.timestamp}</span>
                                            </div>
                                            <p className="reply-content">{reply.content}</p>
                                            <button
                                                className="reply-like-btn"
                                                onClick={() => handleLikeReply(reply.id)}
                                            >
                                                ❤️ {reply.likes}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
                {!isLoading && !discussion && !error && (
                    <p className="error">Discussion not found.</p>
                )}
            </div>
        </main>
    );
};

export default DiscussionDetail;
