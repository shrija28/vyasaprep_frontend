import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components';

const NotFound = () => {
  return (
    <div style={styles.container}>
      <main style={styles.main}>
        <div style={styles.card}>
          <div style={styles.code}>404</div>
          <h1 style={styles.title}>Page not found</h1>
          <p style={styles.message}>
            The page you are looking for does not exist or has been moved.
          </p>
          <div style={styles.path} id="nfRequestedPath" aria-label="Requested path">
            {window.location.pathname}
          </div>
          <div style={styles.actions}>
            <Button as={Link} to="/" variant="primary" size="large">
              Go to Home
            </Button>
            <Button
              as="button"
              variant="outline"
              size="large"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    backgroundColor: 'var(--color-background)',
  },
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 'calc(100vh - 80px)',
    padding: 'var(--spacing-xl)',
  },
  card: {
    maxWidth: '560px',
    width: '100%',
    padding: 'var(--spacing-3xl)',
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    textAlign: 'center',
  },
  code: {
    fontSize: 'clamp(3rem, 10vw, 5rem)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    letterSpacing: '-2px',
    lineHeight: 1,
    marginBottom: 'var(--spacing-lg)',
    background: `linear-gradient(135deg, var(--color-primary), var(--color-warm-yellow))`,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  title: {
    fontSize: 'var(--font-size-h2)',
    fontFamily: 'var(--font-display)',
    fontWeight: 'var(--font-weight-bold)',
    color: 'var(--color-navy)',
    marginBottom: 'var(--spacing-md)',
  },
  message: {
    fontSize: 'var(--font-size-body)',
    color: 'var(--color-text-secondary)',
    marginBottom: 'var(--spacing-2xl)',
    lineHeight: 1.6,
  },
  path: {
    display: 'inline-block',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-small)',
    color: 'var(--color-text-secondary)',
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    marginBottom: 'var(--spacing-2xl)',
    maxWidth: '100%',
    overflowWrap: 'break-word',
    wordBreak: 'break-all',
  },
  actions: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
};

export default NotFound;
