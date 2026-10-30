export const palette = {
  ink: '#241018', inkSoft: '#705864', inkMuted: '#A28D96', canvas: '#FFF8F8', surface: '#FFFFFF',
  surfaceAlt: '#F8EFF2', line: '#EADCE2', coral: '#8E1838', coralDark: '#651027', coralSoft: '#F8E6EB',
  violet: '#6D2943', violetSoft: '#F3E7EC', mint: '#2F9F7D', mintSoft: '#E4F5EF', gold: '#C5913B',
  goldSoft: '#F8EEDC', danger: '#A62245', night: '#2A0B17',
  // Compatibility aliases retained for the original reusable glass components.
  accentMagenta: '#8E1838', accentViolet: '#6D2943', onlineGreen: '#2F9F7D', background: '#2A0B17',
  searchIcon: '#9991A2', textMuted: '#9991A2', textPrimary: '#FFFFFF', searchBarBg: 'rgba(255,255,255,0.08)',
  filterButtonBg: 'rgba(255,255,255,0.1)', glassBorder: 'rgba(255,255,255,0.1)', glassBorderHighlight: 'rgba(142,24,56,0.45)',
};

export const radii = { sm: 12, md: 18, lg: 24, xl: 32, pill: 999, full: 999 };

export const shadow = {
  card: { shadowColor: '#4B1024', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  coral: { shadowColor: palette.coral, shadowOpacity: 0.26, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 6 },
};

const theme = { colors: palette, borderRadius: radii, shadows: shadow };
export default theme;

