import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Button, BrandLogo } from './index';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/#features', label: 'Features' },
  { to: '/#subjects', label: 'Subjects' },
  { to: '/#how-it-works', label: 'How it Works' },
  { to: '/#pricing', label: 'Pricing' },
];

const Navbar = ({ role, links = [], variant = 'app' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const publicNavRef = useRef(null);

  const navItems = variant === 'public' ? publicLinks : links;

  useEffect(() => {
    if (variant !== 'public' || !location.hash) return undefined;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target) return undefined;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname, variant]);

  useEffect(() => {
    if (variant !== 'public' || !mobileMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!publicNavRef.current?.contains(event.target)) setMobileMenuOpen(false);
    };
    const closeOnScroll = () => setMobileMenuOpen(false);

    document.addEventListener('pointerdown', closeOnOutsideClick);
    window.addEventListener('scroll', closeOnScroll, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      window.removeEventListener('scroll', closeOnScroll);
    };
  }, [mobileMenuOpen, variant]);

  const handleLogout = async () => {
    if (logout) {
      await logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  if (variant === 'public') {
    return (
      <header
        ref={publicNavRef}
        className={`public-navbar${mobileMenuOpen ? ' public-menu-open' : ''}`}
        style={styles.publicNav}
        onClick={(event) => {
          if (event.target.closest('a')) setMobileMenuOpen(false);
        }}
      >
        <div className="public-navbar-inner" style={styles.publicInner}>
          <BrandLogo size="md" />

          <button
            type="button"
            className="public-menu-toggle"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-navigation-menu"
            onClick={() => setMobileMenuOpen((isOpen) => !isOpen)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav id="public-navigation-menu" className="public-links" style={styles.publicLinks}>
            {navItems.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={location.pathname === '/' && (link.to === '/' ? !location.hash : location.hash === link.to.slice(1)) ? 'public-link-active' : ''}
                style={styles.publicLink}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="public-actions" style={styles.publicActions}>
            <NavLink to="/login" className="public-login-link" style={styles.loginLink}>Login</NavLink>
            <Button as={NavLink} to="/register" variant="primary" size="sm">Create Account</Button>
          </div>
        </div>
      </header>
    );
  }

  const isAdmin = role === 'Admin';
  const isInstitution = role === 'Institution';
  const hasResponsiveShell = isAdmin || isInstitution;

  return (
    <nav className={`navbar${isAdmin ? ' admin-navbar' : ''}${isInstitution ? ' institution-navbar' : ''}`} style={hasResponsiveShell ? undefined : styles.navbar}>
      <div className={isAdmin ? 'admin-navbar-inner' : isInstitution ? 'institution-navbar-inner' : 'navbar-inner'} style={hasResponsiveShell ? undefined : { display: 'contents' }}>
      <div className={`nav-brand${isAdmin ? ' admin-nav-brand' : ''}${isInstitution ? ' institution-nav-brand' : ''}`} style={styles.navBrand}>
        <BrandLogo size={isInstitution ? 'institution' : 'sm'} showRole={isInstitution} role={isInstitution ? 'Institution' : ''} />
      </div>

      <div className={`nav-links${isAdmin ? ' admin-nav-links' : ''}${isInstitution ? ' institution-nav-links' : ''}`} style={styles.navLinks}>
        {navItems.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            {link.icon}
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className={`nav-actions${isAdmin ? ' admin-nav-actions' : ''}${isInstitution ? ' institution-nav-actions' : ''}`} style={styles.navActions}>
        <Button variant="outline" size="sm" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          Logout
        </Button>
      </div>
      </div>
    </nav>
  );
};

const styles = {
  publicNav: {
    width: '100%',
    boxSizing: 'border-box',
    background: '#F7F5F1',
    borderBottom: '1px solid rgba(26,54,93,0.12)',
    position: 'sticky',
    top: 0,
    zIndex: 20,
  },
  publicInner: {
    width: '100%',
    maxWidth: '1600px',
    boxSizing: 'border-box',
    margin: '0 auto',
    padding: '1rem 1.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1.5rem',
  },
  publicLinks: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1.5rem',
    flex: 1,
    flexWrap: 'wrap',
  },
  publicLink: {
    color: '#1A365D',
    fontSize: '0.95rem',
    fontWeight: 500,
    textDecoration: 'none',
    opacity: 0.8,
    padding: '0.45rem 0.2rem',
  },
  publicActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.9rem',
  },
  loginLink: {
    color: '#1A365D',
    background: '#FCFBF8',
    border: '1px solid #E65F00',
    borderRadius: '10px',
    padding: '8px 18px',
    textDecoration: 'none',
    fontWeight: 600,
  },
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.85rem 1.25rem',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    gap: '0.75rem',
    flexWrap: 'wrap',
    width: '100%',
    boxSizing: 'border-box',
    minWidth: 0,
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    minWidth: '170px',
    flexShrink: 0,
  },
  navLinks: {
    display: 'flex',
    gap: '0.5rem',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: '0.5rem 0.8rem',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-medium)',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  navLinkActive: {
    backgroundColor: 'var(--color-soft-orange)',
    color: 'var(--color-primary)',
    fontWeight: 'var(--font-weight-semibold)',
  },
  navActions: {
    display: 'flex',
    gap: 'var(--spacing-md)',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 'auto',
  },
};

export default Navbar;
