import React from 'react';
import { Modal, StyleSheet } from 'react-native';
import { ScrollView, Text, TouchableOpacity, View } from './ThemedPrimitives';
import { Ionicons } from './ThemedPrimitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../constants/theme';

export type LegalSection = 'terms' | 'privacy';

export default function LegalSheet({ section, onClose, embedded = false }: { section: LegalSection | null; onClose: () => void; embedded?: boolean }) {
  const insets = useSafeAreaInsets();
  const privacy = section === 'privacy';
  const content = <View style={[styles.shade, embedded && StyleSheet.absoluteFill]}>
      <TouchableOpacity accessibilityLabel="Close document" style={styles.dismiss} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.handle} />
        <View style={styles.heading}>
          <View style={styles.icon}><Ionicons name={privacy ? 'lock-closed' : 'document-text'} size={22} color={palette.coral} /></View>
          <View style={styles.headingText}><Text style={styles.kicker}>BLOOM COMMUNITY</Text><Text style={styles.title}>{privacy ? 'Privacy Policy' : 'Terms & Conditions'}</Text></View>
          <TouchableOpacity accessibilityLabel="Close document" onPress={onClose} style={styles.close}><Ionicons name="close" size={21} color={palette.ink} /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {privacy ? <>
            <Text style={styles.intro}>A clear overview of the information Bloom uses to make matching, chat and calls work.</Text>
            <Section title="Your profile" body="Bloom creates a private ID and uses the gender and profile details you choose during registration. Other members can see your illustrated avatar, profile name and details you share." />
            <Section title="Conversations and connections" body="Bloom processes messages, friend requests, matches and call connection information to deliver these features. People you chat with can see the messages you send them." />
            <Section title="Your choices" body="You can leave a match, block another member and reset the anonymous profile on this device in Settings. Avoid sharing passwords, financial information or your exact address in chat." />
          </> : <>
            <Text style={styles.intro}>Bloom is a space for adults to meet through respectful conversations.</Text>
            <Section title="Adults only" body="You must be at least 18 years old to use Bloom." />
            <Section title="Respect boundaries" body="Do not harass, threaten or pressure another person. Leave a conversation when someone asks you to stop." />
            <Section title="Keep it safe" body="Do not share illegal or harmful content. You can leave, block or report a conversation at any time." />
          </>}
        </ScrollView>
        <TouchableOpacity accessibilityRole="button" onPress={onClose} style={styles.done}><Text style={styles.doneText}>Done reading</Text><Ionicons name="checkmark" size={18} color="#FFF" /></TouchableOpacity>
      </View>
    </View>;
  return embedded ? (section ? content : null) : <Modal visible={section !== null} transparent animationType="slide" onRequestClose={onClose}>{content}</Modal>;
}

function Section({ title, body }: { title: string; body: string }) {
  return <View style={styles.section}><View style={styles.sectionDot} /><View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionBody}>{body}</Text></View></View>;
}

const styles = StyleSheet.create({
  shade: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(32, 9, 19, 0.66)' },
  dismiss: { flex: 1 }, sheet: { maxHeight: '84%', backgroundColor: palette.canvas, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 22, paddingTop: 11 },
  handle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: palette.line, marginBottom: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: palette.coralSoft, alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1 }, kicker: { color: palette.coral, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 }, title: { color: palette.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.5, marginTop: 2 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.line, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: 20 }, intro: { color: palette.inkSoft, fontSize: 14, lineHeight: 21, marginBottom: 18 },
  section: { flexDirection: 'row', gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: palette.line }, sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.coral, marginTop: 6 },
  sectionTitle: { color: palette.ink, fontSize: 15, fontWeight: '900' }, sectionBody: { color: palette.inkSoft, fontSize: 12.5, lineHeight: 19, marginTop: 5 },
  done: { height: 52, borderRadius: 26, backgroundColor: palette.coral, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, doneText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
});
