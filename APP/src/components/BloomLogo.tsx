import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props { compact?: boolean; light?: boolean; }

export function BloomFlower({ size = 46 }: { size?: number }) {
  const scale = size / 46;

  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.flower, { transform: [{ scale }] }]}>
      <View style={[styles.petal, styles.petalTop]} />
      <View style={[styles.petal, styles.petalUpperRight]} />
      <View style={[styles.petal, styles.petalLowerRight]} />
      <View style={[styles.petal, styles.petalBottom]} />
      <View style={[styles.petal, styles.petalLowerLeft]} />
      <View style={[styles.petal, styles.petalUpperLeft]} />
      <LinearGradient colors={['#FFF4C7', '#F2B84B']} style={styles.center} />
    </View>
  </View>;
}

export default function BloomLogo({ compact = false, light = false }: Props) {
  return <View style={styles.row}>
    <BloomFlower size={compact ? 36 : 46} />
    <Text style={[styles.word, compact && styles.wordCompact, light && styles.light]}>bloom</Text>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flower: { width: 46, height: 46 },
  petal: { position: 'absolute', width: 18, height: 24, borderRadius: 13, borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.58)' },
  petalTop: { left: 14, top: 0, backgroundColor: '#A71948' },
  petalUpperRight: { left: 24, top: 7, backgroundColor: '#7B61C8', transform: [{ rotate: '58deg' }] },
  petalLowerRight: { left: 23, top: 18, backgroundColor: '#F08A5D', transform: [{ rotate: '118deg' }] },
  petalBottom: { left: 14, top: 22, backgroundColor: '#F2B84B', transform: [{ rotate: '180deg' }] },
  petalLowerLeft: { left: 5, top: 18, backgroundColor: '#43A982', transform: [{ rotate: '-118deg' }] },
  petalUpperLeft: { left: 4, top: 7, backgroundColor: '#D94F7C', transform: [{ rotate: '-58deg' }] },
  center: { position: 'absolute', width: 15, height: 15, borderRadius: 8, left: 15.5, top: 15.5, borderWidth: 2, borderColor: '#FFFFFF' },
  word: { fontSize: 28, fontWeight: '900', letterSpacing: -1.2, color: '#2A0B17' }, wordCompact: { fontSize: 23 }, light: { color: '#FFFFFF' },
});
