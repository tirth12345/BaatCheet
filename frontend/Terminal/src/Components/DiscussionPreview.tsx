import React, { useEffect, useState } from 'react';
import '../pages/Discussions.css';
import { Link } from 'react-router-dom';

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

const fallbackDiscussions: Discussion[] = [
    {
        id: 1,
        title: "What's the impact of AI on traditional jobs?",
        topic: "Technology",
        author: "TechThinker42",
        timestamp: "3 hours ago",
        excerpt: "Let's discuss how artificial intelligence is reshaping the job market and what skills will be most valuable...",
        replies: 156,
        views: 3200,
        likes: 487
    },
    {
        id: 2,
        title: "Best practices for remote work productivity",
        topic: "Work Culture",
        author: "ProductivityGuru",
        timestamp: "6 hours ago",
        excerpt: "Share your tips and tricks for maintaining focus and productivity while working from home...",
        replies: 89,
        views: 2100,
        likes: 312
    },
    {
        id: 3,
        title: "Climate change solutions - what can individuals do?",
        topic: "Environment",
        author: "EcoWarrior",
        timestamp: "8 hours ago",
        excerpt: "An engaging discussion about personal actions and collective efforts to combat climate change...",
        replies: 234,
        views: 4500,
        likes: 621
    }
];

const DiscussionPreviewCard: React.FC<{ discussion: Discussion }> = ({ discussion }) => (
    <div className="discussion-preview-card">
        <span className="topic-badge">{discussion.topic}</span>
        <h4 className="discussion-title">{discussion.title}</h4>
        <p className="discussion-excerpt">{discussion.excerpt}</p>
        <div className="discussion-meta">
            <span className="author">{discussion.author}</span>
            <span className="timestamp">{discussion.timestamp}</span>
        </div>
        <div className="discussion-stats">
            <span>💬 {discussion.replies}</span>
            <span>👁️ {discussion.views.toLocaleString()}</span>
            <span>❤️ {discussion.likes}</span>
        </div>
    </div>
);

const DiscussionPreview: React.FC = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const [discussions, setDiscussions] = useState<Discussion[]>(fallbackDiscussions);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadDiscussions = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${apiBaseUrl}/api/discussions/trending?limit=3`, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to load discussions.');
                }

                const data: Discussion[] = await response.json();
                setDiscussions(data.length ? data.slice(0, 3) : fallbackDiscussions);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load discussions right now.');
                    setDiscussions(fallbackDiscussions);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadDiscussions();

        return () => controller.abort();
    }, [apiBaseUrl]);

    return (
        <div className="discussion-preview-section">
            <div className="discussion-preview-header">
                <h3>💬 Trending Discussions</h3>
                <Link to="/discussions">View All →</Link>
            </div>

            {isLoading && <p>Loading discussions...</p>}
            {error && <p>{error}</p>}

            <div className="discussion-preview-grid">
                {discussions.map(discussion => (
                    <DiscussionPreviewCard key={discussion.id} discussion={discussion} />
                ))}
            </div>
        </div>
    );
};

export default DiscussionPreview;
