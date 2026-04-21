import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Hero.css';

const Hero: React.FC = () => {
    const navigate = useNavigate();

    return (
        <section className="hero">
            <div className="hero-content">
                <h1>Welcome to BaatCheet</h1>
                <p>Your Dynamic, Community-Driven News Platform</p>
                <p className="hero-subtitle">Experience live debates, real-time discussions, and stay informed on what matters most.</p>
                <div className="hero-buttons">
                    <button className="btn-primary" onClick={() => navigate('/news')}>Explore News</button>
                    <button className="btn-secondary" onClick={() => navigate('/discussions')}>Join Discussions</button>
                </div>
            </div>
        </section>
    );
};

export default Hero;
