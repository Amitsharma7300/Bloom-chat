import React, { useState } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { ScrollView, Text, TouchableOpacity, View } from '../components/ThemedPrimitives';
import { Ionicons } from '../components/ThemedPrimitives';
import { LinearGradient } from '../components/ThemedPrimitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, shadow } from '../constants/theme';
import LegalSheet, { LegalSection } from '../components/LegalSheet';

interface Props { onBack: () => void; onRestart: () => void; theme: 'light' | 'dark'; fontScale: number; onPreferences: (value: { theme?: 'light' | 'dark'; fontScale?: number }) => Promise<void>; }

export default function SettingsScreen({ onBack, onRestart, theme, fontScale, onPreferences }: Props) {
  const insets = useSafeAreaInsets();
  const [legalSection, setLegalSection] = useState<LegalSection | null>(null);
  return <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Back" onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={21} color={palette.ink} /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.eyebrow}>YOUR BLOOM SPACE</Text><Text style={styles.title}>Settings</Text></View></View>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['#391021', '#761B3B', '#9B294B']} style={styles.hero}>
        <View style={styles.heroOrb} />
        <View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={25} color="#FFFFFF" /></View>
        <Text style={styles.heroTitle}>Your space, your pace.</Text>
        <Text style={styles.heroBody}>Meet people with an illustrated profile. Leave a match, block someone or report a conversation whenever you need to.</Text>
      </LinearGradient>

      <Text style={styles.sectionTitle}>Privacy and safety</Text>
      <View style={styles.card}>
        <ActionRow icon="lock-closed-outline" title="Privacy Policy" subtitle="See what information Bloom uses" onPress={() => setLegalSection('privacy')} />
        <ActionRow icon="document-text-outline" title="Terms & Conditions" subtitle="Read the community agreement" onPress={() => setLegalSection('terms')} last />
      </View>

      <Text style={styles.sectionTitle}>Appearance</Text>
      <View style={styles.card}>
        <View style={styles.preferenceRow}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>Theme</Text><Text style={styles.rowSubtitle}>Choose light or dark mode</Text></View>{(['light', 'dark'] as const).map((choice) => <TouchableOpacity key={choice} accessibilityRole="button" accessibilityState={{ selected: theme === choice }} onPress={() => { void onPreferences({ theme: choice }).catch((error) => Alert.alert('Could not save theme', String(error))); }} style={[styles.choice, theme === choice && styles.selectedChoice]}><Text style={[styles.choiceText, theme === choice && styles.selectedChoiceText]}>{choice === 'light' ? 'Light' : 'Dark'}</Text></TouchableOpacity>)}</View>
        <View style={styles.preferenceRow}><View style={{ flex: 1 }}><Text style={styles.rowTitle}>Text size</Text><Text style={styles.rowSubtitle}>{Math.round(fontScale * 100)}% of standard size</Text></View><TouchableOpacity accessibilityLabel="Decrease text size" disabled={fontScale <= 0.8} onPress={() => { void onPreferences({ fontScale: Math.max(0.8, Math.round((fontScale - 0.1) * 10) / 10) }).catch((error) => Alert.alert('Could not save text size', String(error))); }} style={styles.sizeButton}><Ionicons name="remove" size={18} color={palette.coral} /></TouchableOpacity><TouchableOpacity accessibilityLabel="Increase text size" disabled={fontScale >= 1.5} onPress={() => { void onPreferences({ fontScale: Math.min(1.5, Math.round((fontScale + 0.1) * 10) / 10) }).catch((error) => Alert.alert('Could not save text size', String(error))); }} style={styles.sizeButton}><Ionicons name="add" size={18} color={palette.coral} /></TouchableOpacity></View>
      </View>

      <Text style={styles.sectionTitle}>Your anonymous profile</Text>
      <View style={styles.accountCard}>
        <View style={styles.accountIcon}><Ionicons name="color-palette-outline" size={22} color={palette.coral} /></View>
        <View style={{ flex: 1 }}><Text style={styles.accountTitle}>Made to feel like you</Text><Text style={styles.accountBody}>Bloom uses a cartoon avatar and private ID. You do not need to upload a real photo.</Text></View>
      </View>
      <TouchableOpacity accessibilityRole="button" onPress={onRestart} style={styles.reset}><Ionicons name="refresh-outline" size={19} color={palette.danger} /><Text style={styles.resetText}>Reset anonymous profile</Text></TouchableOpacity>
      <Text style={styles.resetHint}>Resetting creates a new profile on this device. Previously sent messages may remain visible to other members until the chat expires after 72 hours.</Text>
      <Text style={styles.version}>Bloom 1.0</Text>
    </ScrollView>
    <LegalSheet section={legalSection} onClose={() => setLegalSection(null)} />
  </View>;
}

function ActionRow({ icon, title, subtitle, onPress, last = false }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; last?: boolean }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} style={[styles.row, last && styles.lastRow]}>
    <View style={styles.rowIcon}><Ionicons name={icon} size={20} color={palette.coral} /></View>
    <View style={{ flex: 1 }}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSubtitle}>{subtitle}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, header: { paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: palette.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { color: palette.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  content: { paddingHorizontal: 18, paddingTop: 21, paddingBottom: 32 }, hero: { minHeight: 194, borderRadius: 27, padding: 22, overflow: 'hidden', ...shadow.card }, heroOrb: { position: 'absolute', width: 180, height: 180, right: -45, top: -50, borderRadius: 90, borderWidth: 31, borderColor: 'rgba(255,255,255,0.07)' }, heroIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }, heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.6, marginTop: 15 }, heroBody: { color: 'rgba(255,255,255,0.78)', fontSize: 11.5, lineHeight: 17, marginTop: 6, maxWidth: 300 },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', marginTop: 25, marginBottom: 11 }, card: { backgroundColor: '#FFFFFF', borderRadius: 23, borderWidth: 1, borderColor: palette.line, overflow: 'hidden' }, row: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: palette.line }, lastRow: { borderBottomWidth: 0 }, rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: palette.coralSoft, alignItems: 'center', justifyContent: 'center' }, rowTitle: { color: palette.ink, fontSize: 12, fontWeight: '900' }, rowSubtitle: { color: palette.inkMuted, fontSize: 9.5, marginTop: 3 },
  accountCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: palette.mintSoft, borderRadius: 22, padding: 16 }, accountIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, accountTitle: { color: '#285F4E', fontSize: 12, fontWeight: '900' }, accountBody: { color: '#567D70', fontSize: 10, lineHeight: 15, marginTop: 4 },
  reset: { height: 52, borderRadius: 20, marginTop: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: '#FBE8ED' }, resetText: { color: palette.danger, fontSize: 12, fontWeight: '900' }, resetHint: { color: palette.inkMuted, fontSize: 9.5, lineHeight: 14, textAlign: 'center', marginTop: 9, paddingHorizontal: 18 }, version: { color: palette.inkMuted, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 28 },
  preferenceRow: { minHeight: 72, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: palette.line }, choice: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 14, backgroundColor: palette.surfaceAlt }, selectedChoice: { backgroundColor: palette.coral }, choiceText: { color: palette.inkSoft, fontSize: 10, fontWeight: '800' }, selectedChoiceText: { color: '#FFFFFF' }, sizeButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: palette.coralSoft, alignItems: 'center', justifyContent: 'center' },
});
