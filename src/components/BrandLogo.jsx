import React from 'react';

const BrandLogo = ({
  size = 'md',
  showRole = false,
  role = '',
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 30, text: '1.05rem', titleGap: '0.25rem' },
    institution: { icon: 34, text: '1.15rem', titleGap: '0.16rem' },
    md: { icon: 38, text: '1.4rem', titleGap: '0.35rem' },
    lg: { icon: 48, text: '1.8rem', titleGap: '0.4rem' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        lineHeight: 1,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: currentSize.icon,
          height: currentSize.icon,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 0,
          background: 'transparent',
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        <svg viewBox="0 0 48 48" width={currentSize.icon} height={currentSize.icon} style={{ display: 'block' }}>
          <path d="M23.5 12.5C18.2 8.8 12.1 8.2 6 10v27c6.2-1.8 12.2-1.2 17.5 2.6V12.5Z" fill="#E65F00" />
          <path d="M24.5 12.5C29.8 8.8 35.9 8.2 42 10v27c-6.2-1.8-12.2-1.2-17.5 2.6V12.5Z" fill="#E65F00" />
          <path d="M24 14v24" stroke="#B34A00" strokeWidth="1.5" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: currentSize.titleGap }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.2rem',
            color: '#1A365D',
            fontFamily: 'var(--font-display)',
            fontSize: currentSize.text,
            fontWeight: 700,
            letterSpacing: 0,
          }}
        >
          <span>Vyasa</span>
          <span style={{ color: '#E65F00' }}>Prep</span>
        </div>
        <span style={{ color: '#64748B', fontSize: '0.56rem', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
          Learn. Practice. Grow.
        </span>
        {showRole && role && (
          <span
            style={{
              fontSize: '0.62rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#E65F00',
              background: '#FFF0E3',
              padding: '0.18rem 0.45rem',
              borderRadius: '999px',
              width: 'fit-content',
            }}
          >
            {role}
          </span>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
