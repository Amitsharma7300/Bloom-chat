import React, { useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from './ThemedPrimitives';
import { Ionicons } from './ThemedPrimitives';
import { LinearGradient } from './ThemedPrimitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette, shadow } from '../constants/theme';
import PersonAvatar from './PersonAvatar';
import { GENDER_AVATARS } from '../lib/avatars';

export type MatchPreference = 'Random' | 'Male' | 'Female';

interface Props {
  visible: boolean;
  premium: boolean;
  points: number;
  onClose: () => void;
  onSelect: (preference: MatchPreference) => void;
  onSubscribe: () => void;
  onSpendPoints: (preference: Exclude<MatchPreference, 'Random'>) => void;
}

const choices: { key: MatchPreference; icon: keyof typeof Ionicons.glyphMap; detail: string }[] = [
  { key: 'Random', icon: 'shuffle', detail: 'Free • Meet anyone' },
  { key: 'Male', icon: 'male', detail: 'Match with men' },
  { key: 'Female', icon: 'female', detail: 'Match with women' },
];

export default function MatchPreferenceModal({ visible, premium, points, onClose, onSelect, onSubscribe, onSpendPoints }: Props) {
  const insets = useSafeAreaInsets();
  const [gate, setGate] = useState<Exclude<MatchPreference, 'Random'> | null>(null);
  const choose = (choice: MatchPreference) => {
    if (choice === 'Random' || premium) onSelect(choice);
    else setGate(choice);
  };
  const close = () => { setGate(null); onClose(); };

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <View style={styles.backdrop}><TouchableOpacity style={{ flex: 1 }} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}><View style={styles.handle} />
        {!gate ? <>
          <View style={styles.head}><View><Text style={styles.eyebrow}>MATCH PREFERENCE</Text><Text style={styles.title}>Who do you want to chat with?</Text></View><TouchableOpacity onPress={close}><Ionicons name="close-circle" size={28} color={palette.inkMuted} /></TouchableOpacity></View>
          <Text style={styles.body}>Random matching is always free. Choose a gender with Premium or Bloom points.</Text>
          <View style={styles.choices}>{choices.map((choice) => {
            const locked = choice.key !== 'Random' && !premium;
            return <TouchableOpacity key={choice.key} onPress={() => choose(choice.key)} style={styles.choice} activeOpacity={0.8}>
              <View style={[styles.choiceIcon, choice.key === 'Random' && styles.randomIcon]}>{choice.key === 'Random' ? <Ionicons name={choice.icon} size={23} color="#FFF" /> : <><PersonAvatar avatar={GENDER_AVATARS[choice.key === 'Male' ? 'Man' : 'Woman']} gender={choice.key === 'Male' ? 'Man' : 'Woman'} style={styles.choiceAvatar} /><View style={styles.genderBadge}><Ionicons name={choice.icon} size={10} color="#FFFFFF" /></View></>}</View>
              <View style={{ flex: 1 }}><Text style={styles.choiceTitle}>{choice.key}</Text><Text style={styles.choiceDetail}>{choice.detail}</Text></View>
              {locked ? <View style={styles.lockPill}><Ionicons name="lock-closed" size={12} color={palette.gold} /><Text style={styles.lockText}>PRO</Text></View> : <Ionicons name="arrow-forward-circle" size={25} color={palette.coral} />}
            </TouchableOpacity>;
          })}</View>
          <View style={styles.balance}><Ionicons name="flower" size={17} color={palette.gold} /><Text style={styles.balanceText}>Your Bloom points</Text><Text style={styles.balanceValue}>{points}</Text></View>
        </> : <>
          <TouchableOpacity onPress={() => setGate(null)} style={styles.back}><Ionicons name="arrow-back" size={19} color={palette.ink} /></TouchableOpacity>
          <View style={styles.gateIcon}><Ionicons name="diamond" size={29} color={palette.gold} /></View>
          <Text style={[styles.title, { textAlign: 'center' }]}>Unlock {gate} matching</Text>
          <Text style={[styles.body, { textAlign: 'center' }]}>Subscribe for unlimited filters, or use 50 Bloom points for this match.</Text>
          <TouchableOpacity onPress={() => { setGate(null); onSubscribe(); }} style={styles.subscribeShadow}><LinearGradient colors={['#A52A4D', '#73112D']} style={styles.subscribe}><Ionicons name="diamond" size={18} color="#FFF" /><Text style={styles.subscribeText}>Get Bloom Premium</Text></LinearGradient></TouchableOpacity>
          <TouchableOpacity disabled={points < 50} onPress={() => { const selected = gate; setGate(null); onSpendPoints(selected); }} style={[styles.pointsButton, points < 50 && { opacity: 0.45 }]}><Ionicons name="flower-outline" size={18} color={palette.gold} /><Text style={styles.pointsText}>Use 50 points</Text><Text style={styles.pointBalance}>{points} available</Text></TouchableOpacity>
        </>}
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(24,8,15,0.6)' }, sheet: { backgroundColor: palette.canvas, paddingHorizontal: 20, paddingTop: 10, borderTopLeftRadius: 29, borderTopRightRadius: 29 }, handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#D6CCD1', alignSelf: 'center', marginBottom: 16 }, head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: palette.coral, fontSize: 8.5, fontWeight: '900', letterSpacing: 1 }, title: { color: palette.ink, fontSize: 21, fontWeight: '900', marginTop: 3 }, body: { color: palette.inkSoft, fontSize: 10.5, lineHeight: 15, marginTop: 7 }, choices: { marginTop: 15, gap: 9 }, choice: { minHeight: 70, paddingHorizontal: 12, borderRadius: 20, flexDirection: 'row', gap: 11, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.line }, choiceIcon: { width: 45, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.violetSoft }, randomIcon: { backgroundColor: palette.coral }, choiceTitle: { color: palette.ink, fontSize: 12.5, fontWeight: '900' }, choiceDetail: { color: palette.inkMuted, fontSize: 8.5, marginTop: 3 }, lockPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 11, backgroundColor: palette.goldSoft }, lockText: { color: '#9A7124', fontSize: 7.5, fontWeight: '900' }, balance: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: palette.goldSoft, padding: 11, borderRadius: 15, marginTop: 14 }, balanceText: { flex: 1, color: '#896722', fontSize: 9.5, fontWeight: '700' }, balanceValue: { color: '#896722', fontSize: 11, fontWeight: '900' }, back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.line }, gateIcon: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', backgroundColor: palette.goldSoft, marginTop: 4 }, subscribeShadow: { marginTop: 18, ...shadow.coral }, subscribe: { height: 52, borderRadius: 26, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }, subscribeText: { color: '#FFF', fontSize: 12.5, fontWeight: '900' }, pointsButton: { height: 50, borderRadius: 24, marginTop: 10, paddingHorizontal: 15, flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.line }, pointsText: { color: palette.ink, fontSize: 11, fontWeight: '900', flex: 1 }, pointBalance: { color: palette.inkMuted, fontSize: 8.5 },
  choiceAvatar: { width: '100%', height: '100%', borderRadius: 16 },
  genderBadge: { position: 'absolute', right: 1, bottom: 1, width: 17, height: 17, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.violet, borderWidth: 1.5, borderColor: '#FFF' },
});
