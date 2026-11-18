import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, ScrollView, Text, TextInput, TouchableOpacity, View } from '../components/ThemedPrimitives';
import { palette } from '../constants/theme';
import * as api from '../lib/api';

export default function CreatorScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState<api.CreatorOverview | null>(null);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [code, setCode] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawCoins, setWithdrawCoins] = useState('');
  const transferRequestId = useRef<string | null>(null);
  const withdrawalRequestId = useRef<string | null>(null);
  const newRequestId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const refresh = useCallback(async () => { setOverview(await api.getCreatorOverview()); }, []);
  useEffect(() => { void refresh().catch((error) => Alert.alert('Creator details unavailable', String(error))); }, [refresh]);
  const action = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await operation(); await refresh(); } catch (error) { Alert.alert('Could not complete request', error instanceof Error ? error.message : 'Please retry.'); }
    finally { setBusy(false); }
  };
  const capture = async () => {
    if (Platform.OS === 'web') throw new Error('Live verification requires the Android or iOS app.');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera permission is required for verification.');
    const result = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
    if (result.canceled || !result.assets[0]) return null;
    const converted = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 1200 } }], { format: ImageManipulator.SaveFormat.JPEG, compress: 0.76, base64: true });
    if (!converted.base64) throw new Error('Camera photo could not be prepared.');
    return `data:image/jpeg;base64,${converted.base64}`;
  };
  const status = overview?.application?.status;
  return <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }]}>
    <View style={styles.header}><TouchableOpacity onPress={onBack} style={styles.back}><Ionicons name="arrow-back" size={21} color={palette.ink} /></TouchableOpacity><View><Text style={styles.eyebrow}>BLOOM CREATOR</Text><Text style={styles.title}>Become a Creator & Earn</Text></View></View>
    <View style={styles.card}><Text style={styles.cardTitle}>Your Coin wallet</Text><Text style={styles.balance}>{overview?.wallet.totalCoins ?? 0} {overview?.config.coinName ?? 'Coins'}</Text><Text style={styles.detail}>Purchased: {overview?.wallet.purchasedCoins ?? 0} · Earned: {overview?.wallet.earnedCoins ?? 0} · Eligible to withdraw: {overview?.wallet.eligibleCoins ?? 0}</Text><Text style={styles.hint}>Chat points and Coins are separate balances. Free chat points cannot be withdrawn.</Text></View>

    <View style={styles.card}><Text style={styles.cardTitle}>Creator verification</Text>
      {!overview ? <Text style={styles.detail}>Loading…</Text> : !status ? <><Text style={styles.detail}>Apply with a live selfie and a second live photo showing your face beside a handwritten four-digit code. An admin reviews both photos before approval.</Text><TouchableOpacity onPress={() => setConsent(!consent)} style={styles.consent}><Ionicons name={consent ? 'checkbox' : 'square-outline'} size={22} color={palette.coral} /><Text style={styles.detail}>I consent to collection and secure review of my face photos for creator identity verification. Photos are removed 30 days after review.</Text></TouchableOpacity><TouchableOpacity disabled={!consent || busy || !overview.verificationAvailable} style={[styles.primary, (!consent || busy || !overview.verificationAvailable) && styles.disabled]} onPress={() => void action(api.applyCreator)}><Text style={styles.primaryText}>Start verification</Text></TouchableOpacity>{!overview.verificationAvailable && <Text style={styles.hint}>Verification will open when the secure face and liveness provider is connected.</Text>}</> : null}
      {status === 'selfie_required' && <><Text style={styles.detail}>Step 1 of 2: Use the front camera. Center your face so it fills about 80% of the guide area. A live face and clear framing are required.</Text><TouchableOpacity disabled={busy} style={styles.primary} onPress={() => void action(async () => { const photo = await capture(); if (photo) await api.submitCreatorSelfie(photo); })}><Text style={styles.primaryText}>Open camera for live selfie</Text></TouchableOpacity></>}
      {status === 'otp_required' && <><Text style={styles.detail}>Step 2 of 2: Generate a code, write it on blank white paper, then use the front camera to photograph your face and the paper together. The code expires in 10 minutes.</Text><TouchableOpacity disabled={busy} style={styles.secondary} onPress={() => void action(async () => { const result = await api.generateCreatorCode(); setCode(result.code); })}><Text style={styles.secondaryText}>{code ? 'Generate a new code' : 'Generate four-digit code'}</Text></TouchableOpacity>{code ? <><Text selectable style={styles.code}>{code}</Text><TouchableOpacity disabled={busy} style={styles.primary} onPress={() => void action(async () => { const photo = await capture(); if (photo) { await api.submitCreatorCodePhoto(photo); setCode(''); } })}><Text style={styles.primaryText}>Open camera for code photo</Text></TouchableOpacity></> : null}</>}
      {status === 'under_review' && <><Text style={styles.cardTitle}>Your Profile Is Under Review</Text><Text style={styles.detail}>Your verification has been submitted successfully. Our team will review your application and provide an approval decision within 24 hours.</Text><Text style={styles.hint}>Application Status: Pending Admin Approval. Creator earnings remain locked until approval.</Text></>}
      {status === 'approved' && <Text style={styles.detail}>You are an approved Bloom Creator. Coins received from other members become eligible earnings.</Text>}
      {status === 'rejected' && <><Text style={styles.detail}>Application rejected. {overview?.application?.reviewerNote || 'Please review the photo requirements and try again.'}</Text><TouchableOpacity disabled={busy || !overview?.verificationAvailable} style={styles.secondary} onPress={() => void action(api.applyCreator)}><Text style={styles.secondaryText}>Retry verification</Text></TouchableOpacity></>}
    </View>

    <View style={styles.card}><Text style={styles.cardTitle}>Top up Coins</Text><Text style={styles.detail}>1 Coin = ₹{overview?.config.rupeesPerCoin ?? 1}. Minimum top-up: ₹{overview?.config.minTopupRupees ?? 50}.</Text><View style={styles.packages}>{overview?.packages.map((pack) => <View key={pack.coins} style={styles.package}><Text style={styles.packageText}>₹{pack.coins * (overview?.config.rupeesPerCoin ?? 1)}</Text><Text style={styles.detail}>{pack.coins} Coins</Text></View>)}</View><Text style={styles.hint}>Purchases stay unavailable until verified Google Play and App Store billing are connected. No Coins are credited for an unverified payment.</Text></View>

    <View style={styles.card}><Text style={styles.cardTitle}>Send Coins</Text><Text style={styles.detail}>Transfers are 1:1 with no platform deduction.</Text><TextInput value={recipient} onChangeText={(value) => { transferRequestId.current = null; setRecipient(value); }} autoCapitalize="characters" placeholder="Recipient BLOOM-123456" style={styles.input} /><TextInput value={amount} onChangeText={(value) => { transferRequestId.current = null; setAmount(value); }} keyboardType="number-pad" placeholder="Coins to send" style={styles.input} /><TouchableOpacity disabled={busy || !recipient || !amount} style={styles.secondary} onPress={() => void action(async () => { transferRequestId.current ??= newRequestId(); await api.transferCoins(recipient.trim().toUpperCase(), Number(amount), transferRequestId.current); transferRequestId.current = null; setAmount(''); })}><Text style={styles.secondaryText}>Send Coins</Text></TouchableOpacity></View>

    {status === 'approved' && <View style={styles.card}><Text style={styles.cardTitle}>Withdraw earnings</Text><Text style={styles.detail}>Minimum {overview?.config.minWithdrawalCoins} eligible Coins. You receive {overview?.config.creatorSharePercent}% and Bloom retains {100 - (overview?.config.creatorSharePercent ?? 80)}%. Payout needs admin approval, KYC and tax checks.</Text><TextInput value={withdrawCoins} onChangeText={(value) => { withdrawalRequestId.current = null; setWithdrawCoins(value); }} keyboardType="number-pad" placeholder="Eligible Coins to withdraw" style={styles.input} /><TouchableOpacity disabled={busy || !withdrawCoins} style={styles.primary} onPress={() => void action(async () => { withdrawalRequestId.current ??= newRequestId(); await api.requestCreatorWithdrawal(Number(withdrawCoins), withdrawalRequestId.current); withdrawalRequestId.current = null; setWithdrawCoins(''); })}><Text style={styles.primaryText}>Request withdrawal</Text></TouchableOpacity></View>}
    <View style={styles.card}><Text style={styles.cardTitle}>Recent activity</Text>{overview?.transactions.length ? overview.transactions.map((item) => <Text key={item.id} style={styles.history}>{item.type.replaceAll('_', ' ')} · {item.purchasedDelta + item.earnedDelta} Coins · {new Date(item.createdAt).toLocaleDateString()}</Text>) : <Text style={styles.hint}>No Coin transactions yet.</Text>}{overview?.withdrawals.map((item) => <Text key={item.id} style={styles.history}>Withdrawal {item.coins} Coins · ₹{(item.payoutPaise / 100).toFixed(2)} payout · {item.status}</Text>)}</View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.canvas }, content: { paddingHorizontal: 18, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }, back: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line },
  eyebrow: { color: palette.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1 }, title: { color: palette.ink, fontSize: 23, fontWeight: '900' }, card: { backgroundColor: palette.surface, borderRadius: 22, padding: 17, borderWidth: 1, borderColor: palette.line },
  cardTitle: { color: palette.ink, fontSize: 16, fontWeight: '900', marginBottom: 8 }, balance: { color: palette.coral, fontSize: 27, fontWeight: '900' }, detail: { color: palette.inkSoft, fontSize: 11, lineHeight: 17 }, hint: { color: palette.inkMuted, fontSize: 10, lineHeight: 15, marginTop: 9 },
  consent: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 }, primary: { backgroundColor: palette.coral, borderRadius: 24, minHeight: 46, alignItems: 'center', justifyContent: 'center', marginTop: 15, paddingHorizontal: 12 }, primaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, secondary: { backgroundColor: palette.coralSoft, borderRadius: 24, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingHorizontal: 12 }, secondaryText: { color: palette.coral, fontSize: 12, fontWeight: '900' }, disabled: { opacity: 0.45 }, code: { color: palette.ink, fontSize: 34, fontWeight: '900', letterSpacing: 8, textAlign: 'center', marginTop: 12 },
  input: { backgroundColor: palette.surfaceAlt, borderRadius: 13, borderWidth: 1, borderColor: palette.line, marginTop: 11, paddingHorizontal: 13, minHeight: 46, color: palette.ink }, packages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }, package: { minWidth: 81, borderRadius: 14, borderWidth: 1, borderColor: palette.line, padding: 10, alignItems: 'center' }, packageText: { color: palette.ink, fontSize: 13, fontWeight: '900' }, history: { color: palette.inkSoft, fontSize: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: palette.line },
});
