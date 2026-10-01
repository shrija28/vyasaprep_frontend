import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Sidebar.css';

/**
 * Sidebar component for desktop and mobile navigation
 * Props:
 * - items: Array of {to, label, icon}
 * - title: Brand title
 * - icon: Brand icon component
 * - onLinkClick: Callback when link is clicked
 */
const Sidebar = ({
  items = [],
  title = 'VyasaPrep',
  icon = null,
  onLinkClick = null,
  logo = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = () => {
    onLinkClick?.();
    setIsOpen(false);
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Branding */}
        <div className="sidebar-header">
          {icon && <div className="sidebar-icon">{icon}</div>}
          {logo && <div className="sidebar-logo">{logo}</div>}
          <h1 className="sidebar-title">{title}</h1>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
              }
              onClick={handleLinkClick}
            >
              {item.icon && <span className="sidebar-link-icon">{item.icon}</span>}
              <span className="sidebar-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
