import React, { useState } from 'react';
import { Card, Input, Button, Alert } from '../components';

const ContactUsPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', text: '' });

    if (!name || !email || !message) {
      setFeedback({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    setLoading(true);

    // Placeholder for future backend integration
    setTimeout(() => {
      setFeedback({
        type: 'success',
        text: 'Thank you for your message. We will get back to you soon.'
      });
      setName('');
      setEmail('');
      setMessage('');
      setLoading(false);
    }, 1500);
  };

  const styles = {
    container: {
      width: '100%',
      backgroundColor: 'var(--color-background)',
      minHeight: 'calc(100vh - 80px)',
      padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem)',
    },
    wrapper: {
      maxWidth: '700px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center',
      marginBottom: '3rem',
    },
    title: {
      fontFamily: 'Fraunces, serif',
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      fontWeight: '700',
      color: 'var(--color-navy)',
      marginBottom: '0.75rem',
    },
    subtitle: {
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
      color: 'var(--color-text-secondary)',
      lineHeight: '1.6',
      maxWidth: '600px',
      margin: '0 auto',
    },
    card: {
      padding: 'clamp(1.5rem, 3vw, 2.5rem)',
      backgroundColor: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(230, 95, 0, 0.04)',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    },
    textarea: {
      width: '100%',
      padding: '0.75rem',
      fontFamily: 'Plus Jakarta Sans, sans-serif',
      fontSize: '0.95rem',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      backgroundColor: '#FFFFFF',
      color: 'var(--color-text-primary)',
      resize: 'vertical',
      minHeight: '150px',
      boxSizing: 'border-box',
      outline: 'none',
      transition: 'all 0.2s ease',
    },
    textareaFocus: {
      borderColor: 'var(--color-primary)',
      boxShadow: '0 0 0 3px rgba(230, 95, 0, 0.1)',
    },
    alert: {
      marginBottom: '1rem',
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>Get In Touch</h1>
          <p style={styles.subtitle}>
            Have a question or feedback? We'd love to hear from you. Fill out the form below and we'll get back to you as soon as possible.
          </p>
        </div>

        <Card style={styles.card}>
          {feedback.text && (
            <Alert variant={feedback.type} style={styles.alert}>
              {feedback.text}
            </Alert>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            <Input
              label="Your Name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-primary)', display: 'block', marginBottom: '0.5rem' }}>
                Message
              </label>
              <textarea
                style={styles.textarea}
                placeholder="Tell us how we can help..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onFocus={(e) => Object.assign(e.target.style, styles.textareaFocus)}
                onBlur={(e) => {
                  e.target.style.borderColor = 'var(--color-border)';
                  e.target.style.boxShadow = 'none';
                }}
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              style={{ width: '100%' }}
            >
              {loading ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ContactUsPage;
