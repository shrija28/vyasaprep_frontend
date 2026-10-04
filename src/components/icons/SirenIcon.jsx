import React from 'react';

const SirenIcon = ({ size = 24, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    strokeWidth="0"
    width={size}
    height={size}
    className={className}
  >
    <circle cx="8" cy="5" r="2.5" />
    <circle cx="16" cy="5" r="2.5" />
    <path d="M12 2v14M12 18v3M8 20h8" />
  </svg>
);

export default SirenIcon;
