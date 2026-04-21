import React, { useEffect, useState } from 'react';
import './Sidebar.css';
import TrendingTopics from './TrendingTopics';

interface CommunityStats {
    activeUsers: number;
    totalDiscussions: number;
    todaysPosts: number;
}

interface TopContributor {
    id: number;
    name: string;
    posts: number;
}

const Sidebar: React.FC = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    const fallbackStats: CommunityStats = {
        activeUsers: 1247,
        totalDiscussions: 5632,
        todaysPosts: 234
    };

    const fallbackTopContributors: TopContributor[] = [
        { id: 1, name: "NewsHunter", posts: 45 },
        { id: 2, name: "TechGuru", posts: 38 },
        { id: 3, name: "DebateMaster", posts: 32 }
    ];

    const [stats, setStats] = useState<CommunityStats>(fallbackStats);
    const [topContributors, setTopContributors] = useState<TopContributor[]>(fallbackTopContributors);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const loadSidebarData = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const [statsResponse, contributorsResponse] = await Promise.all([
                    fetch(`${apiBaseUrl}/api/community-stats`, { signal: controller.signal }),
                    fetch(`${apiBaseUrl}/api/top-contributors`, { signal: controller.signal })
                ]);

                if (!statsResponse.ok || !contributorsResponse.ok) {
                    throw new Error('Failed to load sidebar data.');
                }

                const statsData: CommunityStats = await statsResponse.json();
                const contributorsData: TopContributor[] = await contributorsResponse.json();

                setStats(statsData);
                setTopContributors(contributorsData.length ? contributorsData : fallbackTopContributors);
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setError('Unable to load sidebar data right now.');
                    setStats(fallbackStats);
                    setTopContributors(fallbackTopContributors);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadSidebarData();

        return () => controller.abort();
    }, [apiBaseUrl]);

    return (
        <aside className="sidebar">
            {/* Community Stats */}
            <div className="stats-widget">
                <h3>📊 Community Stats</h3>
                {isLoading && <p>Loading community stats...</p>}
                {error && <p>{error}</p>}
                {stats && (
                    <>
                        <div className="stat-item">
                            <span className="stat-label">Active Users</span>
                            <span className="stat-value">{typeof stats.activeUsers === 'number' ? stats.activeUsers.toLocaleString() : stats.activeUsers}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Discussions</span>
                            <span className="stat-value">{typeof stats.totalDiscussions === 'number' ? stats.totalDiscussions.toLocaleString() : stats.totalDiscussions}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Posts Today</span>
                            <span className="stat-value">{stats.todaysPosts}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Trending Topics */}
            <TrendingTopics />

            {/* Top Contributors */}
            <div className="contributors-widget">
                <h3>⭐ Top Contributors</h3>
                {isLoading && <p>Loading contributors...</p>}
                {error && <p>{error}</p>}
                <ul className="contributors-list">
                    {topContributors.map((contributor, index) => (
                        <li key={contributor.id} className="contributor-item">
                            <span className="rank">#{index + 1}</span>
                            <span className="contributor-name">{contributor.name}</span>
                            <span className="contributor-posts">{contributor.posts} posts</span>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
    );
};

export default Sidebar;
