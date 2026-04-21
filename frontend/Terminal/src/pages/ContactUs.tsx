import React, { useState } from 'react';
import './ContactUs.css';

const ContactUs: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });

    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here you would typically send the form data to your backend
        console.log('Form submitted:', formData);
        setSubmitted(true);
        
        // Reset form after 3 seconds
        setTimeout(() => {
            setFormData({
                name: '',
                email: '',
                subject: '',
                message: ''
            });
            setSubmitted(false);
        }, 3000);
    };

    return (
        <div className="contact-container">
            <div className="contact-hero">
                <h1>Contact Us</h1>
                <p className="contact-tagline">We'd love to hear from you</p>
            </div>

            <div className="contact-content">
                <div className="contact-info-section">
                    <div className="info-cards">
                        <div className="info-card">
                            <div className="info-icon">📧</div>
                            <h3>Email Us</h3>
                            <p>support@newsplatform.com</p>
                            <p className="info-subtext">We'll respond within 24 hours</p>
                        </div>
                        <div className="info-card">
                            <div className="info-icon">📱</div>
                            <h3>Call Us</h3>
                            <p>+1 (555) 123-4567</p>
                            <p className="info-subtext">Mon-Fri, 9AM-6PM EST</p>
                        </div>
                        <div className="info-card">
                            <div className="info-icon">📍</div>
                            <h3>Visit Us</h3>
                            <p>123 News Street</p>
                            <p className="info-subtext">New York, NY 10001</p>
                        </div>
                        <div className="info-card">
                            <div className="info-icon">💬</div>
                            <h3>Live Chat</h3>
                            <p>Available 24/7</p>
                            <p className="info-subtext">Click the chat icon below</p>
                        </div>
                    </div>
                </div>

                <div className="contact-form-section">
                    <h2>Send Us a Message</h2>
                    <p className="form-description">
                        Have a question, feedback, or suggestion? Fill out the form below and we'll get back to you as soon as possible.
                    </p>

                    {submitted && (
                        <div className="success-message">
                            ✅ Thank you! Your message has been sent successfully.
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="contact-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="name">Name *</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    placeholder="Your full name"
                                />
                            </div>
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
                        </div>

                        <div className="form-group">
                            <label htmlFor="subject">Subject *</label>
                            <select
                                id="subject"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select a subject</option>
                                <option value="general">General Inquiry</option>
                                <option value="support">Technical Support</option>
                                <option value="feedback">Feedback</option>
                                <option value="bug">Report a Bug</option>
                                <option value="partnership">Partnership Opportunity</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">Message *</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows={6}
                                placeholder="Tell us more about your inquiry..."
                            />
                        </div>

                        <button type="submit" className="submit-btn">
                            Send Message
                        </button>
                    </form>
                </div>

                <div className="faq-section">
                    <h2>Frequently Asked Questions</h2>
                    <div className="faq-grid">
                        <div className="faq-item">
                            <h4>How quickly will I receive a response?</h4>
                            <p>We aim to respond to all inquiries within 24 hours during business days.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Can I report inappropriate content?</h4>
                            <p>Yes! Please use the report feature on any post or contact us directly with details.</p>
                        </div>
                        <div className="faq-item">
                            <h4>How do I delete my account?</h4>
                            <p>Contact us with your request and we'll guide you through the account deletion process.</p>
                        </div>
                        <div className="faq-item">
                            <h4>Do you offer advertising opportunities?</h4>
                            <p>Yes! Select "Partnership Opportunity" in the subject field and tell us about your needs.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
