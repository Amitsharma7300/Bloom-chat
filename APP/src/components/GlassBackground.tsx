import React from 'react';
import { StyleSheet, View, Dimensions, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../constants/theme';

const { width, height } = Dimensions.get('window');

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const GlassBackground: React.FC<Props> = ({ children, style }) => {
  return (
    <View style={[styles.container, style]}>
      {/* Base Deep Obsidian Gradient */}
      <LinearGradient
        colors={['#07040E', '#0B0716', '#090514']}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-Right Neon Purple Glow Orb */}
      <View style={styles.topGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(192, 38, 211, 0.28)', 'rgba(147, 51, 234, 0.15)', 'transparent']}
          style={styles.glowOrb1}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Middle-Left Ambient Magenta Glow */}
      <View style={styles.midLeftGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(168, 85, 247, 0.18)', 'rgba(92, 19, 128, 0.12)', 'transparent']}
          style={styles.glowOrb2}
          start={{ x: 0.3, y: 0.3 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {/* Bottom Subtle Ambient Glow */}
      <View style={styles.bottomGlowContainer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(121, 26, 156, 0.16)', 'transparent']}
          style={styles.glowOrb3}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </View>

      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topGlowContainer: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: (width * 0.9) / 2,
    overflow: 'hidden',
  },
  glowOrb1: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.9) / 2,
  },
  midLeftGlowContainer: {
    position: 'absolute',
    top: height * 0.3,
    left: -100,
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: (width * 0.85) / 2,
    overflow: 'hidden',
  },
  glowOrb2: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.85) / 2,
  },
  bottomGlowContainer: {
    position: 'absolute',
    bottom: -80,
    right: width * 0.1,
    width: width * 0.75,
    height: width * 0.75,
    borderRadius: (width * 0.75) / 2,
    overflow: 'hidden',
  },
  glowOrb3: {
    width: '100%',
    height: '100%',
    borderRadius: (width * 0.75) / 2,
  },
});

export default GlassBackground;
