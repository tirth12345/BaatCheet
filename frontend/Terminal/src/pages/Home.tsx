import React, { useState } from 'react';
import Hero from '../Components/Hero';
import NewsFeed from '../Components/NewsFeed';
import DiscussionPreview from '../Components/DiscussionPreview';

const Home: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    return (
        <>
            <Hero />
            <main className="main-container">
                <div className="content-area">
                    {/* Category Filter Buttons */}
                    <div className="category-filter">
                        <button
                            className={`category-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('All')}
                        >
                            All News
                        </button>
                        <button
                            className={`category-btn ${selectedCategory === 'Technology' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('Technology')}
                        >
                            Technology
                        </button>
                        <button
                            className={`category-btn ${selectedCategory === 'Politics' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('Politics')}
                        >
                            Politics
                        </button>
                        <button
                            className={`category-btn ${selectedCategory === 'Sports' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('Sports')}
                        >
                            Sports
                        </button>
                        <button
                            className={`category-btn ${selectedCategory === 'Entertainment' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('Entertainment')}
                        >
                            Entertainment
                        </button>
                        <button
                            className={`category-btn ${selectedCategory === 'Business' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('Business')}
                        >
                            Business
                        </button>
                    </div>

                    <h2 style={{ marginTop: '20px', marginBottom: '16px' }}>📰 Latest News</h2>
                    <NewsFeed limit={3} selectedCategory={selectedCategory} />
                    <DiscussionPreview />
                </div>
            </main>
        </>
    );
};

export default Home;
