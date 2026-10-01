import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { Button } from './index';

const Navbar = ({ role, links }) => {
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const handleLogout = async () => {
    if (logout) {
      await logout();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    navigate('/login');
  };

  return (
    <nav className="navbar" style={styles.navbar}>
      <div style={styles.navBrand}>
        <div style={styles.brandIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <span style={styles.brandName}>
          VyasaPrep{role && <span style={styles.brandRole}>{role}</span>}
        </span>
        {role === 'Institution' && (
          <span style={styles.institutionBadge}>Institution Portal</span>
        )}
      </div>

      <div style={styles.navLinks}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => isActive ? 'active' : ''}
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

      <div style={styles.navActions}>
        <Button
          variant="outline"
          size="small"
          onClick={handleLogout}
          style={{ cursor: 'pointer' }}
        >
          Logout
        </Button>
      </div>
    </nav>
  );
};

const styles = {
  navbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--spacing-md) var(--spacing-lg)',
    backgroundColor: 'var(--color-surface)',
    borderBottom: '1px solid var(--color-border)',
    gap: 'var(--spacing-xl)',
    flexWrap: 'wrap',
  },
  navBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-md)',
    minWidth: '200px',
  },
  brandIcon: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-primary)',
    flexShrink: 0,
  },
  brandName: {
    fontSize: 'var(--font-size-h4)',
    fontWeight: 'var(--font-weight-bold)',
    fontFamily: 'var(--font-display)',
    color: 'var(--color-navy)',
    textDecoration: 'none',
  },
  brandRole: {
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-semibold)',
    marginLeft: 'var(--spacing-sm)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    backgroundColor: 'var(--color-soft-orange)',
    color: 'var(--color-primary)',
    borderRadius: 'var(--radius-pill)',
  },
  institutionBadge: {
    fontSize: 'var(--font-size-tiny)',
    fontWeight: 'var(--font-weight-semibold)',
    padding: 'var(--spacing-xs) var(--spacing-sm)',
    backgroundColor: 'var(--color-light-orange)',
    color: 'var(--color-primary)',
    borderRadius: 'var(--radius-md)',
  },
  navLinks: {
    display: 'flex',
    gap: 'var(--spacing-lg)',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    fontSize: 'var(--font-size-small)',
    fontWeight: 'var(--font-weight-medium)',
    borderRadius: 'var(--radius-md)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
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
  },
};

export default Navbar;
