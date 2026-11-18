import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import type { CallOverlayProps } from './CallOverlay.types';

export default function CallOverlay({ request, onClose }: CallOverlayProps) {
  useEffect(() => {
    if (!request) return;
    Alert.alert('Use Bloom on a phone for calls', 'Voice and video calls use the phone microphone and camera.');
    onClose();
  }, [onClose, request]);
  return null;
}
