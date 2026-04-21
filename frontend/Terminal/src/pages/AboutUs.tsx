import React from 'react';
import './AboutUs.css';

const AboutUs: React.FC = () => {
    return (
        <div className="about-container">
            <div className="about-hero">
                <h1>About Us</h1>
                <p className="about-tagline">Connecting Communities Through Information</p>
            </div>

            <div className="about-content">
                <section className="about-section">
                    <h2>Our Mission</h2>
                    <p>
                        We are dedicated to creating a platform where communities can stay informed, 
                        engage in meaningful discussions, and share perspectives on the topics that 
                        matter most. Our goal is to foster informed dialogue and connect people through 
                        quality news and interactive discussions.
                    </p>
                </section>

                <section className="about-section">
                    <h2>What We Offer</h2>
                    <div className="features-grid">
                        <div className="feature-card">
                            <div className="feature-icon">📰</div>
                            <h3>Curated News</h3>
                            <p>
                                Stay updated with the latest news across multiple categories including 
                                technology, politics, sports, and entertainment.
                            </p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">💬</div>
                            <h3>Community Discussions</h3>
                            <p>
                                Engage with a vibrant community through thoughtful discussions and 
                                share your perspectives on current events.
                            </p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🔥</div>
                            <h3>Trending Topics</h3>
                            <p>
                                Discover what's trending and join conversations that are shaping 
                                public discourse.
                            </p>
                        </div>
                        <div className="feature-card">
                            <div className="feature-icon">🌐</div>
                            <h3>Global Perspective</h3>
                            <p>
                                Access diverse viewpoints and news from around the world to stay 
                                globally informed.
                            </p>
                        </div>
                    </div>
                </section>

                <section className="about-section">
                    <h2>Our Values</h2>
                    <div className="values-list">
                        <div className="value-item">
                            <h4>Integrity</h4>
                            <p>We are committed to providing accurate and reliable information.</p>
                        </div>
                        <div className="value-item">
                            <h4>Community</h4>
                            <p>Building a respectful and inclusive space for all voices.</p>
                        </div>
                        <div className="value-item">
                            <h4>Innovation</h4>
                            <p>Continuously improving our platform to serve you better.</p>
                        </div>
                        <div className="value-item">
                            <h4>Transparency</h4>
                            <p>Open communication and honest dialogue with our users.</p>
                        </div>
                    </div>
                </section>

                <section className="about-section team-section">
                    <h2>Our Story</h2>
                    <p>
                        Founded with the vision of creating a space where information meets community, 
                        our platform has grown to serve thousands of users seeking quality news and 
                        meaningful interactions. We believe in the power of informed communities and 
                        the importance of diverse perspectives in shaping a better understanding of 
                        our world.
                    </p>
                    <p>
                        Every day, we work to bring you the most relevant news and facilitate 
                        discussions that matter. Whether you're here to stay informed, share your 
                        views, or connect with like-minded individuals, we're here to support your 
                        journey.
                    </p>
                </section>
            </div>
        </div>
    );
};

export default AboutUs;
