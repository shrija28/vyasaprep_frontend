import React from 'react';
import './LoadingState.css';

/**
 * Loading state component
 * Shows spinner and optional message
 */
const LoadingState = ({
  message = 'Loading...',
  size = 'md',
  fullPage = false,
}) => {
  const containerClasses = `loading-state loading-state-${size} ${
    fullPage ? 'loading-state-fullpage' : ''
  }`;

  return (
    <div className={containerClasses}>
      <div className="loading-spinner"></div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

export default LoadingState;
