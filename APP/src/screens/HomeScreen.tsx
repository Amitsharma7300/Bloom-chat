import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';
import GlassBackground from '../components/GlassBackground';
import GlassSearchBar from '../components/GlassSearchBar';
import AvatarWithGlow from '../components/AvatarWithGlow';
import BottomNavBar, { TabName } from '../components/BottomNavBar';

interface ChatItem {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar: string;
  unreadCount?: number;
  hasUnreadDot?: boolean;
  isActive?: boolean;
}

const ACTIVE_USERS = [
  { id: '1', name: 'Priya', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
  { id: '2', name: 'Rohan', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150' },
  { id: '3', name: 'Sneha', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  { id: '4', name: 'Arjun', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
];

const CHATS: ChatItem[] = [
  {
    id: '1',
    name: 'Priya',
    message: "Amazing. I'll be there shortly.",
    time: '12:08 PM',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    unreadCount: 2,
    isActive: true,
  },
  {
    id: '2',
    name: 'Rohan',
    message: "Let's catch up tomorrow!",
    time: '11:24 AM',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    hasUnreadDot: true,
  },
  {
    id: '3',
    name: 'Sneha',
    message: 'Sent a photo',
    time: '10:41 AM',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  },
  {
    id: '4',
    name: 'Arjun',
    message: "Haha that's awesome!",
    time: 'Yesterday',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  },
  {
    id: '5',
    name: 'Meera',
    message: 'Are you free this weekend?',
    time: 'Yesterday',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  },
];

interface Props {
  onOpenChat: (chat: ChatItem) => void;
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export const HomeScreen: React.FC<Props> = ({
  onOpenChat,
  activeTab,
  onTabChange,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <GlassBackground>
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingText}>Good Evening,</Text>
              <Text style={styles.headerTitle}>Amit 👋</Text>
            </View>
            <AvatarWithGlow
              uri="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
              size={48}
              isOnline={true}
              hasGlowRing={true}
            />
          </View>

          {/* Search Bar */}
          <View style={styles.searchWrapper}>
            <GlassSearchBar />
          </View>

          {/* Active Now Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Now</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAllText}>See all</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeUsersScroll}
          >
            {/* Add Story Button */}
            <TouchableOpacity style={styles.storyItem} activeOpacity={0.7}>
              <View style={styles.addStoryCircle}>
                <Ionicons name="add" size={26} color="#C084FC" />
              </View>
              <Text style={styles.storyName}>Add Story</Text>
            </TouchableOpacity>

            {/* Active Users */}
            {ACTIVE_USERS.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.storyItem}
                activeOpacity={0.7}
                onPress={() =>
                  onOpenChat({
                    id: user.id,
                    name: user.name,
                    message: '',
                    time: '',
                    avatar: user.avatar,
                  })
                }
              >
                <AvatarWithGlow
                  uri={user.avatar}
                  size={58}
                  isOnline={true}
                  hasGlowRing={true}
                />
                <Text style={styles.storyName}>{user.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Chats Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chats</Text>
            <TouchableOpacity style={styles.sortButton} activeOpacity={0.7}>
              <Text style={styles.sortText}>Sort ⇅</Text>
            </TouchableOpacity>
          </View>

          {/* Chat List */}
          <View style={styles.chatList}>
            {CHATS.map((item) => {
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => onOpenChat(item)}
                  style={[
                    styles.chatCard,
                    item.isActive && styles.chatCardActive,
                  ]}
                >
                  <AvatarWithGlow
                    uri={item.avatar}
                    size={48}
                    isOnline={true}
                  />

                  <View style={styles.chatDetails}>
                    <View style={styles.chatTopRow}>
                      <Text style={styles.chatName}>{item.name}</Text>
                      <Text style={styles.chatTime}>{item.time}</Text>
                    </View>

                    <View style={styles.chatBottomRow}>
                      <Text
                        style={[
                          styles.chatMessage,
                          item.isActive && styles.chatMessageActive,
                        ]}
                        numberOfLines={1}
                      >
                        {item.message}
                      </Text>

                      {item.unreadCount ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {item.unreadCount}
                          </Text>
                        </View>
                      ) : item.hasUnreadDot ? (
                        <View style={styles.unreadDot} />
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Nav Bar */}
        <BottomNavBar activeTab={activeTab} onTabPress={onTabChange} />
      </View>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  greetingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textPrimary,
  },
  searchWrapper: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  sortButton: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  sortText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  activeUsersScroll: {
    gap: 16,
    paddingBottom: 8,
    marginBottom: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  addStoryCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#7E22CE',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(34, 21, 53, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  chatList: {
    gap: 8,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  chatCardActive: {
    backgroundColor: 'rgba(38, 25, 59, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  chatDetails: {
    flex: 1,
    marginLeft: 14,
  },
  chatTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  chatTime: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  chatBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatMessage: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginRight: 10,
  },
  chatMessageActive: {
    color: '#D8B4FE',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: theme.colors.accentMagenta,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: theme.colors.accentViolet,
    shadowColor: theme.colors.accentViolet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});

export default HomeScreen;
