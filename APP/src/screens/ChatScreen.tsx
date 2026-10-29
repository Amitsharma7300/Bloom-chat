import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../constants/theme';
import GlassBackground from '../components/GlassBackground';
import AvatarWithGlow from '../components/AvatarWithGlow';

interface MessageItem {
  id: string;
  sender: 'priya' | 'me';
  text: string;
  time: string;
}

const INITIAL_MESSAGES: MessageItem[] = [
  {
    id: '1',
    sender: 'priya',
    text: 'Hey Amit!',
    time: '11:56 AM',
  },
  {
    id: '2',
    sender: 'priya',
    text: "I was thinking about the new cafe downtown I wanted to try. Heard it's really nice. ❤️",
    time: '11:58 AM',
  },
  {
    id: '3',
    sender: 'me',
    text: "Amazing. I'll be there shortly.",
    time: '12:08 PM',
  },
  {
    id: '4',
    sender: 'priya',
    text: 'Great! Let me know when you reach there. 😊',
    time: '12:10 PM',
  },
  {
    id: '5',
    sender: 'me',
    text: "Sure! I'm on my way now. See you in 10 minutes! 🚗",
    time: '12:12 PM',
  },
  {
    id: '6',
    sender: 'priya',
    text: 'Perfect! ✨',
    time: '12:13 PM',
  },
];

interface Props {
  onBack: () => void;
  strangerName?: string;
  strangerAvatar?: string;
  isRandomMode?: boolean;
  onNextRandom?: () => void;
}

export const ChatScreen: React.FC<Props> = ({
  onBack,
  strangerName = 'Priya',
  strangerAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  isRandomMode = false,
  onNextRandom,
}) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<MessageItem[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    if (!inputText.trim()) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'me',
        text: inputText.trim(),
        time: timeStr,
      },
    ]);
    setInputText('');
  };

  return (
    <GlassBackground>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onBack}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
            </TouchableOpacity>

            <AvatarWithGlow
              uri={strangerAvatar}
              size={42}
              isOnline={true}
              hasGlowRing={true}
            />

            <View style={styles.userInfo}>
              <Text style={styles.userName}>{strangerName}</Text>
              <View style={styles.onlineBadge}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>

          {/* Action icons */}
          <View style={styles.headerRight}>
            {isRandomMode ? (
              <TouchableOpacity
                onPress={onNextRandom}
                style={styles.nextStrangerButton}
                activeOpacity={0.7}
              >
                <Ionicons name="shuffle" size={16} color="#FFFFFF" />
                <Text style={styles.nextStrangerText}>Next</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                  <Ionicons name="call" size={18} color="#E9D5FF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                  <Ionicons name="videocam" size={19} color="#E9D5FF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                  <Ionicons name="ellipsis-vertical" size={18} color="#E9D5FF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Message Feed */}
        <ScrollView
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Date separator pill */}
          <View style={styles.dateSeparatorWrapper}>
            <View style={styles.datePill}>
              <Text style={styles.datePillText}>Today</Text>
            </View>
          </View>

          {messages.map((item) => {
            const isMe = item.sender === 'me';
            return (
              <View
                key={item.id}
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowRight : styles.messageRowLeft,
                ]}
              >
                {isMe ? (
                  /* Sent bubble: Vibrant Magenta/Purple Gradient */
                  <LinearGradient
                    colors={['#C026D3', '#9333EA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bubble, styles.bubbleRight]}
                  >
                    <Text style={styles.messageTextSent}>{item.text}</Text>
                    <View style={styles.metaRight}>
                      <Text style={styles.timeTextSent}>{item.time}</Text>
                      <Ionicons
                        name="checkmark-done"
                        size={15}
                        color="rgba(255, 255, 255, 0.85)"
                      />
                    </View>
                  </LinearGradient>
                ) : (
                  /* Received bubble: Deep Frosted Glass */
                  <View style={[styles.bubble, styles.bubbleLeft]}>
                    <Text style={styles.messageTextReceived}>{item.text}</Text>
                    <Text style={styles.timeTextReceived}>{item.time}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity style={styles.plusButton} activeOpacity={0.7}>
            <Ionicons name="add" size={22} color="#D8B4FE" />
          </TouchableOpacity>

          <View style={styles.inputBar}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textMuted}
              style={styles.textInput}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            {inputText.trim().length > 0 ? (
              <TouchableOpacity
                onPress={handleSend}
                activeOpacity={0.7}
                style={styles.sendButton}
              >
                <Ionicons name="send" size={17} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.7} style={styles.micButton}>
                <Ionicons name="mic" size={19} color="#A855F7" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 6,
  },
  userInfo: {
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.onlineGreen,
  },
  onlineText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextStrangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.accentMagenta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  nextStrangerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(38, 25, 59, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  dateSeparatorWrapper: {
    alignItems: 'center',
    marginBottom: 20,
  },
  datePill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.datePillBg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  datePillText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  messageRow: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
  },
  bubbleLeft: {
    backgroundColor: theme.colors.receivedBubbleBg,
    borderWidth: 1,
    borderColor: theme.colors.receivedBubbleBorder,
    borderBottomLeftRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  bubbleRight: {
    borderBottomRightRadius: 6,
    shadowColor: theme.colors.accentMagenta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  messageTextReceived: {
    color: '#EDE8F5',
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextSent: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
  },
  timeTextReceived: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 6,
  },
  timeTextSent: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  plusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(38, 25, 59, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBarBg,
    borderRadius: 25,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  textInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    height: '100%',
  },
  micButton: {
    padding: 6,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.accentMagenta,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ChatScreen;

