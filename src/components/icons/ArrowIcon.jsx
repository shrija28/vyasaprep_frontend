import React from 'react';

const ArrowIcon = ({ size = 24, className = '', direction = 'right' }) => {
  const rotationMap = {
    right: 0,
    down: 90,
    left: 180,
    up: 270
  };

  return (
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
      style={{ transform: `rotate(${rotationMap[direction]}deg)` }}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
};

export default ArrowIcon;
