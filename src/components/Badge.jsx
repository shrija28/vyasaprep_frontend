import React from 'react';
import './Badge.css';

/**
 * Reusable Badge/StatusTag component
 * Types: success, error, warning, info, default
 */
const Badge = ({
  children,
  variant = 'default',
  icon = null,
  className = '',
  ...props
}) => {
  const badgeClasses = `badge badge-${variant} ${className}`.trim();

  return (
    <span className={badgeClasses} {...props}>
      {icon && <span className="badge-icon">{icon}</span>}
      <span className="badge-text">{children}</span>
    </span>
  );
};

export default Badge;
