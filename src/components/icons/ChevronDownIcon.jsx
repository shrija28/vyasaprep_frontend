import React from 'react';

const ChevronDownIcon = ({ size = 24, className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export default ChevronDownIcon;