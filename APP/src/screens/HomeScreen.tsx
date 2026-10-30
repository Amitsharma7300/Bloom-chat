import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BloomLogo from '../components/BloomLogo';
import { PARTNERS } from '../constants/partners';
import { palette, shadow } from '../constants/theme';
import { ChatMode } from '../types/chat';

interface Props { onStartMatch: (mode: ChatMode, mood: string) => void; onOpenNotifications: () => void; }
const modes: { key: ChatMode; icon: keyof typeof Ionicons.glyphMap; description: string }[] = [
  { key: 'Video', icon: 'videocam', description: 'Face to face' },
  { key: 'Voice', icon: 'call', description: 'Talk freely' },
  { key: 'Text', icon: 'chatbubble-ellipses', description: 'Keep it simple' },
];
const moods = [{ label: 'Just chatting', emoji: '💬' }, { label: 'Make friends', emoji: '🫶' }, { label: 'Need advice', emoji: '🌱' }];

export default function HomeScreen({ onStartMatch, onOpenNotifications }: Props) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<ChatMode>('Video');
  const [mood, setMood] = useState('Just chatting');

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 10 }]} showsVerticalScrollIndicator={false}>
    <View style={styles.topbar}><BloomLogo compact /><TouchableOpacity onPress={onOpenNotifications} style={styles.roundButton}><Ionicons name="notifications-outline" size={21} color={palette.ink} /><View style={styles.badgeDot} /></TouchableOpacity></View>
    <View style={styles.greeting}><Text style={styles.eyebrow}>ADULTS 18+ • PRIVATE • MODERATED</Text><Text style={styles.title}>Meet someone new.</Text><Text style={styles.subtitle}>Choose how you want to connect, then start talking.</Text></View>

    <LinearGradient colors={['#2A0B17', '#671A34']} style={styles.matchCard}>
      <View style={styles.glowOne} /><View style={styles.glowTwo} />
      <View style={styles.onlinePill}><View style={styles.liveDot} /><Text style={styles.onlineText}>25,340 adults online now</Text></View>
      <Text style={styles.cardTitle}>How do you want to chat?</Text>
      <View style={styles.modeRow}>{modes.map((item) => { const active = mode === item.key; return <TouchableOpacity key={item.key} onPress={() => setMode(item.key)} style={[styles.mode, active && styles.modeActive]}><Ionicons name={item.icon} size={21} color={active ? palette.coral : 'rgba(255,255,255,0.72)'} /><Text style={[styles.modeText, active && styles.modeTextActive]}>{item.key}</Text><Text style={[styles.modeDescription, active && styles.modeDescriptionActive]}>{item.description}</Text></TouchableOpacity>; })}</View>
      <TouchableOpacity onPress={() => onStartMatch(mode, mood)} activeOpacity={0.87} style={shadow.coral}><LinearGradient colors={['#A52A4D', '#73112D']} style={styles.startButton}><Ionicons name={mode === 'Video' ? 'videocam' : mode === 'Voice' ? 'call' : 'chatbubble-ellipses'} size={19} color="#FFFFFF" /><Text style={styles.startText}>Start {mode.toLowerCase()} chat</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></LinearGradient></TouchableOpacity>
      <TouchableOpacity style={styles.filterLink}><Ionicons name="options-outline" size={17} color="rgba(255,255,255,0.8)" /><Text style={styles.filterLinkText}>Language • Interests • Verified profiles</Text></TouchableOpacity>
    </LinearGradient>

    <Text style={styles.sectionTitle}>What brings you here?</Text><View style={styles.moodRow}>{moods.map((item) => { const active = mood === item.label; return <TouchableOpacity key={item.label} onPress={() => setMood(item.label)} style={[styles.moodChip, active && styles.moodChipActive]}><Text style={styles.moodEmoji}>{item.emoji}</Text><Text style={[styles.moodText, active && styles.moodTextActive]}>{item.label}</Text></TouchableOpacity>; })}</View>

    <View style={styles.safetyCard}><View style={styles.safetyIcon}><Ionicons name="shield-checkmark" size={25} color={palette.mint} /></View><View style={{ flex: 1 }}><Text style={styles.safetyTitle}>Your comfort comes first</Text><Text style={styles.safetyText}>Face blur, one-tap reporting, blocking, and active moderation are available in every call.</Text></View><Ionicons name="chevron-forward" size={19} color={palette.inkMuted} /></View>

    <View style={styles.sectionHead}><Text style={styles.sectionTitleInline}>People you may meet</Text><View style={styles.liveLabel}><View style={styles.liveDot} /><Text style={styles.liveLabelText}>Live</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.peopleRow}>{PARTNERS.slice(0, 4).map((person) => <View key={person.id} style={styles.personCard}><Image source={{ uri: person.avatar }} style={styles.personImage} /><View style={styles.personOverlay}><View style={styles.personNameRow}><Text style={styles.personName}>{person.name}, {person.age}</Text>{person.verified && <Ionicons name="checkmark-circle" size={13} color="#9E8BFF" />}</View><Text style={styles.personMeta}>{person.flag} {person.country} • {person.language}</Text></View></View>)}</ScrollView>

    <View style={styles.privacyNote}><Ionicons name="lock-closed" size={17} color={palette.violet} /><Text style={styles.privacyText}>Bloom does not collect a phone number or email. Other people only see your private Bloom ID.</Text></View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { paddingHorizontal: 18, paddingBottom: 28 }, topbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, roundButton: { width: 41, height: 41, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' }, badgeDot: { position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 4, backgroundColor: palette.coral, borderWidth: 1.5, borderColor: '#FFFFFF' },
  greeting: { marginTop: 24, marginBottom: 18 }, eyebrow: { color: palette.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.25 }, title: { color: palette.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.9, marginTop: 4 }, subtitle: { color: palette.inkSoft, fontSize: 12, marginTop: 5 },
  matchCard: { borderRadius: 28, padding: 18, overflow: 'hidden', ...shadow.card }, glowOne: { position: 'absolute', width: 180, height: 180, borderRadius: 90, borderWidth: 34, borderColor: 'rgba(255,255,255,0.04)', right: -68, top: -70 }, glowTwo: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,77,109,0.08)', left: -50, bottom: -54 }, onlinePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#4BE0AD' }, onlineText: { color: 'rgba(255,255,255,0.82)', fontSize: 9.5, fontWeight: '700' }, cardTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 15 }, modeRow: { flexDirection: 'row', gap: 7, marginTop: 14, marginBottom: 17 }, mode: { flex: 1, minHeight: 74, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.07)' }, modeActive: { backgroundColor: '#FFFFFF' }, modeText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900' }, modeTextActive: { color: palette.ink }, modeDescription: { color: 'rgba(255,255,255,0.46)', fontSize: 7.5 }, modeDescriptionActive: { color: palette.inkMuted }, startButton: { height: 54, borderRadius: 27, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, startText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', flex: 1, textAlign: 'center' }, filterLink: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 12 }, filterLinkText: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5, fontWeight: '700' },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', marginTop: 24, marginBottom: 11 }, moodRow: { flexDirection: 'row', gap: 8 }, moodChip: { flex: 1, minHeight: 66, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line, borderRadius: 18 }, moodChipActive: { backgroundColor: palette.coralSoft, borderColor: '#FF9BAD' }, moodEmoji: { fontSize: 18 }, moodText: { color: palette.inkSoft, fontSize: 9, fontWeight: '800', marginTop: 4 }, moodTextActive: { color: palette.coralDark },
  safetyCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: palette.mintSoft, padding: 13, borderRadius: 20, marginTop: 18 }, safetyIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, safetyTitle: { color: '#285F4E', fontSize: 11.5, fontWeight: '900' }, safetyText: { color: '#5B8274', fontSize: 9, lineHeight: 13, marginTop: 3 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 }, sectionTitleInline: { color: palette.ink, fontSize: 16, fontWeight: '900' }, liveLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 }, liveLabelText: { color: palette.inkMuted, fontSize: 9, fontWeight: '700' }, peopleRow: { gap: 10, paddingRight: 8 }, personCard: { width: 140, height: 174, borderRadius: 20, overflow: 'hidden', backgroundColor: palette.surfaceAlt }, personImage: { width: '100%', height: '100%' }, personOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, backgroundColor: 'rgba(23,19,31,0.76)' }, personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 }, personName: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' }, personMeta: { color: 'rgba(255,255,255,0.68)', fontSize: 7.5, marginTop: 3 }, privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: palette.violetSoft, borderRadius: 16, padding: 12, marginTop: 17 }, privacyText: { color: '#675B76', fontSize: 9.5, lineHeight: 14, flex: 1 },
});
