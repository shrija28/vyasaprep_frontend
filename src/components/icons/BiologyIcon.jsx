import React from 'react';

const BiologyIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    width={size}
    height={size}
    className={className}
  >
    <path d="M12 2C12 2 10 6 10 9c0 3.314 1.791 6 2 6s2-2.686 2-6c0-3 -2-7 -2-7z" />
    <path d="M8 14l3 8l3 -8" />
    <circle cx="12" cy="18" r="1" />
  </svg>
);

export default BiologyIcon;
