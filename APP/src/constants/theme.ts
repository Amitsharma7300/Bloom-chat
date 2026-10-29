export const theme = {
  colors: {
    // Canvas & Ambient glow
    background: '#090514',
    backgroundSecondary: '#0E081D',
    glowPrimary: '#4a1068',
    glowSecondary: '#2f0a4a',
    glowVibrant: '#791a9c',

    // Glassmorphism containers
    glassBg: 'rgba(28, 19, 44, 0.72)',
    glassBgActive: 'rgba(40, 24, 62, 0.88)',
    glassBgLight: 'rgba(44, 29, 68, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    glassBorderHighlight: 'rgba(192, 38, 211, 0.35)',
    glassBorderSubtle: 'rgba(255, 255, 255, 0.04)',

    // Neon & Accent colors
    accentMagenta: '#C026D3',
    accentPurple: '#9333EA',
    accentViolet: '#A855F7',
    accentPink: '#EC4899',
    accentGlow: 'rgba(192, 38, 211, 0.45)',

    // Status indicators
    onlineGreen: '#22C55E',
    onlineGlow: 'rgba(34, 197, 94, 0.4)',
    unreadBadge: '#A855F7',

    // Typography
    textPrimary: '#FFFFFF',
    textSecondary: '#9D93B0',
    textMuted: '#6E6284',
    textHighlight: '#E9D5FF',

    // UI elements
    searchBarBg: 'rgba(32, 22, 51, 0.75)',
    searchIcon: '#8B7FA4',
    filterButtonBg: 'rgba(45, 30, 70, 0.7)',
    bottomBarBg: 'rgba(14, 9, 23, 0.92)',
    bottomBarBorder: 'rgba(255, 255, 255, 0.07)',
    activeTab: '#C084FC',
    inactiveTab: '#6E6284',

    // Chat bubbles
    sentBubbleGradient: ['#C026D3', '#9333EA'] as const,
    receivedBubbleBg: 'rgba(32, 22, 51, 0.85)',
    receivedBubbleBorder: 'rgba(255, 255, 255, 0.06)',
    datePillBg: 'rgba(34, 24, 52, 0.75)',
    inputBarBg: 'rgba(32, 22, 51, 0.85)',
  },

  shadows: {
    glass: {
      shadowColor: '#9333ea',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 5,
    },
    neonPurple: {
      shadowColor: '#c026d3',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.6,
      shadowRadius: 10,
      elevation: 8,
    },
    subtle: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.4,
      shadowRadius: 6,
      elevation: 3,
    },
  },

  borderRadius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    full: 9999,
  },
};

export default theme;
