import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Comment {
    _id: string;
    newsId: number;
    newsTitle: string;
    comment: string;
    timestamp: string;
}

interface Bookmark {
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
    bookmarkedAt: string;
}

interface UserDiscussion {
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

const Dashboard: React.FC = () => {
    const { user, logout, updateProfile } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    const [isEditing, setIsEditing] = useState(false);
    const [profileData, setProfileData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        phone: user?.phone || ''
    });
    const [profilePicPreview, setProfilePicPreview] = useState<string | undefined>(
        user?.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${apiBaseUrl}${user.profilePicture}`) : undefined
    );
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
    const [discussions, setDiscussions] = useState<UserDiscussion[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!user) {
            navigate('/');
            return;
        }
        // Update profile data when user changes
        setProfileData({
            username: user.username || '',
            email: user.email || '',
            phone: user.phone || ''
        });
        setProfilePicPreview(
            user.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${apiBaseUrl}${user.profilePicture}`) : undefined
        );
        fetchUserComments();
        fetchBookmarks();
        fetchUserDiscussions();
    }, [user, navigate, apiBaseUrl]);

    const fetchBookmarks = () => {
        try {
            const savedBookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
            setBookmarks(savedBookmarks);
        } catch (error) {
            console.error('Error fetching bookmarks:', error);
            setBookmarks([]);
        }
    };

    const fetchUserComments = async () => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/user/comments/${user?.id}`);
            if (response.ok) {
                const data = await response.json();
                setComments(data);
            }
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const fetchUserDiscussions = async () => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/user/discussions/${user?.id}`);
            if (response.ok) {
                const data = await response.json();
                setDiscussions(data);
            }
        } catch (error) {
            console.error('Error fetching discussions:', error);
        }
    };

    const handleDeleteDiscussion = async (discussionId: number) => {
        if (!window.confirm('Are you sure you want to delete this discussion?')) {
            return;
        }

        try {
            const response = await fetch(`${apiBaseUrl}/api/discussions/${discussionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: user?.id })
            });

            if (response.ok) {
                setDiscussions(prev => prev.filter(d => d.id !== discussionId));
                setMessage('Discussion deleted successfully');
                setTimeout(() => setMessage(''), 3000);
            } else {
                const error = await response.json();
                setMessage(error.error || 'Failed to delete discussion');
            }
        } catch (error) {
            console.error('Error deleting discussion:', error);
            setMessage('Error deleting discussion');
        }
    };

    const handleProfilePicClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                setMessage('File size must be less than 5MB');
                return;
            }
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfilePicPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        setMessage('');
        
        const success = await updateProfile(profileData, selectedFile || undefined);
        
        if (success) {
            setMessage('Profile updated successfully!');
            setIsEditing(false);
            setSelectedFile(null);
        } else {
            setMessage('Failed to update profile');
        }
        
        setLoading(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!window.confirm('Are you sure you want to delete this comment?')) return;

        try {
            const response = await fetch(`${apiBaseUrl}/api/user/comments/${commentId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?.id })
            });

            if (response.ok) {
                setComments(comments.filter(c => c._id !== commentId));
                setMessage('Comment deleted successfully');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            setMessage('Failed to delete comment');
        }
    };

    const handleRemoveBookmark = (bookmarkId: number) => {
        if (!window.confirm('Remove this bookmark?')) return;

        try {
            const updatedBookmarks = bookmarks.filter(b => b.id !== bookmarkId);
            localStorage.setItem('bookmarks', JSON.stringify(updatedBookmarks));
            setBookmarks(updatedBookmarks);
            setMessage('Bookmark removed');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error removing bookmark:', error);
            setMessage('Failed to remove bookmark');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>My Dashboard</h1>
                <button onClick={handleLogout} className="logout-btn">Logout</button>
            </div>

            {message && <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>{message}</div>}

            <div className="dashboard-content">
                {/* Profile Section */}
                <section className="profile-section">
                    <h2>Profile Information</h2>
                    <div className="profile-card">
                        <div className="profile-pic-container">
                            <img
                                src={profilePicPreview || 'https://via.placeholder.com/150'}
                                alt="Profile"
                                className="profile-pic"
                                onClick={handleProfilePicClick}
                            />
                            <div className="pic-overlay" onClick={handleProfilePicClick}>
                                <span>📷 Change Photo</span>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="profile-info">
                            {isEditing ? (
                                <>
                                    <div className="form-group">
                                        <label>Username</label>
                                        <input
                                            type="text"
                                            name="username"
                                            value={profileData.username}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={profileData.email}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={profileData.phone}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="button-group">
                                        <button onClick={handleSaveProfile} disabled={loading} className="save-btn">
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                        <button onClick={() => setIsEditing(false)} className="cancel-btn">
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="info-item">
                                        <strong>Username:</strong> {user?.username}
                                    </div>
                                    <div className="info-item">
                                        <strong>Email:</strong> {user?.email}
                                    </div>
                                    <div className="info-item">
                                        <strong>Phone:</strong> {user?.phone || 'Not provided'}
                                    </div>
                                    <button onClick={() => setIsEditing(true)} className="edit-btn">
                                        Edit Profile
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* Bookmarks Section */}
                <section className="bookmarks-section">
                    <h2>📚 My Bookmarks</h2>
                    {bookmarks.length === 0 ? (
                        <div className="no-bookmarks">
                            <p>You haven't bookmarked any news yet.</p>
                            <button onClick={() => navigate('/news')} className="browse-btn">
                                Browse News
                            </button>
                        </div>
                    ) : (
                        <div className="bookmarks-list">
                            {bookmarks.map((bookmark) => (
                                <div key={bookmark.id} className="bookmark-card">
                                    <div className="bookmark-header">
                                        <div className="bookmark-title-section">
                                            <span className="category-badge">{bookmark.category}</span>
                                            <h4>{bookmark.title}</h4>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveBookmark(bookmark.id)}
                                            className="remove-bookmark-btn"
                                            title="Remove bookmark"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <p className="bookmark-content">{bookmark.content}</p>
                                    <div className="bookmark-meta">
                                        <span className="author">By {bookmark.author}</span>
                                        <span className="timestamp">{bookmark.timestamp}</span>
                                    </div>
                                    <div className="bookmark-stats">
                                        <span>👍 {bookmark.upvotes}</span>
                                        <span>💬 {bookmark.comments}</span>
                                        <span>👁️ {bookmark.views ?? 0}</span>
                                        <span>🔗 {bookmark.shares ?? 0}</span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/news/${bookmark.id}`)}
                                        className="view-bookmark-btn"
                                    >
                                        Read Full Article
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* My Discussions Section */}
                <section className="my-discussions-section">
                    <h2>🗨️ My Discussions</h2>
                    {discussions.length === 0 ? (
                        <div className="no-discussions">
                            <p>You haven't started any discussions yet.</p>
                            <button onClick={() => navigate('/discussions')} className="browse-btn">
                                Start a Discussion
                            </button>
                        </div>
                    ) : (
                        <div className="my-discussions-list">
                            {discussions.map((discussion) => (
                                <div key={discussion.id} className="my-discussion-card">
                                    <div className="my-discussion-header">
                                        <div className="header-left">
                                            <span className="topic-badge">{discussion.topic}</span>
                                            <span className="timestamp">{discussion.timestamp}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteDiscussion(discussion.id)}
                                            className="delete-discussion-btn"
                                            title="Delete discussion"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <h4>{discussion.title}</h4>
                                    <p className="my-discussion-excerpt">{discussion.excerpt}</p>
                                    <div className="my-discussion-stats">
                                        <span>❤️ {discussion.likes}</span>
                                        <span>💬 {discussion.replies}</span>
                                        <span>👁️ {discussion.views}</span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/discussions/${discussion.id}`)}
                                        className="view-discussion-btn"
                                    >
                                        View Discussion
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Comments/Discussions Section */}
                <section className="comments-section">
                    <h2>My Discussions & Comments</h2>
                    {comments.length === 0 ? (
                        <div className="no-comments">
                            <p>You haven't participated in any discussions yet.</p>
                            <button onClick={() => navigate('/news')} className="browse-btn">
                                Browse News
                            </button>
                        </div>
                    ) : (
                        <div className="comments-list">
                            {comments.map((comment) => (
                                <div key={comment._id} className="comment-card">
                                    <div className="comment-header">
                                        <h4>{comment.newsTitle}</h4>
                                        <button
                                            onClick={() => handleDeleteComment(comment._id)}
                                            className="delete-comment-btn"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <p className="comment-text">{comment.comment}</p>
                                    <div className="comment-footer">
                                        <span className="comment-time">{comment.timestamp}</span>
                                        <button
                                            onClick={() => navigate(`/news/${comment.newsId}`)}
                                            className="view-news-btn"
                                        >
                                            View News
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
