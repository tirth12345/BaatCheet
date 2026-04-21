import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
    id: string;
    username: string;
    email: string;
    phone?: string;
    profilePicture?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    signup: (username: string, email: string, password: string, phone?: string) => Promise<boolean>;
    logout: () => void;
    updateProfile: (userData: Partial<User>, profilePic?: File) => Promise<boolean>;
    sendSignupOtp: (username: string, email: string, password: string, phone?: string) => Promise<boolean>;
    verifySignup: (email: string, otp: string) => Promise<boolean>;
    sendLoginOtp: (email: string, password: string) => Promise<boolean>;
    verifyLogin: (email: string, otp: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

    // Check if user is already logged in on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const userData = JSON.parse(storedUser);
            // Migration: handle old user objects that have _id instead of id
            if (!userData.id && userData._id) {
                userData.id = userData._id;
                localStorage.setItem('user', JSON.stringify(userData));
            }
            setUser(userData);
            setIsAuthenticated(true);
        }
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Login response received:', userData);
                setUser(userData);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(userData));
                console.log('User stored in localStorage:', userData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const signup = async (username: string, email: string, password: string, phone?: string): Promise<boolean> => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, phone })
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Signup response received:', userData);
                setUser(userData);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(userData));
                console.log('User stored in localStorage after signup:', userData);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Signup error:', error);
            return false;
        }
    };

    const sendSignupOtp = async (username: string, email: string, password: string, phone?: string): Promise<boolean> => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/send-signup-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, phone })
            });
            return response.ok;
        } catch (error) {
            console.error('Send signup OTP error:', error);
            return false;
        }
    };

    const verifySignup = async (email: string, otp: string): Promise<boolean> => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/verify-signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(userData));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Verify signup OTP error:', error);
            return false;
        }
    };

    const sendLoginOtp = async (email: string, password: string): Promise<boolean> => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/send-login-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            return response.ok;
        } catch (error) {
            console.error('Send login OTP error:', error);
            return false;
        }
    };

    const verifyLogin = async (email: string, otp: string): Promise<boolean> => {
        try {
            const response = await fetch(`${apiBaseUrl}/api/auth/verify-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
                setIsAuthenticated(true);
                localStorage.setItem('user', JSON.stringify(userData));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Verify login OTP error:', error);
            return false;
        }
    };

    const logout = () => {
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
    };

    const updateProfile = async (userData: Partial<User>, profilePic?: File): Promise<boolean> => {
        try {
            const formData = new FormData();
            if (profilePic) {
                formData.append('profilePicture', profilePic);
            }
            formData.append('userData', JSON.stringify({ ...userData, id: user?.id }));

            const response = await fetch(`${apiBaseUrl}/api/auth/update-profile`, {
                method: 'PUT',
                body: formData
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Profile update error:', error);
            return false;
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, isAuthenticated, login, signup, logout, updateProfile,
            sendSignupOtp, verifySignup, sendLoginOtp, verifyLogin 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
