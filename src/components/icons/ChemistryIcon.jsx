import React from 'react';

const ChemistryIcon = ({ size = 24, className = '' }) => (
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
    <path d="M6 4l3 0l1 5l1 0l1 -5l3 0" />
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <line x1="10" y1="12" x2="10" y2="18" />
    <line x1="14" y1="12" x2="14" y2="18" />
  </svg>
);

export default ChemistryIcon;
