import React from 'react';
import './EmptyState.css';

/**
 * Empty state component
 * Shows message when no data available
 */
const EmptyState = ({
  icon = '📭',
  title = 'No data available',
  message = 'There is nothing here yet',
  action = null,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
