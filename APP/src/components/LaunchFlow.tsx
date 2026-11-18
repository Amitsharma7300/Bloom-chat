import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { ScrollView, Text, TouchableOpacity, View } from './ThemedPrimitives';
import { Ionicons } from './ThemedPrimitives';
import { LinearGradient } from './ThemedPrimitives';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BloomLogo from './BloomLogo';
import { palette, shadow } from '../constants/theme';
import { RegisteredGender } from '../lib/registration';
import PersonAvatar from './PersonAvatar';
import { GENDER_AVATARS } from '../lib/avatars';
import LegalSheet, { LegalSection } from './LegalSheet';

export type LaunchStep = 'terms' | 'gender' | 'plans' | 'start' | null;

interface Props {
  step: LaunchStep;
  bloomId?: string;
  onTermsAccepted: () => Promise<void>;
  onGenderSelected: (gender: RegisteredGender) => Promise<void>;
  onSubscribe: (plan: string) => void;
  onSkipPlans: () => void;
  onStart: () => void;
}

const plans = [
  { id: 'weekly', title: 'Weekly', price: 'Unavailable', detail: 'Store billing setup required' },
  { id: 'monthly', title: 'Monthly', price: 'Unavailable', detail: 'Store billing setup required' },
];

export default function LaunchFlow({ step, bloomId, onTermsAccepted, onGenderSelected, onSubscribe, onSkipPlans, onStart }: Props) {
  const insets = useSafeAreaInsets();
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [gender, setGender] = useState<RegisteredGender | null>(null);
  const [submittingGender, setSubmittingGender] = useState(false);
  const [submittingTerms, setSubmittingTerms] = useState(false);
  const [legalSection, setLegalSection] = useState<LegalSection | null>(null);
  const [plan, setPlan] = useState('monthly');
  const ready = terms && privacy;
  useEffect(() => { if (step === 'terms') { setTerms(false); setPrivacy(false); setSubmittingTerms(false); } if (step === 'gender') { setGender(null); setSubmittingGender(false); } }, [step]);

  return <><Modal visible={step !== null} transparent animationType="fade">
    <View style={styles.backdrop}>
      <View style={[styles.card, { marginTop: insets.top + 18, marginBottom: insets.bottom + 18 }]}>
        {step === 'terms' && <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
          <View style={styles.brandRow}><BloomLogo compact /><View style={styles.securePill}><Ionicons name="shield-checkmark" size={14} color={palette.mint} /><Text style={styles.secureText}>18+ community</Text></View></View>
          <View style={styles.heroIcon}><Ionicons name="document-text" size={29} color={palette.coral} /></View>
          <Text style={styles.title}>Before you enter Bloom</Text>
          <Text style={styles.body}>A welcoming place for real conversations. Read how Bloom works, then choose what you agree to.</Text>
          <View style={styles.infoRow}><Ionicons name="document-text" size={17} color={palette.coral} /><Text style={styles.infoText}><Text style={{ fontWeight: '900' }}>Terms: </Text>Adults only, respect boundaries, and do not share harmful or illegal content.</Text></View>
          <View style={[styles.infoRow, { marginTop: 7 }]}><Ionicons name="lock-closed" size={17} color={palette.violet} /><Text style={styles.infoText}><Text style={{ fontWeight: '900' }}>Privacy: </Text>Your private ID and choices are used for matching and safety.</Text></View>
          <View style={styles.checkRow}>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: terms }} accessibilityLabel="Accept Terms and Conditions" onPress={() => setTerms(!terms)} style={styles.checkAction}>
              <View style={[styles.checkbox, terms && styles.checkboxActive]}>{terms && <Ionicons name="checkmark" size={15} color="#FFF" />}</View><Text style={styles.checkText}>I accept the</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="link" onPress={() => setLegalSection('terms')}><Text style={styles.link}>Terms & Conditions</Text></TouchableOpacity>
            <Ionicons name="open-outline" size={14} color={palette.coral} />
          </View>
          <View style={styles.checkRow}>
            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: privacy }} accessibilityLabel="Accept Privacy Policy" onPress={() => setPrivacy(!privacy)} style={styles.checkAction}>
              <View style={[styles.checkbox, privacy && styles.checkboxActive]}>{privacy && <Ionicons name="checkmark" size={15} color="#FFF" />}</View><Text style={styles.checkText}>I accept the</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="link" onPress={() => setLegalSection('privacy')}><Text style={styles.link}>Privacy Policy</Text></TouchableOpacity>
            <Ionicons name="open-outline" size={14} color={palette.coral} />
          </View>
          <Text style={styles.finePrint}>By registering, you confirm that you are at least 18 years old.</Text>
          <PrimaryButton label={submittingTerms ? 'Preparing Bloom...' : 'Continue'} icon="arrow-forward" disabled={!ready || submittingTerms} onPress={() => { setSubmittingTerms(true); void onTermsAccepted().finally(() => setSubmittingTerms(false)); }} />
        </ScrollView>}

        {step === 'gender' && <View style={styles.cardContent}>
          <StepPill value="LAST STEP" />
          <View style={[styles.heroIcon, { backgroundColor: palette.violetSoft }]}><Ionicons name="people" size={30} color={palette.violet} /></View>
          <Text style={styles.title}>How do you identify?</Text>
          <Text style={styles.body}>Choose this once to create your profile. You will not be asked again when you reopen Bloom.</Text>
          <View style={styles.genderRow}>{(['Man', 'Woman'] as const).map((item) => {
            const active = gender === item;
            return <TouchableOpacity accessibilityRole="button" accessibilityState={{ selected: active }} key={item} onPress={() => setGender(item)} style={[styles.genderCard, active && styles.genderActive]}>
              <PersonAvatar avatar={GENDER_AVATARS[item]} gender={item} style={styles.genderAvatar} />
              <View style={styles.genderLabel}><View style={[styles.genderIcon, active && styles.genderIconActive]}><Ionicons name={item === 'Man' ? 'male' : 'female'} size={17} color={active ? '#FFF' : palette.violet} /></View><Text style={[styles.genderText, active && styles.genderTextActive]}>{item}</Text></View>
              {active && <View style={styles.selectedBadge}><Ionicons name="checkmark" size={15} color="#FFF" /></View>}
            </TouchableOpacity>;
          })}</View>
          <View style={styles.infoRow}><Ionicons name="lock-closed" size={17} color={palette.mint} /><Text style={styles.infoText}>Your illustrated avatar and private Bloom ID keep personal details separate.</Text></View>
          <PrimaryButton label={submittingGender ? 'Creating your profile...' : 'Continue'} icon="arrow-forward" disabled={!gender || submittingGender} onPress={() => { if (!gender) return; setSubmittingGender(true); void onGenderSelected(gender).finally(() => setSubmittingGender(false)); }} />
        </View>}

        {step === 'plans' && <ScrollView contentContainerStyle={styles.cardContent} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={onSkipPlans} style={styles.close}><Ionicons name="close" size={22} color={palette.ink} /></TouchableOpacity>
          <View style={[styles.heroIcon, styles.premiumIcon]}><Ionicons name="diamond" size={29} color={palette.gold} /></View>
          <Text style={styles.title}>Bloom Premium</Text>
          <Text style={styles.body}>Premium is a preview. Purchases stay disabled until verified store billing is connected.</Text>
          <View style={styles.benefits}>{[
            ['options', 'Male & female match filters'], ['shield-checkmark', 'Priority safety controls'], ['star', 'Super Like profiles'],
          ].map(([icon, text]) => <View key={text} style={styles.benefit}><View style={styles.benefitIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={17} color={palette.coral} /></View><Text style={styles.benefitText}>{text}</Text><Ionicons name="checkmark-circle" size={17} color={palette.mint} /></View>)}</View>
          {plans.map((item) => <TouchableOpacity key={item.id} onPress={() => setPlan(item.id)} style={[styles.plan, plan === item.id && styles.planActive]}>
            <View style={[styles.radio, plan === item.id && styles.radioActive]}>{plan === item.id && <View style={styles.radioDot} />}</View>
            <View style={{ flex: 1 }}><Text style={styles.planTitle}>{item.title}</Text><Text style={styles.planDetail}>{item.detail}</Text></View><Text style={styles.planPrice}>{item.price}</Text>
          </TouchableOpacity>)}
          <PrimaryButton label="Premium coming soon" icon="diamond" onPress={() => onSubscribe(plan)} />
          <TouchableOpacity onPress={onSkipPlans} style={styles.notNow}><Text style={styles.notNowText}>Not now — continue free</Text></TouchableOpacity>
        </ScrollView>}

        {step === 'start' && <View style={[styles.cardContent, styles.startContent]}>
          <View style={styles.startLogo}><LinearGradient colors={['#A52A4D', '#73112D']} style={styles.startLogoFill}><Ionicons name="chatbubbles" size={35} color="#FFF" /></LinearGradient></View>
          <Text style={styles.title}>Ready to meet someone?</Text>
          <Text style={styles.body}>Your next conversation is one tap away. You decide who to keep talking to.</Text>
          <View style={styles.onlinePill}><Ionicons name="checkmark-circle" size={15} color={palette.mint} /><Text style={styles.onlineText}>Your private profile is ready</Text></View>
          {bloomId && <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.violetSoft, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 15, marginTop: 13 }}><Ionicons name="finger-print-outline" size={19} color={palette.violet} /><View><Text style={{ color: palette.inkMuted, fontSize: 7.5, fontWeight: '900', letterSpacing: 0.8 }}>YOUR BLOOM ID</Text><Text selectable style={{ color: palette.violet, fontSize: 12, fontWeight: '900', marginTop: 2 }}>{bloomId}</Text></View></View>}
          <PrimaryButton label="Start Chat" icon="chatbubble-ellipses" onPress={onStart} />
          <Text style={styles.finePrint}>Private • Block and report • You can leave anytime</Text>
        </View>}
      </View>
      <LegalSheet embedded section={legalSection} onClose={() => setLegalSection(null)} />
    </View>
  </Modal></>;
}

function StepPill({ value }: { value: string }) { return <View style={styles.stepPill}><Text style={styles.stepText}>REGISTRATION • {value}</Text></View>; }

function PrimaryButton({ label, icon, disabled, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; disabled?: boolean; onPress: () => void }) {
  return <TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.86} style={[styles.buttonShadow, disabled && { opacity: 0.5 }]}>
    <LinearGradient colors={disabled ? ['#C7BEC3', '#AFA5AA'] : ['#A52A4D', '#73112D']} style={styles.primary}><Ionicons name={icon} size={19} color="#FFF" /><Text style={styles.primaryText}>{label}</Text></LinearGradient>
  </TouchableOpacity>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: 'rgba(30,8,17,0.78)' },
  card: { width: '100%', maxHeight: '92%', alignSelf: 'center', backgroundColor: palette.canvas, borderRadius: 30, overflow: 'hidden', ...shadow.card },
  cardContent: { padding: 22 }, brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, securePill: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14, backgroundColor: palette.mintSoft }, secureText: { color: '#397461', fontSize: 8.5, fontWeight: '900' },
  heroIcon: { width: 66, height: 66, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.coralSoft, alignSelf: 'center', marginTop: 19 }, premiumIcon: { backgroundColor: palette.goldSoft, marginTop: 4 }, title: { color: palette.ink, fontSize: 25, lineHeight: 30, textAlign: 'center', fontWeight: '900', letterSpacing: -0.5, marginTop: 15 }, body: { color: palette.inkSoft, fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 7 },
  checkRow: { minHeight: 58, marginTop: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.line }, checkAction: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12 }, checkbox: { width: 23, height: 23, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#B6A8AF' }, checkboxActive: { backgroundColor: palette.coral, borderColor: palette.coral }, checkText: { color: palette.ink, fontSize: 11, fontWeight: '700' }, link: { color: palette.coral, fontSize: 11, fontWeight: '900', textDecorationLine: 'underline' }, finePrint: { color: palette.inkMuted, fontSize: 8.5, lineHeight: 13, textAlign: 'center', marginTop: 12 }, buttonShadow: { marginTop: 17, ...shadow.coral }, primary: { height: 53, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, primaryText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  stepPill: { alignSelf: 'center', backgroundColor: palette.coralSoft, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14 }, stepText: { color: palette.coral, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.8 }, genderRow: { flexDirection: 'row', gap: 10, marginTop: 20 }, genderCard: { flex: 1, height: 154, borderRadius: 22, alignItems: 'center', justifyContent: 'flex-end', gap: 8, padding: 8, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: palette.line, overflow: 'hidden' }, genderActive: { borderColor: palette.coral, backgroundColor: palette.coralSoft }, genderAvatar: { position: 'absolute', top: 0, width: '115%', height: 110 }, genderLabel: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 31, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.94)' }, genderIcon: { width: 25, height: 25, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.violetSoft }, genderIconActive: { backgroundColor: palette.coral }, genderText: { color: palette.inkSoft, fontSize: 12, fontWeight: '900' }, genderTextActive: { color: palette.ink }, selectedBadge: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.coral, borderWidth: 2, borderColor: '#FFF' }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 11, borderRadius: 15, marginTop: 16, backgroundColor: palette.mintSoft }, infoText: { color: '#427563', fontSize: 9, flex: 1 },
  close: { alignSelf: 'flex-end', width: 37, height: 37, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: palette.line }, benefits: { marginTop: 15, marginBottom: 5 }, benefit: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 42 }, benefitIcon: { width: 33, height: 33, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.coralSoft }, benefitText: { flex: 1, color: palette.inkSoft, fontSize: 10.5, fontWeight: '700' }, plan: { minHeight: 62, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: palette.line, backgroundColor: '#FFF', marginTop: 8 }, planActive: { borderColor: palette.coral, backgroundColor: palette.coralSoft }, radio: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: palette.inkMuted }, radioActive: { borderColor: palette.coral }, radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: palette.coral }, planTitle: { color: palette.ink, fontSize: 11.5, fontWeight: '900' }, planDetail: { color: palette.inkMuted, fontSize: 8.5, marginTop: 2 }, planPrice: { color: palette.coral, fontSize: 14, fontWeight: '900' }, notNow: { alignItems: 'center', padding: 12 }, notNowText: { color: palette.inkSoft, fontSize: 10, fontWeight: '800' },
  startContent: { alignItems: 'stretch', paddingVertical: 32 }, startLogo: { width: 84, height: 84, borderRadius: 30, padding: 7, alignSelf: 'center', backgroundColor: palette.coralSoft }, startLogoFill: { flex: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }, onlinePill: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: palette.mintSoft, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 15, marginTop: 17 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.mint }, onlineText: { color: '#427563', fontSize: 9.5, fontWeight: '800' },
});
