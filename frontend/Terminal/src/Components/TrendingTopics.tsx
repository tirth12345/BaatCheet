import React, { useEffect, useState } from 'react';
import './TrendingTopics.css';

interface TrendingTopic {
    id: number;
    hashtag: string;
    posts: number;
}

const TrendingTopics: React.FC = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const fallbackTopics: TrendingTopic[] = [
        { id: 1, hashtag: "#TechNews", posts: 1234 },
        { id: 2, hashtag: "#ClimateChange", posts: 987 },
        { id: 3, hashtag: "#Election2026", posts: 856 },
        { id: 4, hashtag: "#AI", posts: 743 },
        { id: 5, hashtag: "#LocalNews", posts: 654 }
    ];

    const [topics, setTopics] = useState<TrendingTopic[]>(fallbackTopics);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadTopics = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`${apiBaseUrl}/api/trending-topics`, {
                    signal: controller.signal
                });

                if (!response.ok) {
                    throw new Error('Failed to load trending topics.');
                }

                const data: TrendingTopic[] = await response.json();
                setTopics(data.length ? data : fallbackTopics);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load trending topics right now.');
                    setTopics(fallbackTopics);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadTopics();

        return () => controller.abort();
    }, [apiBaseUrl]);

    return (
        <div className="trending-topics">
            <h3>🔥 Trending Topics</h3>
            {isLoading && <p>Loading trending topics...</p>}
            {error && <p>{error}</p>}
            <ul className="topics-list">
                {topics.map(topic => (
                    <li key={topic.id} className="topic-item">
                        <span className="hashtag">{topic.hashtag}</span>
                        <span className="post-count">{topic.posts.toLocaleString()} posts</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TrendingTopics;
