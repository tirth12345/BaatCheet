import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface NewsDiscussion {
    id: number;
    author: string;
    avatar?: string;
    timestamp: string;
    content: string;
    likes: number;
    replies: number;
}

interface NewsDiscussionThreadProps {
    newsId: number;
}

const DiscussionThread: React.FC<NewsDiscussionThreadProps> = ({ newsId }) => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const { user } = useAuth();
    const [discussions, setDiscussions] = useState<NewsDiscussion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [newComment, setNewComment] = useState('');
    const [posting, setPosting] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        const loadDiscussions = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${apiBaseUrl}/api/news/${newsId}/discussions`, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to load discussions.');
                }

                const data: NewsDiscussion[] = await response.json();
                setDiscussions(data);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load discussions.');
                    setDiscussions([]);
                }
            } finally {
                setIsLoading(false);
            }
        };

        if (newsId) {
            loadDiscussions();
        }

        return () => controller.abort();
    }, [newsId, apiBaseUrl]);

    const handlePostComment = async () => {
        if (!newComment.trim()) return;
        
        if (!user) {
            alert('Please log in to post comments');
            return;
        }

        console.log('User object from auth context:', user);
        console.log('User ID being sent:', user.id);

        setPosting(true);
        setError(null);

        try {
            // Get the news article title
            const newsResponse = await fetch(`${apiBaseUrl}/api/news/${newsId}`);
            let newsTitle = 'News Article';
            
            if (newsResponse.ok) {
                const newsData = await newsResponse.json();
                newsTitle = newsData.title;
            }

            // Save comment to backend
            const response = await fetch(`${apiBaseUrl}/api/user/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    newsId: newsId,
                    newsTitle: newsTitle,
                    comment: newComment
                })
            });

            if (response.ok) {
                const savedComment = await response.json();
                
                // Add to local state for immediate display
                const displayComment: NewsDiscussion = {
                    id: savedComment.id,
                    author: user.username,
                    timestamp: "just now",
                    content: newComment,
                    likes: 0,
                    replies: 0
                };
                
                setDiscussions([displayComment, ...discussions]);
                setNewComment('');
            } else {
                throw new Error('Failed to post comment');
            }
        } catch (err) {
            console.error('Error posting comment:', err);
            setError('Failed to post comment. Please try again.');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="discussion-thread">
            <h2>💬 Community Discussion</h2>
            <p className="discussion-subtitle">Join the conversation and share your thoughts about this news.</p>

            {isLoading && <p className="loading">Loading discussions...</p>}
            {error && <p className="error">{error}</p>}

            {/* Post Comment Form */}
            <div className="comment-form-section">
                <textarea
                    className="comment-input"
                    placeholder="Share your thoughts... (Be respectful and constructive)"
                    rows={4}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    disabled={posting}
                />
                <div className="form-actions">
                    <button
                        className="post-btn"
                        onClick={handlePostComment}
                        disabled={!newComment.trim() || posting}
                    >
                        {posting ? 'Posting...' : 'Post Comment'}
                    </button>
                    <span className="char-count">{newComment.length}/500</span>
                </div>
            </div>

            {/* Discussions List */}
            <div className="discussions-list">
                {discussions.length === 0 && !isLoading && !error && (
                    <p className="empty-state">No comments yet. Be the first to comment.</p>
                )}
                {discussions.map(discussion => (
                    <div key={discussion.id} className="discussion-item">
                        <div className="discussion-header">
                            <div className="author-info">
                                <div className="avatar">{discussion.author.charAt(0).toUpperCase()}</div>
                                <div>
                                    <h4 className="author-name">{discussion.author}</h4>
                                    <span className="timestamp">{discussion.timestamp}</span>
                                </div>
                            </div>
                        </div>
                        <p className="discussion-content">{discussion.content}</p>
                        <div className="discussion-actions">
                            <button className="action-link">
                                👍 {discussion.likes} Likes
                            </button>
                            <button className="action-link">
                                💬 {discussion.replies} Replies
                            </button>
                            <button className="action-link">Share</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DiscussionThread;
