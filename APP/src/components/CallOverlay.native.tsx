import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, StyleSheet } from 'react-native';
import { Text, TouchableOpacity, View } from './ThemedPrimitives';
import { Ionicons } from './ThemedPrimitives';
import { LinearGradient } from './ThemedPrimitives';
import { MediaStream, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView, mediaDevices, registerGlobals } from 'react-native-webrtc';
import { palette } from '../constants/theme';
import PersonAvatar from './PersonAvatar';
import { connectRealtime, getIceServers, sendRealtime } from '../lib/api';
import type { CallMode, CallOverlayProps } from './CallOverlay.types';

registerGlobals();

type CallPhase = 'idle' | 'incoming' | 'outgoing' | 'connecting' | 'connected';
type Signal = { type: string; conversationId: string; fromUserId: string; payload?: Record<string, any> };

export default function CallOverlay({ conversationId, currentUserId, partner, request, incoming, onClose }: CallOverlayProps) {
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [mode, setMode] = useState<CallMode>('Voice');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const phaseRef = useRef<CallPhase>('idle');
  const modeRef = useRef<CallMode>('Voice');
  const callIdRef = useRef<string | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const remoteRef = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<any[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRequestId = useRef<number | null>(null);
  const lastIncomingCallId = useRef<string | null>(null);

  const setCallPhase = (next: CallPhase) => { phaseRef.current = next; setPhase(next); };
  const emit = useCallback((type: string, payload: Record<string, unknown> = {}) => {
    if (!callIdRef.current) return;
    sendRealtime({ type, conversationId, targetUserId: partner.id, payload: { callId: callIdRef.current, ...payload } });
  }, [conversationId, partner.id]);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    peerRef.current?.close();
    peerRef.current = null;
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    remoteRef.current = null;
    pendingCandidates.current = [];
    callIdRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMuted(false);
    setCameraEnabled(true);
    setElapsed(0);
    setCallPhase('idle');
    onClose();
  }, [onClose]);

  const createPeer = useCallback(async (callMode: CallMode) => {
    if (peerRef.current) return peerRef.current;
    const stream = await mediaDevices.getUserMedia({ audio: true, video: callMode === 'Video' ? { facingMode: 'user', width: 1280, height: 720, frameRate: 24 } : false });
    localRef.current = stream;
    setLocalStream(stream);
    const iceServers = await getIceServers().catch(() => [{ urls: 'stun:stun.l.google.com:19302' }]);
    const peer = new RTCPeerConnection({ iceServers });
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.onicecandidate = (event: any) => { if (event.candidate) emit('call.ice', { candidate: event.candidate.toJSON() }); };
    peer.ontrack = (event: any) => {
      const streamFromEvent = event.streams?.[0];
      if (streamFromEvent) { remoteRef.current = streamFromEvent; setRemoteStream(streamFromEvent); }
    };
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setCallPhase('connected');
      if (peer.connectionState === 'failed') {
        Alert.alert('Call could not connect', 'The network could not establish a media path. A TURN relay may be required on this network.');
        cleanup();
      }
    };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'disconnected') {
        timeoutRef.current = setTimeout(() => {
          if (peerRef.current === peer && peer.iceConnectionState === 'disconnected') {
            Alert.alert('Call connection lost', 'The other person may have lost their network connection.');
            cleanup();
          }
        }, 8000);
      } else if (peer.iceConnectionState === 'connected' || peer.iceConnectionState === 'completed') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    return peer;
  }, [cleanup, emit]);

  const flushCandidates = useCallback(async (peer: RTCPeerConnection) => {
    const queued = pendingCandidates.current.splice(0);
    for (const candidate of queued) await peer.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const finishRemoteCall = useCallback((signal: Signal) => {
    if (signal.payload?.callId !== callIdRef.current) return;
    if (signal.type === 'call.declined') Alert.alert('Call declined', `${partner.name} declined the call.`);
    if (signal.type === 'call.busy') Alert.alert('Busy', `${partner.name} is already on another call.`);
    cleanup();
  }, [cleanup, partner.name]);

  const handleSignal = useCallback(async (signal: Signal) => {
    if (signal.conversationId !== conversationId || signal.fromUserId !== partner.id) return;
    const payload = signal.payload ?? {};
    if (signal.type === 'call.invite') {
      if (phaseRef.current !== 'idle') {
        sendRealtime({ type: 'call.busy', conversationId, targetUserId: partner.id, payload: { callId: payload.callId } });
        return;
      }
      callIdRef.current = String(payload.callId ?? '');
      modeRef.current = payload.mode === 'Video' ? 'Video' : 'Voice';
      setMode(modeRef.current);
      setCallPhase('incoming');
      return;
    }
    if (payload.callId !== callIdRef.current) return;
    if (signal.type === 'call.accepted' && phaseRef.current === 'outgoing') {
      try {
        setCallPhase('connecting');
        const peer = await createPeer(modeRef.current);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        emit('call.offer', { description: peer.localDescription?.toJSON() ?? offer });
      } catch (error) {
        Alert.alert('Call could not start', error instanceof Error ? error.message : 'Please check microphone and camera permissions.');
        emit('call.end');
        cleanup();
      }
      return;
    }
    if (signal.type === 'call.offer') {
      try {
        const peer = peerRef.current ?? await createPeer(modeRef.current);
        await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
        await flushCandidates(peer);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        emit('call.answer', { description: peer.localDescription?.toJSON() ?? answer });
        setCallPhase('connecting');
      } catch (error) {
        Alert.alert('Call could not connect', error instanceof Error ? error.message : 'Please try again.');
        emit('call.end');
        cleanup();
      }
      return;
    }
    if (signal.type === 'call.answer') {
      const peer = peerRef.current;
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(payload.description));
        await flushCandidates(peer);
      } catch {
        emit('call.end');
        cleanup();
      }
      return;
    }
    if (signal.type === 'call.ice' && payload.candidate) {
      const peer = peerRef.current;
      if (!peer || !peer.remoteDescription) pendingCandidates.current.push(payload.candidate);
      else { try { await peer.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { /* ignore stale ICE after a call reset */ } }
      return;
    }
    if (signal.type === 'call.end' || signal.type === 'call.declined' || signal.type === 'call.busy') finishRemoteCall(signal);
  }, [conversationId, createPeer, emit, finishRemoteCall, flushCandidates, partner.id]);

  useEffect(() => connectRealtime((event) => { void handleSignal(event as Signal); }), [handleSignal]);

  const startCall = useCallback((callMode: CallMode) => {
    if (phaseRef.current !== 'idle') return;
    const callId = `${currentUserId}-${Date.now()}`;
    callIdRef.current = callId;
    modeRef.current = callMode;
    setMode(callMode);
    setCallPhase('outgoing');
    sendRealtime({ type: 'call.invite', conversationId, targetUserId: partner.id, payload: { callId, mode: callMode } });
    timeoutRef.current = setTimeout(() => {
      if (callIdRef.current === callId && phaseRef.current === 'outgoing') {
        emit('call.end');
        Alert.alert('No answer', `${partner.name} did not answer the call.`);
        cleanup();
      }
    }, 35_000);
  }, [cleanup, conversationId, currentUserId, emit, partner.id, partner.name]);

  useEffect(() => {
    if (!request || lastRequestId.current === request.id) return;
    lastRequestId.current = request.id;
    startCall(request.mode);
  }, [request, startCall]);

  useEffect(() => {
    if (!incoming || lastIncomingCallId.current === incoming.callId || phaseRef.current !== 'idle') return;
    lastIncomingCallId.current = incoming.callId;
    callIdRef.current = incoming.callId;
    modeRef.current = incoming.mode;
    setMode(incoming.mode);
    setCallPhase('incoming');
  }, [incoming]);

  const accept = useCallback(async () => {
    try {
      setCallPhase('connecting');
      await createPeer(modeRef.current);
      emit('call.accepted');
    } catch (error) {
      Alert.alert('Permission needed', error instanceof Error ? error.message : 'Allow Bloom to use your microphone and camera to take calls.');
      emit('call.declined');
      cleanup();
    }
  }, [cleanup, createPeer, emit]);

  const decline = useCallback(() => { emit('call.declined'); cleanup(); }, [cleanup, emit]);
  const hangup = useCallback(() => { emit('call.end'); cleanup(); }, [cleanup, emit]);

  useEffect(() => {
    if (phase !== 'connected') return;
    const timer = setInterval(() => setElapsed((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    peerRef.current?.close();
    localRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const toggleMute = () => {
    const next = !muted;
    localRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  };
  const toggleCamera = () => {
    const next = !cameraEnabled;
    localRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    setCameraEnabled(next);
  };
  const flipCamera = () => {
    const track = localRef.current?.getVideoTracks()[0] as unknown as { _switchCamera?: () => void } | undefined;
    track?._switchCamera?.();
  };
  const timeLabel = `${Math.floor(elapsed / 60).toString().padStart(2, '0')}:${(elapsed % 60).toString().padStart(2, '0')}`;
  const visible = phase !== 'idle';
  const title = phase === 'incoming' ? `${partner.name} is calling` : phase === 'outgoing' ? `Calling ${partner.name}…` : phase === 'connected' ? timeLabel : 'Connecting…';

  return <Modal visible={visible} animationType="slide" onRequestClose={hangup}>
    <View style={styles.screen}>
      {mode === 'Video' && remoteStream ? <RTCView streamURL={remoteStream.toURL()} objectFit="cover" style={styles.remoteVideo} /> : <LinearGradient colors={['#260B17', '#711936']} style={styles.voiceStage}>
        <PersonAvatar avatar={partner.avatar} gender={partner.gender} style={styles.avatar} />
        <Text style={styles.partnerName}>{partner.name}</Text>
        <Text style={styles.status}>{title}</Text>
      </LinearGradient>}
      {mode === 'Video' && !remoteStream && <View pointerEvents="none" style={styles.waitingVideo}><PersonAvatar avatar={partner.avatar} gender={partner.gender} style={styles.avatar} /><Text style={styles.partnerName}>{partner.name}</Text><Text style={styles.status}>{title}</Text></View>}
      {mode === 'Video' && localStream && <RTCView streamURL={localStream.toURL()} objectFit="cover" mirror style={styles.localVideo} />}
      <View style={styles.callHeader}><View style={styles.securePill}><Ionicons name="lock-closed" size={13} color={palette.mint} /><Text style={styles.secureText}>Private {mode.toLowerCase()} call</Text></View><TouchableOpacity accessibilityLabel="End call" onPress={hangup} style={styles.close}><Ionicons name="close" size={23} color="#FFFFFF" /></TouchableOpacity></View>
      {phase === 'incoming' ? <View style={styles.incomingActions}><TouchableOpacity onPress={decline} style={[styles.actionButton, styles.decline]}><Ionicons name="close" size={25} color="#FFFFFF" /><Text style={styles.actionLabel}>Decline</Text></TouchableOpacity><TouchableOpacity onPress={() => { void accept(); }} style={[styles.actionButton, styles.accept]}><Ionicons name={mode === 'Video' ? 'videocam' : 'call'} size={25} color="#FFFFFF" /><Text style={styles.actionLabel}>Answer</Text></TouchableOpacity></View> : phase === 'outgoing' || phase === 'connecting' ? <View style={styles.ringingActions}><Text style={styles.ringingText}>{title}</Text><TouchableOpacity onPress={hangup} style={[styles.hangup, styles.hangupWide]}><Ionicons name="call" size={25} color="#FFFFFF" /></TouchableOpacity></View> : <View style={styles.controls}>
        <TouchableOpacity onPress={toggleMute} style={styles.control}><View style={[styles.controlCircle, muted && styles.controlOff]}><Ionicons name={muted ? 'mic-off' : 'mic'} size={22} color="#FFFFFF" /></View><Text style={styles.controlText}>{muted ? 'Unmute' : 'Mute'}</Text></TouchableOpacity>
        {mode === 'Video' && <>
          <TouchableOpacity onPress={toggleCamera} style={styles.control}><View style={[styles.controlCircle, !cameraEnabled && styles.controlOff]}><Ionicons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={22} color="#FFFFFF" /></View><Text style={styles.controlText}>{cameraEnabled ? 'Camera' : 'Camera off'}</Text></TouchableOpacity>
          <TouchableOpacity onPress={flipCamera} style={styles.control}><View style={styles.controlCircle}><Ionicons name="camera-reverse" size={22} color="#FFFFFF" /></View><Text style={styles.controlText}>Flip</Text></TouchableOpacity>
        </>}
        <TouchableOpacity onPress={hangup} style={styles.control}><View style={[styles.controlCircle, styles.hangup]}><Ionicons name="call" size={23} color="#FFFFFF" /></View><Text style={styles.controlText}>End</Text></TouchableOpacity>
      </View>}
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#170A13', justifyContent: 'space-between' },
  remoteVideo: { ...StyleSheet.absoluteFill },
  voiceStage: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  waitingVideo: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(35,8,20,0.65)' },
  localVideo: { position: 'absolute', top: 100, right: 16, width: 115, height: 160, borderRadius: 16, overflow: 'hidden' },
  avatar: { width: 146, height: 146, borderRadius: 52, borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' },
  partnerName: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 18 },
  status: { color: '#E9DCE4', fontSize: 14, marginTop: 7 },
  callHeader: { paddingTop: 54, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  securePill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(20,12,22,0.55)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  secureText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800' },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(20,12,22,0.6)', alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, paddingBottom: 52, paddingTop: 16, backgroundColor: 'rgba(18,8,15,0.75)' },
  control: { alignItems: 'center', gap: 6 },
  controlCircle: { width: 55, height: 55, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  controlOff: { backgroundColor: '#756A72' },
  controlText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  incomingActions: { flexDirection: 'row', justifyContent: 'space-evenly', paddingBottom: 70 },
  actionButton: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', gap: 3 },
  decline: { backgroundColor: '#C13D54' },
  accept: { backgroundColor: '#1FAD80' },
  actionLabel: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  ringingActions: { alignItems: 'center', gap: 24, paddingBottom: 70 },
  ringingText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  hangup: { backgroundColor: palette.danger },
  hangupWide: { width: 65, height: 65, borderRadius: 33, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '135deg' }] },
});
