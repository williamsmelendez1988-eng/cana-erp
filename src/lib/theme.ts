import type { CSSProperties } from 'react';

export const colors = {
  bgBase: '#0F1A13',
  bgPanel: '#1B2E22',
  bgPanelHover: '#243B2C',
  gold: '#C9974C',
  goldLight: '#E8C77E',
  cream: '#F3ECDD',
  muted: '#9CAF95',
  border: 'rgba(232,199,126,0.14)',
  borderStrong: 'rgba(232,199,126,0.3)',
  success: '#4ADE80',
  danger: '#F87171',
  info: '#93C5FD',
};

export const card: CSSProperties = {
  backgroundColor: colors.bgPanel,
  border: `1px solid ${colors.border}`,
  borderRadius: '14px',
  padding: '1.5rem',
  boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
};

export const buttonPrimary: CSSProperties = {
  padding: '0.75rem 1.5rem',
  borderRadius: '10px',
  border: 'none',
  background: `linear-gradient(135deg, ${colors.goldLight} 0%, ${colors.gold} 100%)`,
  color: colors.bgBase,
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(201,151,76,0.25)',
};

export const buttonSecondary: CSSProperties = {
  padding: '0.7rem 1.4rem',
  borderRadius: '10px',
  border: `1px solid ${colors.border}`,
  backgroundColor: 'transparent',
  color: colors.cream,
  cursor: 'pointer',
};

export const inputStyle: CSSProperties = {
  padding: '0.65rem 0.9rem',
  borderRadius: '10px',
  border: '1px solid rgba(216,203,176,0.22)',
  backgroundColor: 'rgba(255,255,255,0.035)',
  color: colors.cream,
  fontSize: '0.95rem',
  fontFamily: 'inherit',
};