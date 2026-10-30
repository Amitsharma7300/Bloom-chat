import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BloomLogo, { BloomFlower } from '../components/BloomLogo';
import { palette, shadow } from '../constants/theme';

export function SplashScreen() {
  return <LinearGradient colors={['#260912', '#5B1028', '#8E1838']} style={styles.splash}>
    <View style={styles.orbOne} /><View style={styles.orbTwo} />
    <BloomLogo light />
    <Text style={styles.splashLine}>Good conversations grow here.</Text>
    <View style={styles.loadingTrack}><View style={styles.loadingFill} /></View>
    <Text style={styles.safeLine}>18+  •  Safe by design</Text>
  </LinearGradient>;
}

const slides = [
  { icon: 'chatbubbles' as const, title: 'Meet someone\nnew, instantly', body: 'Text, talk, or go on video with people who match your mood and interests.', color: '#8E1838' },
  { icon: 'shield-checkmark' as const, title: 'Comfort comes\nfirst', body: 'Verified profiles, face blur, one-tap reports, and always-on moderation keep Bloom kind.', color: '#2FBF91' },
  { icon: 'heart' as const, title: 'Keep the people\nyou connect with', body: 'Like each other, become friends, and continue with private text, voice, or video chats.', color: '#A83A59' },
];

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const insets = useSafeAreaInsets(); const [index, setIndex] = useState(0); const item = slides[index];
  const next = () => index === slides.length - 1 ? onFinish() : setIndex(index + 1);
  return <View style={[styles.entry, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 18 }]}>
    <View style={styles.entryTop}><BloomLogo compact /><TouchableOpacity onPress={onFinish}><Text style={styles.skip}>Skip</Text></TouchableOpacity></View>
    <View style={styles.illustration}>
      <View style={[styles.bigBloom, { backgroundColor: `${item.color}18` }]} />
      <View style={[styles.midBloom, { borderColor: `${item.color}38` }]} />
      <View style={styles.heroFlower}><BloomFlower size={126} /><View style={styles.heroFlowerCenter}><Ionicons name={item.icon} size={25} color="#FFFFFF" /></View></View>
      <View style={[styles.floatChip, styles.floatOne]}><Ionicons name="sparkles" size={16} color={palette.coral} /><Text style={styles.floatText}>Good vibes</Text></View>
      <View style={[styles.floatChip, styles.floatTwo]}><View style={styles.liveDot} /><Text style={styles.floatText}>25k online</Text></View>
    </View>
    <View><Text style={styles.entryTitle}>{item.title}</Text><Text style={styles.entryBody}>{item.body}</Text></View>
    <View style={styles.entryBottom}><View style={styles.dots}>{slides.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}</View>
      <TouchableOpacity onPress={next} activeOpacity={0.86} style={shadow.coral}><LinearGradient colors={['#A52A4D', '#73112D']} style={styles.nextButton}><Text style={styles.nextLabel}>{index === slides.length - 1 ? 'Get started' : 'Continue'}</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></LinearGradient></TouchableOpacity>
    </View>
  </View>;
}

export function RulesScreen({ onAgree }: { onAgree: () => void }) {
  const insets = useSafeAreaInsets(); const rules = [
    ['happy-outline', 'Be a good human', 'Respect people, identities, and boundaries.'],
    ['eye-off-outline', 'Keep it appropriate', 'No nudity, sexual content, or harassment.'],
    ['calendar-outline', 'Adults only', 'Bloom is strictly for people aged 18 and over.'],
    ['lock-closed-outline', 'Protect your privacy', 'Never share passwords, financial details, or your address.'],
  ] as const;
  return <View style={[styles.entry, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 18 }]}>
    <BloomLogo compact /><View style={styles.rulesBadge}><Ionicons name="shield-checkmark" size={36} color={palette.mint} /></View>
    <Text style={styles.rulesTitle}>Let’s keep Bloom kind</Text><Text style={styles.rulesIntro}>Before you join, make this small promise to the community.</Text>
    <View style={styles.rulesList}>{rules.map(([icon, title, body]) => <View key={title} style={styles.ruleRow}><View style={styles.ruleIcon}><Ionicons name={icon} size={20} color={palette.violet} /></View><View style={{ flex: 1 }}><Text style={styles.ruleTitle}>{title}</Text><Text style={styles.ruleBody}>{body}</Text></View></View>)}</View>
    <Text style={styles.legal}>By continuing, you agree to Bloom’s Community Guidelines, Terms and Privacy Policy.</Text>
    <TouchableOpacity onPress={onAgree} activeOpacity={0.86}><LinearGradient colors={['#A52A4D', '#73112D']} style={styles.fullButton}><Ionicons name="checkmark-circle" size={20} color="#FFFFFF" /><Text style={styles.fullButtonText}>I agree — let me in</Text></LinearGradient></TouchableOpacity>
  </View>;
}

export function AnonymousJoinScreen({ userId, onComplete }: { userId: string; onComplete: (gender: 'Man' | 'Woman') => void }) {
  const insets = useSafeAreaInsets();
  const [gender, setGender] = useState<'Man' | 'Woman' | null>(null);
  const [agreed, setAgreed] = useState(false);
  const ready = gender !== null && agreed;
  return <ScrollView contentContainerStyle={[styles.auth, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 22 }]}>
    <BloomLogo /><Text style={styles.authTitle}>Join anonymously</Text><Text style={styles.authSubtitle}>No phone number, email, password, or social sign-in. Bloom only gives you a private ID.</Text>
    <View style={styles.idCard}><View style={styles.idIcon}><Ionicons name="finger-print" size={25} color={palette.violet} /></View><View style={{ flex: 1 }}><Text style={styles.idLabel}>YOUR PRIVATE BLOOM ID</Text><Text style={styles.idValue}>{userId}</Text></View><Ionicons name="lock-closed" size={18} color={palette.mint} /></View>
    <View style={styles.authCard}><Text style={styles.inputLabel}>I AM</Text><View style={styles.genderRow}>{(['Man', 'Woman'] as const).map((item) => { const selected = gender === item; return <TouchableOpacity key={item} onPress={() => setGender(item)} style={[styles.genderCard, selected && styles.genderCardActive]}><Ionicons name={item === 'Man' ? 'male' : 'female'} size={25} color={selected ? '#FFFFFF' : palette.violet} /><Text style={[styles.genderText, selected && styles.genderTextActive]}>{item}</Text>{selected && <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />}</TouchableOpacity>; })}</View>
      <TouchableOpacity onPress={() => setAgreed(!agreed)} style={styles.agreeRow} activeOpacity={0.8}><View style={[styles.checkbox, agreed && styles.checkboxActive]}>{agreed && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}</View><Text style={styles.agreeText}>I confirm I am 18+ and agree to Bloom’s Community Guidelines, Terms, and Privacy Policy.</Text></TouchableOpacity>
      <TouchableOpacity disabled={!ready} onPress={() => gender && onComplete(gender)} activeOpacity={0.86} style={!ready && styles.disabledButton}><LinearGradient colors={ready ? ['#A52A4D', '#73112D'] : ['#CFC7D1', '#BEB5C1']} style={styles.fullButton}><Text style={styles.fullButtonText}>Enter Bloom</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></LinearGradient></TouchableOpacity>
    </View>
    <View style={styles.ageNote}><Ionicons name="shield-checkmark" size={18} color={palette.violet} /><Text style={styles.ageText}>Your ID identifies you inside Bloom without exposing personal contact information.</Text></View>
  </ScrollView>;
}

const interests = ['Music', 'Gaming', 'Cricket', 'Movies', 'Travel', 'Fitness', 'Fashion', 'Coding'];
export function ProfileSetupScreen({ onComplete }: { onComplete: () => void }) {
  const insets = useSafeAreaInsets(); const [picked, setPicked] = useState(['Music', 'Travel', 'Movies']); const [name, setName] = useState('Sky');
  const toggle = (item: string) => setPicked((current) => current.includes(item) ? current.filter((x) => x !== item) : current.length < 5 ? [...current, item] : current);
  return <ScrollView contentContainerStyle={[styles.setup, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 22 }]}>
    <View style={styles.setupHead}><BloomLogo compact /><Text style={styles.stepText}>STEP 3 OF 3</Text></View><View style={styles.progress}><View style={styles.progressFill} /></View>
    <Text style={styles.setupTitle}>Make it feel like you</Text><Text style={styles.setupBody}>You can stay private. A nickname and avatar are all you need.</Text>
    <View style={styles.avatarMaker}><Image source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=85' }} style={styles.setupAvatar} /><TouchableOpacity style={styles.cameraButton}><Ionicons name="camera" size={18} color="#FFFFFF" /></TouchableOpacity><TouchableOpacity style={styles.avatarLink}><Ionicons name="color-palette-outline" size={16} color={palette.violet} /><Text style={styles.avatarLinkText}>Make an avatar</Text></TouchableOpacity></View>
    <Text style={styles.inputLabel}>NICKNAME</Text><TextInput value={name} onChangeText={setName} maxLength={24} style={styles.standardInput} />
    <View style={styles.labelRow}><Text style={styles.inputLabel}>PICK 3–5 INTERESTS</Text><Text style={styles.countText}>{picked.length}/5</Text></View>
    <View style={styles.interestGrid}>{interests.map((item) => { const active = picked.includes(item); return <TouchableOpacity key={item} onPress={() => toggle(item)} style={[styles.interestChip, active && styles.interestChipActive]}><Text style={[styles.interestText, active && styles.interestTextActive]}>{item}</Text>{active && <Ionicons name="checkmark" size={15} color={palette.violet} />}</TouchableOpacity>; })}</View>
    <View style={styles.verifyCard}><View style={styles.verifyIcon}><Ionicons name="shield-checkmark" size={22} color={palette.mint} /></View><View style={{ flex: 1 }}><Text style={styles.verifyTitle}>Verify your age and identity</Text><Text style={styles.verifyBody}>A quick live selfie earns your blue tick and builds trust.</Text></View><Text style={styles.later}>Later</Text></View>
    <TouchableOpacity onPress={onComplete} activeOpacity={0.86}><LinearGradient colors={['#A52A4D', '#73112D']} style={styles.fullButton}><Text style={styles.fullButtonText}>Finish my profile</Text><Ionicons name="sparkles" size={19} color="#FFFFFF" /></LinearGradient></TouchableOpacity>
  </ScrollView>;
}

const styles = StyleSheet.create({
  heroFlower: { width: 146, height: 146, alignItems: 'center', justifyContent: 'center', ...shadow.card },
  heroFlowerCenter: { position: 'absolute', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#8E1838', borderWidth: 3, borderColor: '#FFF8F8' },
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, orbOne: { position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(255,255,255,0.08)', top: -80, right: -100 }, orbTwo: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,210,95,0.09)', bottom: -90, left: -80 }, splashLine: { color: 'rgba(255,255,255,0.78)', fontSize: 14, marginTop: 14 }, loadingTrack: { width: 120, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 52 }, loadingFill: { width: '68%', height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' }, safeLine: { position: 'absolute', bottom: 42, color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  entry: { flex: 1, paddingHorizontal: 24, backgroundColor: palette.canvas }, entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, skip: { color: palette.inkSoft, fontWeight: '700', fontSize: 13 }, illustration: { flex: 1, minHeight: 280, maxHeight: 390, alignItems: 'center', justifyContent: 'center' }, bigBloom: { position: 'absolute', width: 260, height: 260, borderRadius: 130 }, midBloom: { position: 'absolute', width: 205, height: 205, borderRadius: 104, borderWidth: 1.5, borderStyle: 'dashed' }, heroIcon: { width: 122, height: 122, borderRadius: 44, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }], ...shadow.card }, floatChip: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, ...shadow.card }, floatOne: { left: 2, top: '26%' }, floatTwo: { right: 0, bottom: '24%' }, floatText: { color: palette.inkSoft, fontSize: 11, fontWeight: '800' }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.mint }, entryTitle: { color: palette.ink, fontSize: 34, lineHeight: 39, letterSpacing: -1.2, fontWeight: '900' }, entryBody: { color: palette.inkSoft, fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 330 }, entryBottom: { marginTop: 26, gap: 19 }, dots: { flexDirection: 'row', gap: 6 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#DDD4DF' }, dotActive: { width: 24, backgroundColor: palette.coral }, nextButton: { height: 56, borderRadius: 28, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, nextLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  rulesBadge: { width: 72, height: 72, borderRadius: 24, marginTop: 32, backgroundColor: palette.mintSoft, alignItems: 'center', justifyContent: 'center' }, rulesTitle: { color: palette.ink, fontSize: 29, fontWeight: '900', letterSpacing: -0.8, marginTop: 18 }, rulesIntro: { color: palette.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 7 }, rulesList: { gap: 13, marginTop: 26, flex: 1 }, ruleRow: { flexDirection: 'row', gap: 12, alignItems: 'center' }, ruleIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: palette.violetSoft, alignItems: 'center', justifyContent: 'center' }, ruleTitle: { color: palette.ink, fontSize: 13, fontWeight: '900' }, ruleBody: { color: palette.inkSoft, fontSize: 11, lineHeight: 16, marginTop: 2 }, legal: { color: palette.inkMuted, textAlign: 'center', fontSize: 9.5, lineHeight: 14, marginVertical: 15 }, fullButton: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, fullButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  auth: { flexGrow: 1, paddingHorizontal: 24, backgroundColor: palette.canvas }, authTitle: { color: palette.ink, fontSize: 31, fontWeight: '900', letterSpacing: -1, marginTop: 48 }, authSubtitle: { color: palette.inkSoft, fontSize: 14, lineHeight: 20, marginTop: 8, marginBottom: 24 }, authCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: palette.line, padding: 18, borderRadius: 24, ...shadow.card }, inputLabel: { color: palette.inkMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginBottom: 8 }, phoneRow: { height: 52, flexDirection: 'row', borderRadius: 16, borderWidth: 1, borderColor: palette.line, overflow: 'hidden', marginBottom: 16 }, countryCode: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, backgroundColor: palette.surfaceAlt, borderRightWidth: 1, borderRightColor: palette.line }, flagText: { fontSize: 18 }, phoneText: { color: palette.ink, fontWeight: '800' }, phoneInput: { flex: 1, paddingHorizontal: 14, color: palette.ink, fontSize: 15 }, otpInput: { height: 56, borderWidth: 1, borderColor: palette.line, borderRadius: 16, textAlign: 'center', fontSize: 22, letterSpacing: 6, color: palette.ink, marginBottom: 8 }, changeNumber: { color: palette.violet, fontWeight: '800', textAlign: 'right', fontSize: 11, marginBottom: 18 }, orRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginVertical: 19 }, orLine: { flex: 1, height: 1, backgroundColor: palette.line }, orText: { color: palette.inkMuted, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.7 }, socialRow: { flexDirection: 'row', gap: 10 }, socialButton: { flex: 1, height: 49, borderRadius: 16, borderWidth: 1, borderColor: palette.line, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, socialText: { color: palette.ink, fontSize: 12, fontWeight: '800' }, ageNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: palette.violetSoft, borderRadius: 16, marginTop: 16 }, ageText: { color: '#594D6C', fontSize: 10.5, lineHeight: 15, flex: 1 },
  setup: { flexGrow: 1, paddingHorizontal: 24, backgroundColor: palette.canvas }, setupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, stepText: { color: palette.inkMuted, fontSize: 9.5, fontWeight: '900', letterSpacing: 1 }, progress: { height: 5, backgroundColor: '#E9E2EA', borderRadius: 3, marginTop: 18 }, progressFill: { width: '100%', height: 5, borderRadius: 3, backgroundColor: palette.coral }, setupTitle: { color: palette.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 24 }, setupBody: { color: palette.inkSoft, fontSize: 13, lineHeight: 19, marginTop: 6 }, avatarMaker: { alignItems: 'center', marginVertical: 20 }, setupAvatar: { width: 86, height: 86, borderRadius: 30 }, cameraButton: { position: 'absolute', marginLeft: 68, marginTop: 58, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.coral, borderWidth: 3, borderColor: palette.canvas }, avatarLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 }, avatarLinkText: { color: palette.violet, fontSize: 11, fontWeight: '800' }, standardInput: { height: 50, borderRadius: 16, borderWidth: 1, borderColor: palette.line, backgroundColor: '#FFFFFF', paddingHorizontal: 14, color: palette.ink, fontSize: 14, marginBottom: 20 }, labelRow: { flexDirection: 'row', justifyContent: 'space-between' }, countText: { color: palette.violet, fontSize: 10, fontWeight: '900' }, interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, interestChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.line, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 }, interestChipActive: { backgroundColor: palette.violetSoft, borderColor: '#B9AAFF' }, interestText: { color: palette.inkSoft, fontSize: 11, fontWeight: '700' }, interestTextActive: { color: palette.violet, fontWeight: '900' }, verifyCard: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: palette.mintSoft, borderRadius: 18, padding: 12, marginVertical: 18 }, verifyIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, verifyTitle: { color: '#255D4B', fontSize: 11.5, fontWeight: '900' }, verifyBody: { color: '#568171', fontSize: 9.5, marginTop: 2 }, later: { color: palette.mint, fontSize: 10, fontWeight: '900' },
  idCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: palette.violetSoft, borderRadius: 19, padding: 14, marginBottom: 16 },
  idIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  idLabel: { color: palette.inkMuted, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.9 },
  idValue: { color: palette.violet, fontSize: 16, fontWeight: '900', letterSpacing: 0.7, marginTop: 3 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  genderCard: { flex: 1, height: 92, borderRadius: 19, borderWidth: 1.5, borderColor: palette.line, backgroundColor: palette.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 5 },
  genderCardActive: { backgroundColor: palette.violet, borderColor: palette.violet },
  genderText: { color: palette.ink, fontSize: 11.5, fontWeight: '900' },
  genderTextActive: { color: '#FFFFFF' },
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 12, borderRadius: 16, backgroundColor: palette.surfaceAlt, marginBottom: 17 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: '#C9BFCB', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: palette.mint, borderColor: palette.mint },
  agreeText: { flex: 1, color: palette.inkSoft, fontSize: 9.5, lineHeight: 14 },
  disabledButton: { opacity: 0.65 },
});
