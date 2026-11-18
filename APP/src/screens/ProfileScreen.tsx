import React from 'react';
import { StyleSheet } from 'react-native';
import { ScrollView, Text, TouchableOpacity, View } from '../components/ThemedPrimitives';
import { Ionicons } from '../components/ThemedPrimitives';
import { LinearGradient } from '../components/ThemedPrimitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, shadow } from '../constants/theme';
import PersonAvatar from '../components/PersonAvatar';
import type { SessionUser } from '../types/chat';

interface Props {
  user: SessionUser;
  onBack: () => void;
  onSettings: () => void;
  onFindMatch: () => void;
}

export default function ProfileScreen({ user, onBack, onSettings, onFindMatch }: Props) {
  const insets = useSafeAreaInsets();

  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]} showsVerticalScrollIndicator={false}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityLabel="Back" onPress={onBack} style={styles.headerButton}><Ionicons name="arrow-back" size={21} color={palette.ink} /></TouchableOpacity>
      <View style={styles.headerTitle}><Text style={styles.eyebrow}>YOUR BLOOM SPACE</Text><Text style={styles.title}>My profile</Text></View>
      <TouchableOpacity accessibilityLabel="Settings" onPress={onSettings} style={styles.headerButton}><Ionicons name="settings-outline" size={21} color={palette.ink} /></TouchableOpacity>
    </View>

    <LinearGradient colors={['#2B0C19', '#641A3A', '#9A2852']} style={styles.hero}>
      <View style={styles.glow} />
      <View style={styles.heroPill}><View style={styles.liveDot} /><Text style={styles.heroPillText}>Ready to meet someone</Text></View>
      <View style={styles.avatarWrap}><PersonAvatar avatar={user.avatar} gender={user.gender} style={styles.avatar} /></View>
      <Text style={styles.name}>{user.name}</Text>
      <Text style={styles.avatarLabel}>Illustrated avatar · {user.gender} · 18+</Text>
      <Text style={styles.bio}>{user.about || 'Your next good conversation is one tap away.'}</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Find a random chat" onPress={onFindMatch} style={styles.matchButton} activeOpacity={0.85}>
        <Ionicons name="shuffle" size={21} color={palette.coral} /><Text style={styles.matchButtonText}>Find a random chat</Text><Ionicons name="arrow-forward" size={19} color={palette.coral} />
      </TouchableOpacity>
    </LinearGradient>

    <View style={styles.stats}>
      <View style={styles.stat}><View style={styles.statIcon}><Ionicons name="flower-outline" size={19} color={palette.coral} /></View><Text style={styles.statValue}>{user.points}</Text><Text style={styles.statLabel}>Bloom points</Text></View>
      <View style={styles.statDivider} />
      <View style={styles.stat}><View style={styles.statIcon}><Ionicons name="person-outline" size={19} color={palette.violet} /></View><Text style={styles.statValue}>{user.gender}</Text><Text style={styles.statLabel}>Your profile</Text></View>
      <View style={styles.statDivider} />
      <View style={styles.stat}><View style={styles.statIcon}><Ionicons name="language-outline" size={19} color={palette.mint} /></View><Text style={styles.statValue}>{user.language}</Text><Text style={styles.statLabel}>Language</Text></View>
    </View>

    {user.interests.length > 0 && <><Text style={styles.sectionTitle}>Your interests</Text>
    <View style={styles.interests}>{user.interests.map((item) => <View key={item} style={styles.interest}><Text style={styles.interestText}>{item}</Text></View>)}</View></>}

    <View style={styles.idCard}><View style={styles.idIcon}><Ionicons name="finger-print-outline" size={23} color={palette.violet} /></View><View style={{ flex: 1 }}><Text style={styles.idLabel}>Your private Bloom ID</Text><Text selectable style={styles.idValue}>{user.bloomId}</Text></View><Ionicons name="lock-closed" size={17} color={palette.inkMuted} /></View>
    <Text style={styles.privacy}>Your portrait is an illustration. No photo is required to meet people on Bloom.</Text>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingHorizontal: 18, paddingBottom: 35 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 19 },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1 },
  eyebrow: { color: palette.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: palette.ink, fontSize: 26, fontWeight: '900', letterSpacing: -0.7 },
  hero: { borderRadius: 30, paddingHorizontal: 20, paddingTop: 23, paddingBottom: 21, alignItems: 'center', overflow: 'hidden', ...shadow.card },
  glow: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 34, borderColor: 'rgba(255,255,255,0.055)', right: -75, top: -90 },
  heroPill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.13)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#54E3B6' },
  heroPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  avatarWrap: { marginTop: 20, borderRadius: 53, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', ...shadow.coral },
  avatar: { width: 102, height: 102, borderRadius: 50 },
  name: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 13, letterSpacing: -0.5 },
  avatarLabel: { color: '#F8C6D7', fontSize: 10.5, fontWeight: '700', marginTop: 5 },
  bio: { color: 'rgba(255,255,255,0.74)', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 13, maxWidth: 270 },
  matchButton: { width: '100%', height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 15, marginTop: 20 },
  matchButtonText: { color: palette.coral, fontSize: 13, fontWeight: '900', flex: 1, textAlign: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line, borderRadius: 22, paddingVertical: 16, marginTop: 18 },
  stat: { flex: 1, alignItems: 'center' },
  statIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: palette.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: palette.ink, fontSize: 13, fontWeight: '900', marginTop: 7 },
  statLabel: { color: palette.inkMuted, fontSize: 9, marginTop: 2 },
  statDivider: { width: 1, height: 52, backgroundColor: palette.line },
  sectionTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', marginTop: 23, marginBottom: 11 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interest: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: palette.violetSoft },
  interestText: { color: palette.violet, fontSize: 10, fontWeight: '800' },
  emptyInterests: { color: palette.inkMuted, fontSize: 11, lineHeight: 16 },
  idCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line, borderRadius: 20, padding: 15, marginTop: 24 },
  idIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: palette.violetSoft, alignItems: 'center', justifyContent: 'center' },
  idLabel: { color: palette.inkMuted, fontSize: 9, fontWeight: '800' },
  idValue: { color: palette.ink, fontSize: 13, fontWeight: '900', marginTop: 3 },
  privacy: { color: palette.inkMuted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 16, paddingHorizontal: 22 },
});
