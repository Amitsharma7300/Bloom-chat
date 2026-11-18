import { Platform } from 'react-native';
import mobileAds, { AdEventType, AdsConsent, InterstitialAd, TestIds } from 'react-native-google-mobile-ads';
import type { AdStatus } from './api';

let initialization: Promise<boolean> | null = null;
let showing = false;

async function ready() {
  if (!initialization) initialization = (async () => {
    try {
      const consent = await AdsConsent.gatherConsent();
      if (!consent.canRequestAds) return false;
      await mobileAds().initialize();
      return true;
    } catch { return false; }
  })();
  return initialization;
}

export async function showDueAd(status: AdStatus): Promise<'impression' | 'failed' | 'unavailable'> {
  if (!status.enabled || status.premium || !status.due || showing) return 'unavailable';
  const unit = __DEV__ ? TestIds.INTERSTITIAL : Platform.OS === 'ios' ? status.iosUnitId : status.androidUnitId;
  if (!unit || !(await ready())) return 'failed';
  showing = true;
  return new Promise((resolve) => {
    const ad = InterstitialAd.createForAdRequest(unit);
    let impression = false;
    let done = false;
    const listeners: Array<() => void> = [];
    const finish = (result: 'impression' | 'failed') => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      listeners.forEach((unsubscribe) => unsubscribe());
      showing = false;
      resolve(result);
    };
    const timer = setTimeout(() => finish(impression ? 'impression' : 'failed'), 45_000);
    listeners.push(ad.addAdEventListener(AdEventType.LOADED, () => { void ad.show().catch(() => finish('failed')); }));
    listeners.push(ad.addAdEventListener(AdEventType.IMPRESSION, () => { impression = true; }));
    listeners.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(impression ? 'impression' : 'failed')));
    listeners.push(ad.addAdEventListener(AdEventType.ERROR, () => finish('failed')));
    ad.load();
  });
}
