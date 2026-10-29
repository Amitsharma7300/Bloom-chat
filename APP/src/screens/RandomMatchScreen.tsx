import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../constants/theme';
import GlassBackground from '../components/GlassBackground';
import BottomNavBar, { TabName } from '../components/BottomNavBar';

const { width } = Dimensions.get('window');

const INTEREST_TOPICS = [
  '💬 Just Chatting',
  '☕ Late Night Talks',
  '🎮 Gaming',
  '🎵 Music Vibes',
  '🎬 Movies & Anime',
  '🌍 Worldwide',
];

interface Props {
  onStartChat: (stranger: { name: string; avatar: string }) => void;
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

export const RandomMatchScreen: React.FC<Props> = ({
  onStartChat,
  activeTab,
  onTabChange,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedTopic, setSelectedTopic] = useState('💬 Just Chatting');
  const [isSearching, setIsSearching] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    if (isSearching) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const timer = setTimeout(() => {
        setIsSearching(false);
        onStartChat({
          name: 'Stranger #' + Math.floor(1000 + Math.random() * 9000),
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        });
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSearching]);

  return (
    <GlassBackground>
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        {/* Top Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Random Chat</Text>
          <View style={styles.onlineBadge}>
            <View style={styles.greenDot} />
            <Text style={styles.onlineText}>2,480 online</Text>
          </View>
        </View>

        {/* Center Radar / Orb */}
        <View style={styles.radarContainer}>
          <Animated.View
            style={[
              styles.radarOuterRing,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <View style={styles.radarMidRing} />

          <LinearGradient
            colors={['#C026D3', '#9333EA']}
            style={styles.radarCenter}
          >
            <Ionicons
              name={isSearching ? 'planet' : 'shuffle'}
              size={48}
              color="#FFFFFF"
            />
          </LinearGradient>

          <Text style={styles.statusText}>
            {isSearching ? 'Finding someone cool...' : 'Ready to connect'}
          </Text>
          <Text style={styles.subStatusText}>
            {isSearching
              ? 'Matching you with a random stranger worldwide'
              : '100% anonymous & instant'}
          </Text>
        </View>

        {/* Topic Filters */}
        <View style={styles.topicsSection}>
          <Text style={styles.topicsHeader}>Select Topic</Text>
          <View style={styles.topicsRow}>
            {INTEREST_TOPICS.map((topic) => {
              const isSelected = selectedTopic === topic;
              return (
                <TouchableOpacity
                  key={topic}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTopic(topic)}
                  style={[
                    styles.topicChip,
                    isSelected && styles.topicChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.topicText,
                      isSelected && styles.topicTextActive,
                    ]}
                  >
                    {topic}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Match Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSearching}
            onPress={() => setIsSearching(true)}
            style={styles.matchButtonWrapper}
          >
            <LinearGradient
              colors={['#C026D3', '#9333EA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.matchButton}
            >
              <Ionicons name="flash" size={20} color="#FFFFFF" />
              <Text style={styles.matchButtonText}>
                {isSearching ? 'SEARCHING...' : 'START RANDOM CHAT'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 21, 52, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.onlineGreen,
  },
  onlineText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '600',
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  radarOuterRing: {
    position: 'absolute',
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: (width * 0.65) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(192, 38, 211, 0.25)',
  },
  radarMidRing: {
    position: 'absolute',
    width: width * 0.48,
    height: width * 0.48,
    borderRadius: (width * 0.48) / 2,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  radarCenter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 22,
  },
  subStatusText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  topicsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  topicsHeader: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  topicsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(32, 21, 50, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  topicChipActive: {
    backgroundColor: 'rgba(192, 38, 211, 0.2)',
    borderColor: theme.colors.accentMagenta,
  },
  topicText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  topicTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  matchButtonWrapper: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  matchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  matchButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
});

export default RandomMatchScreen;
