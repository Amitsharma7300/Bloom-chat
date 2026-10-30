import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../constants/theme';

export type TabName = 'home' | 'people' | 'friends' | 'profile';
interface Props { activeTab: TabName; onTabPress: (tab: TabName) => void; }
const tabs: { key: TabName; label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', active: 'home' },
  { key: 'people', label: 'For You', icon: 'people-outline', active: 'people' },
  { key: 'friends', label: 'Chats', icon: 'chatbubbles-outline', active: 'chatbubbles' },
  { key: 'profile', label: 'Me', icon: 'person-outline', active: 'person' },
];

export default function BottomNavBar({ activeTab, onTabPress }: Props) {
  return <View style={styles.container}>{tabs.map((tab) => {
    const selected = tab.key === activeTab;
    return <TouchableOpacity key={tab.key} onPress={() => onTabPress(tab.key)} activeOpacity={0.72} style={styles.item}>
      <View style={[styles.iconWrap, selected && styles.iconWrapSelected]}><Ionicons name={selected ? tab.active : tab.icon} size={21} color={selected ? palette.coral : palette.inkMuted} /></View>
      <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
    </TouchableOpacity>;
  })}</View>;
}

const styles = StyleSheet.create({
  container: { minHeight: 72, paddingHorizontal: 8, paddingTop: 7, paddingBottom: 8, flexDirection: 'row', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: palette.line },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center' }, iconWrap: { width: 43, height: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconWrapSelected: { backgroundColor: palette.coralSoft }, label: { color: palette.inkMuted, fontSize: 9.5, fontWeight: '700', marginTop: 2 }, labelSelected: { color: palette.coral },
});
