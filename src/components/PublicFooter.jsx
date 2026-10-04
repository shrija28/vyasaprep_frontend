import React from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';

const PublicFooter = () => (
  <footer className="public-footer">
    <div className="landing-footer-inner" style={styles.inner}>
      <div style={styles.brand}>
        <BrandLogo size="md" />
      </div>
      <nav className="landing-footer-nav" style={styles.navigation} aria-label="Footer">
        <Link to="/about">About</Link>
        <Link to="/contact-us">Contact</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
      </nav>
      <div className="landing-footer-meta" style={styles.meta}>
        <span>© {new Date().getFullYear()} VyasaPrep. All rights reserved.</span>
      </div>
    </div>
  </footer>
);

const styles = {
  inner: {
    maxWidth: '1440px',
    margin: '0 auto',
    padding: '0 clamp(16px, 3vw, 40px)',
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: '20px',
  },
  brand: { justifySelf: 'start' },
  navigation: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '8px 24px',
    fontSize: '0.9rem',
  },
  meta: {
    justifySelf: 'end',
    color: '#64748B',
    fontSize: '0.82rem',
    textAlign: 'right',
  },
};

export default PublicFooter;