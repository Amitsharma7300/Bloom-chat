import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomNavBar, { TabName } from './src/components/BottomNavBar';
import { SplashScreen, OnboardingScreen, AnonymousJoinScreen } from './src/screens/EntryScreens';
import HomeScreen from './src/screens/HomeScreen';
import RandomMatchScreen from './src/screens/RandomMatchScreen';
import ChatScreen from './src/screens/ChatScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import PeopleScreen from './src/screens/PeopleScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { EndChatScreen, NotificationsScreen } from './src/screens/UtilityScreens';
import { ChatMode, Partner } from './src/types/chat';
import { getRandomPartner } from './src/constants/partners';

type Screen = 'splash' | 'onboarding' | 'join' | 'main' | 'matching' | 'chat' | 'end' | 'settings' | 'notifications';

function previewParam(name: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function initialScreen(): Screen {
  const preview = previewParam('preview');
  const allowed: Screen[] = ['onboarding', 'join', 'main', 'matching', 'chat', 'end', 'settings', 'notifications'];
  return allowed.includes(preview as Screen) ? preview as Screen : 'splash';
}

function initialTab(): TabName {
  const tab = previewParam('tab');
  return ['home', 'people', 'friends', 'profile'].includes(tab ?? '') ? tab as TabName : 'home';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [activeTab, setActiveTab] = useState<TabName>(initialTab);
  const [mode, setMode] = useState<ChatMode>('Video');
  const [mood, setMood] = useState('Just chatting');
  const [partner, setPartner] = useState<Partner>(getRandomPartner());
  const [userId] = useState(() => `BLOOM-${Math.floor(100000 + Math.random() * 900000)}`);
  const [gender, setGender] = useState<'Man' | 'Woman'>('Man');
  const restartWhenActive = useRef(false);

  useEffect(() => { if (screen === 'splash') { const timer = setTimeout(() => setScreen('onboarding'), 1450); return () => clearTimeout(timer); } }, [screen]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') restartWhenActive.current = true;
      if (nextState === 'active' && restartWhenActive.current) {
        restartWhenActive.current = false;
        setActiveTab('home');
        setMode('Video');
        setMood('Just chatting');
        setPartner(getRandomPartner());
        setScreen('splash');
      }
    });
    const blurSubscription = AppState.addEventListener('blur', () => { restartWhenActive.current = true; });
    return () => { subscription.remove(); blurSubscription.remove(); };
  }, []);

  const startMatch = (selectedMode: ChatMode, selectedMood: string) => { setMode(selectedMode); setMood(selectedMood); setScreen('matching'); };
  const matchFound = (person: Partner) => { setPartner(person); setScreen('chat'); };
  const nextMatch = () => { setPartner(getRandomPartner(partner.id)); setScreen('matching'); };
  const openFriendChat = (person: Partner) => { setPartner(person); setMode('Text'); setMood('Friends'); setScreen('chat'); };
  const goHome = () => { setActiveTab('home'); setScreen('main'); };

  const renderMain = () => {
    let content: React.ReactNode;
    if (activeTab === 'people') content = <PeopleScreen onOpenChat={openFriendChat} />;
    else if (activeTab === 'friends') content = <FriendsScreen onOpenChat={openFriendChat} />;
    else if (activeTab === 'profile') content = <ProfileScreen userId={userId} gender={gender} onSettings={() => setScreen('settings')} />;
    else content = <HomeScreen onStartMatch={startMatch} onOpenNotifications={() => setScreen('notifications')} />;
    return <View style={styles.main}><View style={styles.tabContent}>{content}</View><BottomNavBar activeTab={activeTab} onTabPress={setActiveTab} /></View>;
  };

  let content: React.ReactNode;
  if (screen === 'splash') content = <SplashScreen />;
  else if (screen === 'onboarding') content = <OnboardingScreen onFinish={() => setScreen('join')} />;
  else if (screen === 'join') content = <AnonymousJoinScreen userId={userId} onComplete={(selectedGender) => { setGender(selectedGender); setScreen('main'); }} />;
  else if (screen === 'matching') content = <RandomMatchScreen mode={mode} mood={mood} onCancel={goHome} onMatch={matchFound} />;
  else if (screen === 'chat') content = <ChatScreen partner={partner} mode={mode} topic={mood} onEnd={() => setScreen('end')} onNext={nextMatch} />;
  else if (screen === 'end') content = <EndChatScreen partner={partner} onNext={nextMatch} onHome={goHome} />;
  else if (screen === 'settings') content = <SettingsScreen onBack={() => setScreen('main')} onRestart={() => setScreen('onboarding')} />;
  else if (screen === 'notifications') content = <NotificationsScreen onBack={() => setScreen('main')} />;
  else content = renderMain();

  const dark = screen === 'splash' || screen === 'matching' || (screen === 'chat' && mode !== 'Text');
  return <SafeAreaProvider><View style={styles.desktop}><View style={styles.app}><StatusBar style={dark ? 'light' : 'dark'} />{content}</View></View></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  desktop: { flex: 1, alignItems: 'center', backgroundColor: Platform.OS === 'web' ? '#E9DDE2' : '#FFF8F8' },
  app: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: '#FFF8F8', overflow: 'hidden' },
  main: { flex: 1 }, tabContent: { flex: 1 },
});
