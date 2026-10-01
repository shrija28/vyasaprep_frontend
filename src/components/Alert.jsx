import React, { useState } from 'react';
import './Alert.css';

/**
 * Reusable Alert component
 * Types: success, error, warning, info
 */
const Alert = ({
  children,
  variant = 'info',
  title = null,
  icon = true,
  dismissible = true,
  className = '',
  onClose = null,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onClose?.();
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const alertClasses = `alert alert-${variant} ${className}`.trim();

  return (
    <div className={alertClasses} role="alert" {...props}>
      <div className="alert-content">
        {icon && <span className="alert-icon">{icons[variant]}</span>}
        <div className="alert-text">
          {title && <div className="alert-title">{title}</div>}
          <div className="alert-message">{children}</div>
        </div>
      </div>
      {dismissible && (
        <button
          className="alert-close"
          onClick={handleDismiss}
          aria-label="Close alert"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Alert;
