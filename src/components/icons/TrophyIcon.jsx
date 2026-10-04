import React from 'react';

const TrophyIcon = ({ size = 24, className = '' }) => (
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
    <path d="M6 9H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-2" />
    <path d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4H6z" />
    <line x1="12" y1="16" x2="12" y2="20" />
    <line x1="9" y1="20" x2="15" y2="20" />
  </svg>
);

export default TrophyIcon;
