import React from 'react';
import './Button.css';

/**
 * Reusable Button component with multiple variants
 * Variants: primary, secondary, outline, text, danger
 * Sizes: sm, md (default), lg
 * States: loading, disabled
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon = null,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const buttonClasses = `btn btn-${variant} btn-${size} ${
    loading ? 'btn-loading' : ''
  } ${className}`.trim();

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="btn-spinner"></span>}
      {icon && iconPosition === 'left' && <span className="btn-icon">{icon}</span>}
      <span>{children}</span>
      {icon && iconPosition === 'right' && <span className="btn-icon">{icon}</span>}
    </button>
  );
};

export default Button;
