import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from './ThemedPrimitives';
import { Ionicons } from './ThemedPrimitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BloomLogo from './BloomLogo';
import { palette, shadow } from '../constants/theme';

export type MenuDestination = 'creator' | 'profile' | 'friends' | 'chats' | 'search' | 'suggestions' | 'settings';

const items: { key: MenuDestination; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'creator', title: 'Become a Creator & Earn', detail: 'Verify your profile and manage Coins', icon: 'sparkles-outline' },
  { key: 'profile', title: 'My Bloom ID', detail: 'Your private account details', icon: 'finger-print-outline' },
  { key: 'friends', title: 'Friends List', detail: 'People you added', icon: 'people-outline' },
  { key: 'chats', title: 'Chats & Messages', detail: 'Continue conversations', icon: 'chatbubbles-outline' },
  { key: 'search', title: 'Search', detail: 'Find people and interests', icon: 'search-outline' },
  { key: 'suggestions', title: 'Add New Friend', detail: 'Daily random suggestions', icon: 'person-add-outline' },
  { key: 'settings', title: 'Settings', detail: 'Privacy, terms and controls', icon: 'settings-outline' },
];

export default function MenuDrawer({ visible, premium, points, onClose, onNavigate }: { visible: boolean; premium: boolean; points: number; onClose: () => void; onNavigate: (destination: MenuDestination) => void }) {
  const insets = useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={[styles.drawer, { paddingTop: insets.top + 17, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.head}><BloomLogo compact /><TouchableOpacity onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color={palette.ink} /></TouchableOpacity></View>
      <View style={styles.account}><View style={styles.accountIcon}><Ionicons name={premium ? 'diamond' : 'flower'} size={22} color={premium ? palette.gold : palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.accountTitle}>{premium ? 'Bloom Premium' : 'Bloom Free'}</Text><Text style={styles.accountSub}>{points} points available</Text></View>{premium && <View style={styles.pro}><Text style={styles.proText}>PRO</Text></View>}</View>
      <View style={styles.items}>{items.map((item) => <TouchableOpacity key={item.key} onPress={() => { onClose(); onNavigate(item.key); }} style={styles.item} activeOpacity={0.75}>
        <View style={styles.itemIcon}><Ionicons name={item.icon} size={20} color={palette.coral} /></View><View style={{ flex: 1 }}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemDetail}>{item.detail}</Text></View><Ionicons name="chevron-forward" size={18} color={palette.inkMuted} />
      </TouchableOpacity>)}</View>
      <View style={{ flex: 1 }} /><View style={styles.safe}><Ionicons name="shield-checkmark" size={19} color={palette.mint} /><Text style={styles.safeText}>Safety tools are available in every chat.</Text></View>
    </View><TouchableOpacity style={{ flex: 1 }} onPress={onClose} /></View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(25,8,15,0.6)' }, drawer: { width: '84%', maxWidth: 390, backgroundColor: palette.canvas, paddingHorizontal: 17, ...shadow.card }, head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, close: { width: 39, height: 39, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.line }, account: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.goldSoft, borderRadius: 19, padding: 12, marginTop: 20 }, accountIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, accountTitle: { color: palette.ink, fontSize: 11.5, fontWeight: '900' }, accountSub: { color: palette.inkMuted, fontSize: 8.5, marginTop: 2 }, pro: { backgroundColor: palette.gold, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 }, proText: { color: '#FFF', fontSize: 7.5, fontWeight: '900' }, items: { marginTop: 18 }, item: { minHeight: 64, flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.line }, itemIcon: { width: 39, height: 39, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.coralSoft }, itemTitle: { color: palette.ink, fontSize: 11.5, fontWeight: '900' }, itemDetail: { color: palette.inkMuted, fontSize: 8.5, marginTop: 2 }, safe: { flexDirection: 'row', gap: 7, alignItems: 'center', padding: 11, borderRadius: 15, backgroundColor: palette.mintSoft }, safeText: { color: '#477767', fontSize: 9, flex: 1 },
});
