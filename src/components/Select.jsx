import React from 'react';
import './Select.css';

/**
 * Reusable Select component
 */
const Select = ({
  id,
  label,
  options = [],
  value = '',
  onChange = () => {},
  error = '',
  disabled = false,
  required = false,
  placeholder = 'Select an option...',
  helperText = '',
  className = '',
  ...props
}) => {
  const selectId = id || `select-${Math.random()}`;

  return (
    <div className="input-wrapper">
      {label && (
        <label htmlFor={selectId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}

      <select
        id={selectId}
        className={`select-field ${error ? 'input-error' : ''} ${className}`.trim()}
        value={value}
        onChange={onChange}
        disabled={disabled}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && <div className="input-error-text">{error}</div>}
      {helperText && !error && <div className="input-helper-text">{helperText}</div>}
    </div>
  );
};

export default Select;
