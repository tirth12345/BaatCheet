import React, { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate } from 'react-router-dom';
import './Navbar.css';
// import BaatCheetLogo removed
import BaatCheet_nobg from '../assets/BaatCheet_nobg.png';
import Profile_Button from '../assets/Profile_Button.png';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

interface NewsPost {
    id: number;
    title: string;
    category: string;
    author: string;
}

const Navbar: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<NewsPost[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
    const profileDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const controller = new AbortController();

        const searchNews = async () => {
            if (!searchQuery.trim()) {
                setSearchResults([]);
                setShowDropdown(false);
                return;
            }

            setIsSearching(true);
            setShowDropdown(true);

            try {
                const response = await fetch(
                    `${apiBaseUrl}/api/news/search?q=${encodeURIComponent(searchQuery)}`,
                    { signal: controller.signal }
                );

                if (response.ok) {
                    const data: NewsPost[] = await response.json();
                    setSearchResults(data);
                }
            } catch (err) {
                if (!(err instanceof DOMException && err.name === 'AbortError')) {
                    setSearchResults([]);
                }
            } finally {
                setIsSearching(false);
            }
        };

        const debounceTimer = setTimeout(searchNews, 300);
        return () => {
            clearTimeout(debounceTimer);
            controller.abort();
        };
    }, [searchQuery, apiBaseUrl]);


    const toggleProfileDropdown = () => {
        setShowProfileDropdown(!showProfileDropdown);
    };

    const handleLogin = () => {
        setAuthModalMode('login');
        setShowAuthModal(true);
        setShowProfileDropdown(false);
    };

    const handleSignup = () => {
        setAuthModalMode('signup');
        setShowAuthModal(true);
        setShowProfileDropdown(false);
    };

    const handleDashboard = () => {
        navigate('/dashboard');
        setShowProfileDropdown(false);
    };

    // Close profile dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
                setShowProfileDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    const handleSelectResult = (id: number) => {
        navigate(`/news/${id}`);
        setSearchQuery('');
        setShowDropdown(false);
    };

    return (
        <nav className="navbar">
            <a href="#"><img src={BaatCheet_nobg} alt="Logo" className="logo" /></a>
            <div className="Menu">
                <NavLink to="/" className="nav-link">Home</NavLink>
                <NavLink to="/news" className="nav-link">News</NavLink>
                <NavLink to="/discussions" className="nav-link">Discussions</NavLink>
                <NavLink to="/video-chat" className="nav-link">Video Chat</NavLink>
                <NavLink to="/AboutUs" className="nav-link">About</NavLink>
                <NavLink to="/ContactUs" className="nav-link">Contact</NavLink>

                {/* Search Bar with Dropdown */}
                <div className="search-container">
                    <input
                        type="text"
                        className="search-bar"
                        placeholder="Search news..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />

                    {/* Search Dropdown */}
                    {showDropdown && (
                        <div className="search-dropdown">
                            {isSearching && (
                                <div className="dropdown-item loading">
                                    <p>Searching...</p>
                                </div>
                            )}

                            {!isSearching && searchResults.length === 0 && searchQuery && (
                                <div className="dropdown-item no-results">
                                    <p>No results for "{searchQuery}"</p>
                                </div>
                            )}

                            {searchResults.map(result => (
                                <div
                                    key={result.id}
                                    className="dropdown-item"
                                    onClick={() => handleSelectResult(result.id)}
                                >
                                    <div className="result-title">{result.title}</div>
                                    <div className="result-meta">
                                        <span className="category">{result.category}</span>
                                        <span className="author">{result.author}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Profile Button with Dropdown */}
                <div className="profile-dropdown-container" ref={profileDropdownRef}>
                    <button className="profile-button" onClick={toggleProfileDropdown}>
                        <img src={user?.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${apiBaseUrl}${user.profilePicture}`) : Profile_Button} alt="Profile" className="buttonsvg" />
                    </button>

                    {showProfileDropdown && (
                        <div className="profile-dropdown">
                            {isAuthenticated ? (
                                <>
                                    <div className="profile-dropdown-header">
                                        <img src={user?.profilePicture ? (user.profilePicture.startsWith('http') ? user.profilePicture : `${apiBaseUrl}${user.profilePicture}`) : Profile_Button} alt="Profile" className="dropdown-profile-pic" />
                                        <div>
                                            <div className="dropdown-username">{user?.username}</div>
                                            <div className="dropdown-email">{user?.email}</div>
                                        </div>
                                    </div>
                                    <div className="profile-dropdown-divider"></div>
                                    <button onClick={handleDashboard} className="profile-dropdown-item">
                                        📊 Dashboard
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={handleLogin} className="profile-dropdown-item">
                                        🔑 Login
                                    </button>
                                    <button onClick={handleSignup} className="profile-dropdown-item">
                                        ✨ Sign Up
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Auth Modal */}
            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                initialMode={authModalMode}
            />
        </nav>
    );
};
export default Navbar;
