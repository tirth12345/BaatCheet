import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './AuthModal.css';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: 'login' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [step, setStep] = useState<'form' | 'otp'>('form');
    const [otpCode, setOtpCode] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        phone: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { sendSignupOtp, verifySignup, sendLoginOtp, verifyLogin } = useAuth();

    useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setStep('form');
            setOtpCode('');
            setError('');
            setFormData({ username: '', email: '', password: '', phone: '' });
        }
    }, [isOpen, initialMode]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let success = false;
            if (mode === 'login') {
                success = await sendLoginOtp(formData.email, formData.password);
                if (!success) setError('Invalid email or password');
            } else {
                if (!formData.username) {
                    setError('Username is required');
                    setLoading(false);
                    return;
                }
                success = await sendSignupOtp(formData.username, formData.email, formData.password, formData.phone);
                if (!success) setError('Email already exists or signup failed');
            }

            if (success) {
                setStep('otp');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otpCode || otpCode.length < 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            let success = false;
            if (mode === 'login') {
                success = await verifyLogin(formData.email, otpCode);
            } else {
                success = await verifySignup(formData.email, otpCode);
            }

            if (success) {
                setFormData({ username: '', email: '', password: '', phone: '' });
                setOtpCode('');
                setStep('form');
                onClose();
            } else {
                setError('Invalid or expired OTP');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setStep('form');
        setOtpCode('');
        setError('');
        setFormData({ username: '', email: '', password: '', phone: '' });
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                
                <h2>{mode === 'login' ? 'Login' : 'Sign Up'}</h2>
                
                {error && <div className="error-message">{error}</div>}
                
                {step === 'form' ? (
                    <form onSubmit={handleSubmit}>
                        {mode === 'signup' && (
                            <div className="form-group">
                                <label htmlFor="username">Username *</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    required
                                    placeholder="Choose a username"
                                />
                            </div>
                        )}
                        
                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="your.email@example.com"
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="password">Password *</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={6}
                                placeholder="At least 6 characters"
                            />
                        </div>
                        
                        {mode === 'signup' && (
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number (Optional)</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                        )}
                        
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? 'Sending OTP...' : (mode === 'login' ? 'Login' : 'Sign Up')}
                        </button>

                        <div className="switch-mode">
                            {mode === 'login' ? (
                                <p>Don't have an account? <span onClick={switchMode}>Sign Up</span></p>
                            ) : (
                                <p>Already have an account? <span onClick={switchMode}>Login</span></p>
                            )}
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="otp-verification-form">
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
                            We've sent a 6-digit one-time password to <strong>{formData.email}</strong>.<br/>
                            It expires in 15 minutes.
                        </p>
                        
                        <div className="form-group">
                            <label htmlFor="otpCode" style={{ textAlign: 'center' }}>Enter Verification Code</label>
                            <input
                                type="text"
                                id="otpCode"
                                value={otpCode}
                                onChange={(e) => {
                                    setOtpCode(e.target.value.replace(/[^0-9]/g, ''));
                                    setError('');
                                }}
                                required
                                maxLength={6}
                                placeholder="000000"
                                style={{ 
                                    textAlign: 'center', 
                                    letterSpacing: '12px', 
                                    fontSize: '1.5rem',
                                    fontWeight: 'bold',
                                    paddingLeft: '24px'
                                }}
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading || otpCode.length < 6}>
                            {loading ? 'Verifying...' : 'Verify OTP & Continue'}
                        </button>
                        
                        <div className="switch-mode">
                            <p><span onClick={() => { setStep('form'); setOtpCode(''); }}>&larr; Back to {mode === 'login' ? 'Login' : 'Sign Up'}</span></p>
                        </div>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

export default AuthModal;
