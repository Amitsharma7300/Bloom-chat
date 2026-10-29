import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import RandomMatchScreen from './src/screens/RandomMatchScreen';
import { TabName } from './src/components/BottomNavBar';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'chat'>('home');
  const [activeTab, setActiveTab] = useState<TabName>('home');
  const [selectedChat, setSelectedChat] = useState<{
    name: string;
    avatar: string;
    isRandom?: boolean;
  }>({
    name: 'Priya',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  });

  const handleOpenChat = (chat: { name: string; avatar: string }) => {
    setSelectedChat({ name: chat.name, avatar: chat.avatar, isRandom: false });
    setCurrentScreen('chat');
  };

  const handleStartRandomChat = (stranger: { name: string; avatar: string }) => {
    setSelectedChat({ name: stranger.name, avatar: stranger.avatar, isRandom: true });
    setCurrentScreen('chat');
  };

  const handleNextRandom = () => {
    setSelectedChat({
      name: 'Stranger #' + Math.floor(1000 + Math.random() * 9000),
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      isRandom: true,
    });
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {currentScreen === 'chat' ? (
        <ChatScreen
          onBack={() => setCurrentScreen('home')}
          strangerName={selectedChat.name}
          strangerAvatar={selectedChat.avatar}
          isRandomMode={selectedChat.isRandom}
          onNextRandom={handleNextRandom}
        />
      ) : activeTab === 'match' ? (
        <RandomMatchScreen
          onStartChat={handleStartRandomChat}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <HomeScreen
          onOpenChat={handleOpenChat}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </SafeAreaProvider>
  );
}
