import React, { useState } from 'react';
import './CreateDiscussion.css';
import { useAuth } from '../context/AuthContext';

interface CreateDiscussionProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateSuccess: () => void;
}

const CreateDiscussion: React.FC<CreateDiscussionProps> = ({ isOpen, onClose, onCreateSuccess }) => {
    const { user } = useAuth();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    
    const [formData, setFormData] = useState({
        title: '',
        category: 'General',
        content: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const categories = [
        'General',
        'Technology',
        'Politics',
        'Sports',
        'Entertainment',
        'Business',
        'Health',
        'Education',
        'Environment'
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setMessage('Please log in to create a discussion');
            return;
        }

        if (!formData.title.trim() || !formData.content.trim()) {
            setMessage('Title and content are required');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${apiBaseUrl}/api/discussions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    category: formData.category,
                    content: formData.content,
                    author: user.username,
                    userId: user.id
                })
            });

            if (response.ok) {
                setMessage('Discussion created successfully!');
                setFormData({
                    title: '',
                    category: 'General',
                    content: ''
                });
                setTimeout(() => {
                    onCreateSuccess();
                    onClose();
                }, 1500);
            } else {
                setMessage('Failed to create discussion');
            }
        } catch (error) {
            console.error('Error creating discussion:', error);
            setMessage('Error creating discussion');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Start a New Discussion</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                {!user ? (
                    <div className="login-required">
                        <p>You must be logged in to create a discussion</p>
                        <p>Please log in to continue</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="discussion-form">
                        {message && (
                            <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
                                {message}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Discussion Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="What's your discussion about?"
                                maxLength={100}
                            />
                            <span className="char-count">{formData.title.length}/100</span>
                        </div>

                        <div className="form-group">
                            <label>Category *</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Description *</label>
                            <textarea
                                name="content"
                                value={formData.content}
                                onChange={handleInputChange}
                                placeholder="Share your thoughts and start the conversation..."
                                rows={6}
                                maxLength={1000}
                            />
                            <span className="char-count">{formData.content.length}/1000</span>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={onClose}
                                className="cancel-btn"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="submit-btn"
                            >
                                {loading ? 'Creating...' : 'Create Discussion'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default CreateDiscussion;
