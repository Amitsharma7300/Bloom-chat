import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Ionicons, Text, TouchableOpacity, View } from './ThemedPrimitives';
import { palette } from '../constants/theme';

type Props = { visible: boolean; busy: boolean; onRetry: () => void; onPremium: () => void };

export default function AdBlockWarning({ visible, busy, onRetry, onPremium }: Props) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => {}}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="shield-outline" size={30} color={palette.coral} /></View>
        <Text style={styles.title}>Ads appear to be blocked</Text>
        <Text style={styles.body}>Bloom could not reach its ad service. Check any ad filtering settings, then retry to continue with free matching.</Text>
        <TouchableOpacity disabled={busy} onPress={onRetry} style={[styles.retry, busy && { opacity: 0.6 }]}><Text style={styles.retryText}>{busy ? 'Checking…' : 'Disable Ad Blocker & Retry'}</Text></TouchableOpacity>
        <TouchableOpacity disabled={busy} onPress={onPremium} style={styles.premium}><Text style={styles.premiumText}>Upgrade to Premium</Text></TouchableOpacity>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(24,8,15,0.65)' },
  card: { backgroundColor: palette.canvas, borderRadius: 26, padding: 24, alignItems: 'center' },
  icon: { width: 62, height: 62, borderRadius: 20, backgroundColor: palette.goldSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '900', color: palette.ink, marginTop: 16, textAlign: 'center' },
  body: { fontSize: 12, lineHeight: 19, color: palette.inkSoft, textAlign: 'center', marginTop: 10 },
  retry: { width: '100%', height: 48, borderRadius: 24, backgroundColor: palette.coral, justifyContent: 'center', alignItems: 'center', marginTop: 22 },
  retryText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
  premium: { padding: 15, marginTop: 7 }, premiumText: { color: palette.coral, fontSize: 12, fontWeight: '800' },
});
