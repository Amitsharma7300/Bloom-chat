import React from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

interface Props {
  value?: string;
  onChangeText?: (text: string) => void;
  onFilterPress?: () => void;
  placeholder?: string;
  style?: ViewStyle;
}

export const GlassSearchBar: React.FC<Props> = ({
  value,
  onChangeText,
  onFilterPress,
  placeholder = 'Search people, messages...',
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      {/* Pill input */}
      <View style={styles.searchBar}>
        <Ionicons
          name="search"
          size={18}
          color={theme.colors.searchIcon}
          style={styles.icon}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
      </View>

      {/* Filter / Settings Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onFilterPress}
        style={styles.filterButton}
      >
        <Ionicons name="options-outline" size={20} color="#D8B4FE" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.searchBarBg,
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
    height: '100%',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.filterButtonBg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.glassBorderHighlight,
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default GlassSearchBar;

