import React from 'react';
import { AlertIcon } from './index';
import './ErrorState.css';

/**
 * Error state component
 * Shows error message and optional retry action
 */
const ErrorState = ({
  title = 'Something went wrong',
  message = 'An error occurred while loading the content',
  action = null,
  className = '',
}) => {
  return (
    <div className={`error-state ${className}`.trim()}>
      <div className="error-icon">
        <AlertIcon size={40} style={{ color: 'var(--color-error)' }} />
      </div>
      <h3 className="error-title">{title}</h3>
      <p className="error-message">{message}</p>
      {action && <div className="error-action">{action}</div>}
    </div>
  );
};

export default ErrorState;
