import React from 'react';
import './Card.css';

/**
 * Reusable Card component
 * Supports header, footer, interactive variants
 */
const Card = ({
  children,
  header = null,
  footer = null,
  interactive = false,
  className = '',
  onClick = null,
  ...props
}) => {
  const cardClasses = `card ${interactive ? 'card-interactive' : ''} ${className}`.trim();

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      {...props}
    >
      {header && <div className="card-header">{header}</div>}
      <div className="card-body">{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
};

export default Card;
