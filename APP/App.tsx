import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashScreen } from './src/screens/EntryScreens';
import HomeScreen from './src/screens/HomeScreen';
import RandomMatchScreen from './src/screens/RandomMatchScreen';
import ChatScreen from './src/screens/ChatScreen';
import FriendsScreen from './src/screens/FriendsScreen';
import PeopleScreen from './src/screens/PeopleScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import CreatorScreen from './src/screens/CreatorScreen';
import { EndChatScreen, NotificationsScreen } from './src/screens/UtilityScreens';
import LaunchFlow, { LaunchStep } from './src/components/LaunchFlow';
import MatchPreferenceModal, { MatchPreference } from './src/components/MatchPreferenceModal';
import MenuDrawer, { MenuDestination } from './src/components/MenuDrawer';
import BottomNavigation, { BottomTab } from './src/components/BottomNavigation';
import { ConversationSummary, Partner, SessionUser } from './src/types/chat';
import type { ChatMode } from './src/types/chat';
import type { IncomingCall } from './src/components/CallOverlay.types';
import { clearRegistration, loadRegisteredGender, RegisteredGender, saveRegisteredGender } from './src/lib/registration';
import * as api from './src/lib/api';
import { AppearanceProvider } from './src/components/ThemedPrimitives';
import AdBlockWarning from './src/components/AdBlockWarning';
import { showDueAd } from './src/lib/ads';

type Screen = 'splash' | 'home' | 'matching' | 'chat' | 'end' | 'friends' | 'chats' | 'search' | 'suggestions' | 'settings' | 'profile' | 'creator' | 'notifications';

function previewParam(name: string) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(name);
}

function initialScreen(): Screen {
  const preview = previewParam('preview');
  const allowed: Screen[] = ['home', 'matching', 'chat', 'end', 'friends', 'chats', 'search', 'suggestions', 'settings', 'notifications'];
  return allowed.includes(preview as Screen) ? preview as Screen : 'splash';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [launchStep, setLaunchStep] = useState<LaunchStep>(null);
  const [planOrigin, setPlanOrigin] = useState<'launch' | 'upgrade'>('launch');
  const [gender, setGender] = useState<RegisteredGender | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [people, setPeople] = useState<Partner[]>([]);
  const [friends, setFriends] = useState<Partner[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<Partner[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<string[]>([]);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [preference, setPreference] = useState<MatchPreference>('Random');
  const [requestedMode, setRequestedMode] = useState<ChatMode>('Text');
  const [autoCallMode, setAutoCallMode] = useState<'Voice' | 'Video' | null>(null);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adWarning, setAdWarning] = useState(false);
  const [adChecking, setAdChecking] = useState(false);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [randomChat, setRandomChat] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [incomingConversationId, setIncomingConversationId] = useState<string | null>(null);
  const screenRef = useRef(screen);
  const friendsRef = useRef(friends);
  const conversationIdRef = useRef(conversationId);
  const incomingCallHandling = useRef<string | null>(null);
  const adAttempting = useRef(false);
  screenRef.current = screen;
  friendsRef.current = friends;
  conversationIdRef.current = conversationId;

  const showError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Please try again.';
    Alert.alert('Bloom could not complete that action', message);
  }, []);

  const verifyAds = useCallback(async (checkpoint: api.AdCheckpoint) => {
    const result = await api.checkAdDelivery(checkpoint);
    setAdWarning(!result.allowed);
    return result.allowed;
  }, []);

  const presentDueAd = useCallback(async () => {
    if (adAttempting.current) return;
    adAttempting.current = true;
    try {
      const status = await api.getAdStatus();
      if (!status.due || !status.ticketId) return;
      const { attemptId } = await api.startAdAttempt(status.ticketId);
      const result = await showDueAd(status);
      await api.finishAdAttempt(attemptId, result === 'impression' ? 'impression' : 'failed', result === 'impression' ? undefined : result);
    } catch (error) { showError(error); }
    finally { adAttempting.current = false; }
  }, [showError]);

  const refreshData = useCallback(async () => {
    const [nextPeople, nextFriends, nextConversations, requests] = await Promise.all([api.getPeople(), api.getFriends(), api.getConversations(), api.getFriendRequests()]);
    setPeople(nextPeople); setFriends(nextFriends); setConversations(nextConversations); setIncomingRequests(requests.incoming); setOutgoingRequests(requests.outgoing);
  }, []);

  useEffect(() => {
    if (screen !== 'splash') return;
    let active = true;
    const timer = setTimeout(() => {
      void Promise.all([loadRegisteredGender(), api.getCurrentUser()]).then(async ([savedGender, savedUser]) => {
        if (!active) return;
        const registeredGender = savedGender ?? (savedUser?.gender === 'Man' || savedUser?.gender === 'Woman' ? savedUser.gender : null);
        setGender(registeredGender);
        if (registeredGender && !savedGender) void saveRegisteredGender(registeredGender);
        setUser(savedUser);
        setScreen('home');
        if (savedUser) {
          try { await refreshData(); } catch (error) { showError(error); }
          void verifyAds('launch').catch(showError);
        } else setLaunchStep('terms');
      }).catch((error) => { if (active) { setScreen('home'); setLaunchStep('terms'); showError(error); } });
    }, 900);
    return () => { active = false; clearTimeout(timer); };
  }, [refreshData, screen, showError, verifyAds]);

  useEffect(() => {
    if (!user) return;
    return api.connectRealtime((event) => {
      if (event.type === 'friend.added' || event.type === 'friend.requested') void refreshData().catch(showError);
      if (event.type === 'ad.due') setTimeout(() => { void presentDueAd(); }, 400);
      if (event.type === 'conversation.expired' && event.conversationId) {
        setConversations((current) => current.filter((item) => item.id !== event.conversationId));
        if (event.conversationId === conversationIdRef.current && screenRef.current === 'chat') {
          setAutoCallMode(null); setRandomChat(false); setPartner(null); setConversationId(null); setScreen('home');
        }
      }
      if (event.type === 'match.ended' && event.conversationId === conversationIdRef.current && screenRef.current === 'chat') {
        setAutoCallMode(null);
        setRandomChat(false);
        setPartner(null);
        setConversationId(null);
        setScreen('matching');
      }
      if (event.type === 'match.invite' && event.conversationId && !(screenRef.current === 'chat' && conversationIdRef.current === event.conversationId)) {
        const matchedConversationId = String(event.conversationId);
        if (screenRef.current !== 'matching') { void api.endMatch(matchedConversationId).catch(showError); return; }
        void api.getConversations().then((items) => {
          const conversation = items.find((item) => item.id === matchedConversationId);
          if (!conversation || (screenRef.current === 'chat' && conversationIdRef.current === matchedConversationId)) return;
          setConversations(items);
          setPeople((current) => current.filter((person) => person.id !== conversation.partner.id));
          setPartner(conversation.partner);
          setRandomChat(true);
          conversationIdRef.current = conversation.id;
          setConversationId(conversation.id);
          setAutoCallMode(null);
          setIncomingCall(null);
          setIncomingConversationId(null);
          setScreen('chat');
        }).catch(showError);
      }
      if (event.type === 'call.invite' && event.conversationId && event.fromUserId && !(screenRef.current === 'chat' && conversationIdRef.current === event.conversationId)) {
        const callId = String(event.payload?.callId ?? '');
        if (!callId || incomingCallHandling.current === callId) return;
        incomingCallHandling.current = callId;
        void api.getConversations().then((items) => {
          const conversation = items.find((item) => item.id === event.conversationId);
          if (!conversation) return;
          setConversations(items);
          setPartner(conversation.partner);
          setRandomChat(!friendsRef.current.some((friend) => friend.id === conversation.partner.id));
          setConversationId(conversation.id);
          setIncomingConversationId(conversation.id);
          setIncomingCall({ callId, mode: event.payload?.mode === 'Video' ? 'Video' : 'Voice' });
          setAutoCallMode(null);
          setScreen('chat');
        }).catch(showError).finally(() => { incomingCallHandling.current = null; });
      }
    });
  }, [user?.id, refreshData, showError, presentDueAd]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    let latestRequest = 0;
    const reconcileConversations = async () => {
      const requestId = ++latestRequest;
      const openIdAtStart = conversationIdRef.current;
      try {
        const current = await api.getConversations();
        if (!active || requestId !== latestRequest) return;
        setConversations(current);
        if (screenRef.current === 'chat' && openIdAtStart && conversationIdRef.current === openIdAtStart && !current.some((item) => item.id === openIdAtStart)) {
          setAutoCallMode(null);
          setRandomChat(false);
          setPartner(null);
          setConversationId(null);
          setScreen('home');
        }
      } catch {
        // A temporary connection loss should not interrupt an open chat.
      }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void reconcileConversations();
        void verifyAds('resume').catch(() => {});
        if (screenRef.current === 'home' || screenRef.current === 'end') void presentDueAd();
      }
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void reconcileConversations();
    }, 60_000);
    return () => { active = false; subscription.remove(); clearInterval(timer); };
  }, [user?.id, presentDueAd, verifyAds]);

  const register = useCallback(async (selectedGender: RegisteredGender) => {
    const nextUser = await api.createSession(selectedGender);
    setUser(nextUser); setGender(selectedGender);
    await saveRegisteredGender(selectedGender);
    void refreshData().catch(showError);
    return nextUser;
  }, [refreshData, showError]);

  const goHome = useCallback(() => { setAutoCallMode(null); setScreen('home'); }, []);
  const clearIncomingCall = useCallback(() => { setIncomingCall(null); setIncomingConversationId(null); }, []);
  const matchFound = useCallback((person: Partner) => { setPeople((current) => current.filter((item) => item.id !== person.id)); setPartner(person); setRandomChat(true); setAutoCallMode(requestedMode === 'Text' ? null : requestedMode); setScreen('chat'); }, [requestedMode]);
  const findMatch = useCallback(async (): Promise<Partner | null> => {
    const result = await api.createMatch(preference);
    if ('waiting' in result) {
      if (screenRef.current !== 'matching') void api.leaveMatchQueue().catch(showError);
      return null;
    }
    if (screenRef.current !== 'matching') {
      if (screenRef.current !== 'chat' || conversationIdRef.current !== result.conversationId) void api.endMatch(result.conversationId).catch(showError);
      return null;
    }
    setUser(result.user); conversationIdRef.current = result.conversationId; setConversationId(result.conversationId);
    return result.partner;
  }, [preference, showError]);
  const cancelMatching = useCallback(() => { screenRef.current = 'home'; void api.leaveMatchQueue().catch(showError); setScreen('home'); }, [showError]);
  const startMatching = useCallback((selected: MatchPreference) => { void (async () => {
    try {
      await presentDueAd();
      if (!(await verifyAds('start_chat'))) return;
      setPreference(selected); setPreferenceOpen(false); setScreen('matching');
    } catch (error) { showError(error); }
  })(); }, [presentDueAd, showError, verifyAds]);
  const endCurrentMatch = useCallback(async () => {
    if (conversationId && randomChat) {
      setRandomChat(false);
      try { await api.endMatch(conversationId); await presentDueAd(); } catch (error) { showError(error); }
    }
  }, [conversationId, randomChat, presentDueAd, showError]);
  const nextMatch = useCallback(() => { void (async () => {
    await endCurrentMatch();
    setPartner(null); setConversationId(null);
    try { if (await verifyAds('start_chat')) setScreen('matching'); else setScreen('home'); }
    catch (error) { showError(error); setScreen('home'); }
  })(); }, [endCurrentMatch, showError, verifyAds]);
  const openFriendChat = useCallback(async (person: Partner) => {
    try { const result = await api.openConversation(person.id); setPartner(result.partner); setRandomChat(false); setConversationId(result.conversationId); setAutoCallMode(null); setScreen('chat'); }
    catch (error) { showError(error); }
  }, [showError]);
  const addFriend = useCallback(async (person: Partner) => {
    try { const result = await api.addFriend(person.id); if (result.status === 'pending') setOutgoingRequests((current) => current.includes(person.id) ? current : [...current, person.id]); else void refreshData(); }
    catch (error) { showError(error); }
  }, [refreshData, showError]);
  const acceptFriend = useCallback(async (person: Partner) => { try { await api.acceptFriendRequest(person.id); await refreshData(); } catch (error) { showError(error); } }, [refreshData, showError]);
  const declineFriend = useCallback(async (person: Partner) => { try { await api.declineFriendRequest(person.id); setIncomingRequests((current) => current.filter((item) => item.id !== person.id)); } catch (error) { showError(error); } }, [showError]);
  const blockPartner = useCallback(async (person: Partner) => {
    try { await api.blockUser(person.id); setFriends((current) => current.filter((item) => item.id !== person.id)); setPeople((current) => current.filter((item) => item.id !== person.id)); setScreen('home'); }
    catch (error) { showError(error); }
  }, [showError]);
  const sharePoints = useCallback(async (person: Partner, amount: number) => {
    try { const nextUser = await api.transferPoints(person.id, amount); setUser(nextUser); }
    catch (error) { showError(error); throw error; }
  }, [showError]);

  const openPlans = (origin: 'launch' | 'upgrade') => { setPlanOrigin(origin); setPreferenceOpen(false); setLaunchStep('plans'); };
  const finishPlans = async (subscribed: boolean, plan = 'monthly') => {
    if (subscribed) {
      Alert.alert('Premium billing is coming soon', 'Bloom will not activate a test subscription. Play Store and App Store billing must be connected before real purchases are enabled.');
      return;
    }
    setLaunchStep(planOrigin === 'launch' ? 'start' : null);
  };
  const navigateMenu = async (destination: MenuDestination) => {
    setScreen(destination);
    try {
      if (destination === 'friends' || destination === 'chats') await refreshData();
      if (destination === 'search' || destination === 'suggestions') setPeople(await api.getPeople());
    } catch (error) { showError(error); }
  };

  const premium = user?.premium ?? false;
  const points = user?.points ?? 0;
  const friendConversations = conversations.filter((item, index, all) => friends.some((friend) => friend.id === item.partner.id) && all.findIndex((other) => other.partner.id === item.partner.id) === index);
  let content: React.ReactNode;
  if (screen === 'splash') content = <SplashScreen />;
  else if (screen === 'matching') content = <RandomMatchScreen mode={requestedMode} mood={`${requestedMode} ${preference} match`} preference={preference} onFindMatch={findMatch} onCancel={cancelMatching} onMatch={matchFound} />;
  else if (screen === 'chat' && partner && conversationId && user) content = <ChatScreen partner={partner} conversationId={conversationId} currentUserId={user.id} currentUserAvatar={user.avatar} currentUserGender={user.gender} mode="Text" initialCallMode={autoCallMode ?? undefined} incomingCall={incomingConversationId === conversationId ? incomingCall : null} onIncomingCallHandled={clearIncomingCall} topic={`${preference} match`} premium={premium} points={points} isFriend={friends.some((item) => item.id === partner.id)} friendPending={outgoingRequests.includes(partner.id)} onAddFriend={() => addFriend(partner)} onSharePoints={(amount) => sharePoints(partner, amount)} onPremium={() => openPlans('upgrade')} onBlock={() => blockPartner(partner)} onUserUpdate={setUser} onEnd={() => { setScreen('end'); void endCurrentMatch(); }} onNext={nextMatch} />;
  else if (screen === 'end' && partner) content = <EndChatScreen partner={partner} onNext={nextMatch} onHome={goHome} />;
  else if (screen === 'friends') content = <FriendsScreen key="friends" initialView="Friends" people={friends} requests={incomingRequests} conversations={friendConversations} onAcceptRequest={acceptFriend} onDeclineRequest={declineFriend} onBack={goHome} onOpenChat={openFriendChat} />;
  else if (screen === 'chats') content = <FriendsScreen key="chats" initialView="Chats" people={friends} requests={incomingRequests} conversations={friendConversations} onAcceptRequest={acceptFriend} onDeclineRequest={declineFriend} onBack={goHome} onOpenChat={openFriendChat} />;
  else if (screen === 'search') content = <PeopleScreen key="search" title="Explore" people={people} outgoingRequests={outgoingRequests} approvedFriendIds={friends.map((item) => item.id)} onBack={goHome} onOpenChat={openFriendChat} onAddFriend={addFriend} />;
  else if (screen === 'suggestions') content = <PeopleScreen key="suggestions" title="Daily suggestions" people={people} outgoingRequests={outgoingRequests} approvedFriendIds={friends.map((item) => item.id)} onBack={goHome} onOpenChat={openFriendChat} onAddFriend={addFriend} />;
  else if (screen === 'settings') content = <SettingsScreen theme={user?.theme ?? 'light'} fontScale={user?.fontScale ?? 1} onPreferences={async (preferences) => { const updated = await api.updatePreferences(preferences); setUser(updated); }} onBack={goHome} onRestart={async () => { await Promise.all([clearRegistration(), api.clearApiSession()]); setGender(null); setUser(null); setFriends([]); setConversations([]); setPartner(null); setConversationId(null); setIncomingCall(null); setIncomingConversationId(null); setAutoCallMode(null); setPreferenceOpen(false); setMenuOpen(false); setScreen('home'); setLaunchStep('terms'); }} />;
  else if (screen === 'profile' && user) content = <ProfileScreen user={user} onBack={goHome} onSettings={() => setScreen('settings')} onFindMatch={() => { setRequestedMode('Text'); setPreferenceOpen(true); }} />;
  else if (screen === 'creator' && user) content = <CreatorScreen onBack={goHome} />;
  else if (screen === 'notifications') content = <NotificationsScreen onBack={goHome} />;
  else content = <HomeScreen premium={premium} points={points} people={people} onOpenMenu={() => setMenuOpen(true)} onStartChat={(mode) => { if (!user) { setLaunchStep('terms'); return; } void verifyAds('start_chat').then((allowed) => { if (allowed) { setRequestedMode(mode); setPreferenceOpen(true); } }).catch(showError); }} onOpenNotifications={() => setScreen('notifications')} />;

  const dark = screen === 'splash' || screen === 'matching';
  const navigationScreens: Screen[] = ['home', 'friends', 'chats', 'search', 'suggestions', 'settings', 'profile', 'creator', 'notifications'];
  const showNavigation = Boolean(user && !launchStep && navigationScreens.includes(screen));
  const activeTab: BottomTab = screen === 'friends' ? 'friends' : screen === 'chats' ? 'chats' : screen === 'search' || screen === 'suggestions' ? 'search' : screen === 'profile' || screen === 'settings' || screen === 'creator' ? 'profile' : 'home';
  const selectTab = (tab: BottomTab) => {
    setMenuOpen(false);
    if (tab === 'home') { goHome(); return; }
    if (tab === 'profile') { setScreen('profile'); return; }
    void navigateMenu(tab as MenuDestination);
  };
  return <SafeAreaProvider><AppearanceProvider value={{ theme: user?.theme ?? 'light', fontScale: user?.fontScale ?? 1 }}><View style={[styles.desktop, user?.theme === 'dark' && { backgroundColor: '#180F18' }]}><View style={[styles.app, user?.theme === 'dark' && { backgroundColor: '#180F18' }]}><StatusBar style={dark || user?.theme === 'dark' ? 'light' : 'dark'} />{content}
    {showNavigation && <BottomNavigation active={activeTab} onSelect={selectTab} />}
    <LaunchFlow step={launchStep} bloomId={user?.bloomId} onTermsAccepted={async () => { try { if (gender && !user) await register(gender); const allowed = gender ? await verifyAds('terms') : await api.checkAdsBeforeRegistration(); setAdWarning(!allowed); setLaunchStep(gender ? 'start' : 'gender'); } catch (error) { showError(error); } }} onGenderSelected={async (selected) => { try { await register(selected); void verifyAds('gender').catch(showError); setLaunchStep('start'); } catch (error) { showError(error); } }} onSubscribe={(plan) => { void finishPlans(true, plan); }} onSkipPlans={() => { void finishPlans(false); }} onStart={() => { void verifyAds('start_chat').then((allowed) => { if (allowed) { setLaunchStep(null); setPreferenceOpen(true); } }).catch(showError); }} />
    <MatchPreferenceModal visible={preferenceOpen && launchStep === null} premium={premium} points={points} onClose={() => setPreferenceOpen(false)} onSelect={startMatching} onSubscribe={() => openPlans('upgrade')} onSpendPoints={startMatching} />
    <MenuDrawer visible={menuOpen && launchStep === null} premium={premium} points={points} onClose={() => setMenuOpen(false)} onNavigate={(destination) => { if (destination === 'profile') { setScreen('profile'); return; } void navigateMenu(destination); }} />
    <AdBlockWarning visible={adWarning} busy={adChecking} onRetry={() => { setAdChecking(true); void (user ? verifyAds('retry') : api.checkAdsBeforeRegistration().then((allowed) => { setAdWarning(!allowed); return allowed; })).catch(showError).finally(() => setAdChecking(false)); }} onPremium={() => { setAdWarning(false); openPlans('upgrade'); }} />
  </View></View></AppearanceProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({
  desktop: { flex: 1, alignItems: 'center', backgroundColor: Platform.OS === 'web' ? '#E9DDE2' : '#FFF8F8' },
  app: { flex: 1, width: '100%', maxWidth: 500, backgroundColor: '#FFF8F8', overflow: 'hidden' },
});
