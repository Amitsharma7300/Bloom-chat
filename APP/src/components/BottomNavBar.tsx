import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

export type TabName = 'home' | 'match' | 'explore' | 'profile';

interface Props {
  activeTab?: TabName;
  onTabPress?: (tab: TabName) => void;
}

export const BottomNavBar: React.FC<Props> = ({
  activeTab = 'home',
  onTabPress,
}) => {
  const tabs: { key: TabName; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'home', label: 'Home', icon: 'chatbubbles' },
    { key: 'match', label: 'Random', icon: 'shuffle' },
    { key: 'explore', label: 'Explore', icon: 'compass-outline' },
    { key: 'profile', label: 'Profile', icon: 'person-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.bar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => onTabPress?.(tab.key)}
              style={styles.tabItem}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? theme.colors.activeTab : theme.colors.inactiveTab}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.colors.activeTab : theme.colors.inactiveTab,
                    fontWeight: isActive ? '600' : '400',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: theme.colors.bottomBarBg,
    borderRadius: 30,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.bottomBarBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 4,
  },
});

export default BottomNavBar;

