import React from 'react';
import './ErrorState.css';

/**
 * Error state component
 * Shows error message and optional retry action
 */
const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading the content',
  action = null,
  icon = '⚠️',
  className = '',
}) => {
  return (
    <div className={`error-state ${className}`.trim()}>
      <div className="error-icon">{icon}</div>
      <h3 className="error-title">{title}</h3>
      <p className="error-message">{message}</p>
      {action && <div className="error-action">{action}</div>}
    </div>
  );
};

export default ErrorState;
