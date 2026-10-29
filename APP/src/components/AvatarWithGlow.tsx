import React from 'react';
import { StyleSheet, View, Image, ViewStyle } from 'react-native';
import theme from '../constants/theme';

interface Props {
  uri: string;
  size?: number;
  hasGlowRing?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export const AvatarWithGlow: React.FC<Props> = ({
  uri,
  size = 50,
  hasGlowRing = false,
  isOnline = false,
  style,
}) => {
  const dotSize = Math.max(10, Math.round(size * 0.24));

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {/* Glow aura / border if active */}
      <View
        style={[
          styles.imageContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: hasGlowRing ? 2 : 0,
            borderColor: hasGlowRing ? theme.colors.accentViolet : 'transparent',
          },
          hasGlowRing && styles.glowShadow,
        ]}
      >
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
          resizeMode="cover"
        />
      </View>

      {/* Online indicator dot */}
      {isOnline && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              bottom: 1,
              right: 1,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    overflow: 'hidden',
    backgroundColor: 'rgba(35, 23, 52, 0.9)',
  },
  glowShadow: {
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  onlineDot: {
    position: 'absolute',
    backgroundColor: theme.colors.onlineGreen,
    borderWidth: 2,
    borderColor: '#0B0716',
    shadowColor: theme.colors.onlineGreen,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 6,
  },
});

export default AvatarWithGlow;

