import React from 'react';

const MathematicsIcon = ({ size = 24, className = '' }) => (
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
    <path d="M3 12h6M15 12h6M12 3v6M12 15v6" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

export default MathematicsIcon;
