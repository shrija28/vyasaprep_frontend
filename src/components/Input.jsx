import React, { useState } from 'react';
import './Input.css';

/**
 * Reusable Input component
 * Types: text, email, password, number, search, textarea
 * Includes label, helper text, error display
 */
const Input = ({
  id,
  label,
  type = 'text',
  placeholder = '',
  value = '',
  onChange = () => {},
  onBlur = () => {},
  error = '',
  helperText = '',
  disabled = false,
  required = false,
  icon = null,
  className = '',
  rows = 3,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const inputId = id || `input-${Math.random()}`;
  const isTextarea = type === 'textarea';
  const displayType = type === 'password' && showPassword ? 'text' : type;

  const inputClasses = `input-field ${error ? 'input-error' : ''} ${className}`.trim();

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}

      <div className="input-container">
        {icon && <span className="input-icon-left">{icon}</span>}

        {isTextarea ? (
          <textarea
            id={inputId}
            className={inputClasses}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            rows={rows}
            {...props}
          />
        ) : (
          <input
            id={inputId}
            type={displayType}
            className={inputClasses}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            {...props}
          />
        )}

        {type === 'password' && (
          <button
            type="button"
            className="input-icon-right input-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex="-1"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        )}
      </div>

      {error && <div className="input-error-text">{error}</div>}
      {helperText && !error && <div className="input-helper-text">{helperText}</div>}
    </div>
  );
};

export default Input;
