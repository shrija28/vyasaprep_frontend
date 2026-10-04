import React from 'react';

const PhysicsIcon = ({ size = 24, className = '' }) => (
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
    <circle cx="12" cy="8" r="6" />
    <path d="M12 14v6" />
    <path d="M8 18h8" />
  </svg>
);

export default PhysicsIcon;
