import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from './ThemedPrimitives';
import { Ionicons } from './ThemedPrimitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../constants/theme';

export type BottomTab = 'home' | 'search' | 'friends' | 'chats' | 'profile';

const tabs: { key: BottomTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'search', label: 'Explore', icon: 'compass-outline' },
  { key: 'friends', label: 'Friends', icon: 'people-outline' },
  { key: 'chats', label: 'Chats', icon: 'chatbubbles-outline' },
  { key: 'profile', label: 'Profile', icon: 'person-outline' },
];

export default function BottomNavigation({ active, onSelect }: { active: BottomTab; onSelect: (tab: BottomTab) => void }) {
  const insets = useSafeAreaInsets();

  return <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 7) }]} accessibilityRole="tablist">
    {tabs.map((tab) => {
      const selected = active === tab.key;
      return <TouchableOpacity key={tab.key} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={tab.label} onPress={() => onSelect(tab.key)} activeOpacity={0.75} style={styles.tab}>
        <Ionicons name={selected ? (tab.key === 'home' ? 'home' : tab.key === 'search' ? 'compass' : tab.key === 'friends' ? 'people' : tab.key === 'chats' ? 'chatbubbles' : 'person') : tab.icon} size={21} color={selected ? palette.coral : palette.inkMuted} />
        <Text style={[styles.label, selected && styles.labelSelected]}>{tab.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 8, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: palette.line },
  tab: { flex: 1, minHeight: 43, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { color: palette.inkMuted, fontSize: 8.5, fontWeight: '700' },
  labelSelected: { color: palette.coral, fontWeight: '900' },
});
