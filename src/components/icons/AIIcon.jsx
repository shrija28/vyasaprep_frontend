import React from 'react';

const AIIcon = ({ size = 24, className = '' }) => (
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
    <circle cx="8" cy="10" r="1.5" fill="currentColor" />
    <circle cx="16" cy="10" r="1.5" fill="currentColor" />
    <path d="M8 14s1 2 4 2 4-2 4-2" />
  </svg>
);

export default AIIcon;
