import React from 'react';

const CheckmarkIcon = ({ size = 24, className = '' }) => (
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
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 12 15 15 9" />
  </svg>
);

export default CheckmarkIcon;
