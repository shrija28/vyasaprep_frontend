import React from 'react';
import './EmptyState.css';

/**
 * Empty state component
 * Shows message when no data available
 */
const EmptyState = ({
  icon = null,
  title = 'No data available',
  message = 'There is nothing here yet',
  action = null,
  className = '',
}) => {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {icon ? <div className="empty-icon">{icon}</div> : <div className="empty-icon" aria-hidden="true">—</div>}
      <h3 className="empty-title">{title}</h3>
      <p className="empty-message">{message}</p>
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
};

export default EmptyState;
