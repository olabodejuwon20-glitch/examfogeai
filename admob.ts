// src/lib/admob.ts
// AdMob integration for native app
// AdSense is handled separately via AdSenseAd component

import { isNative } from './platform';
import { supabase } from '@/integrations/supabase/client';

// ============================================================
// AD SAFETY RULES — READ BEFORE PUBLISHING
// Rule 1 — Set IS_DEVELOPMENT to false before publishing
// Rule 2 — Replace all placeholder IDs with real AdMob IDs
// Rule 3 — Never click your own ads even once
// Rule 4 — Never ask users or friends to click ads
// Rule 5 — Always keep 60px gap between ads and buttons
// Rule 6 — Use test IDs during ALL development
// ============================================================

const IS_DEVELOPMENT = true; // ⚠️ Change to false before publishing

const AD_IDS = {
  test: {
    banner:       'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded:     'ca-app-pub-3940256099942544/5224354917',
  },
  production: {
    banner:       'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // ← replace
    interstitial: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // ← replace
    rewarded:     'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX', // ← replace
  },
};

const ADS = IS_DEVELOPMENT ? AD_IDS.test : AD_IDS.production;

let admobPlugin: any = null;
let interstitialCount = 0;

export async function initializeAdMob(): Promise<void> {
  if (!isNative()) return;
  try {
    const { AdMob } = await import('@capacitor-community/admob');
    admobPlugin = AdMob;
    await AdMob.initialize({
      initializeForTesting: IS_DEVELOPMENT,
    });
    console.log('AdMob initialized', IS_DEVELOPMENT ? '(TEST MODE)' : '(LIVE)');
  } catch (err) {
    console.warn('AdMob initialization failed:', err);
  }
}

export async function showBannerAd(): Promise<void> {
  if (!isNative() || !admobPlugin) return;
  try {
    const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
    await admobPlugin.showBanner({
      adId: ADS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: IS_DEVELOPMENT,
    });
  } catch (err) {
    console.warn('Banner ad failed:', err);
  }
}

export async function hideBannerAd(): Promise<void> {
  if (!isNative() || !admobPlugin) return;
  try {
    await admobPlugin.hideBanner();
  } catch (err) {
    console.warn('Hide banner failed:', err);
  }
}

// Show interstitial only every 3rd generation, AFTER results load
export async function maybeShowInterstitial(): Promise<void> {
  if (!isNative() || !admobPlugin) return;

  interstitialCount++;
  if (interstitialCount % 3 !== 0) return;

  try {
    // 1 second delay so results are fully visible first
    await new Promise((r) => setTimeout(r, 1000));

    await admobPlugin.prepareInterstitial({
      adId: ADS.interstitial,
      isTesting: IS_DEVELOPMENT,
    });
    await admobPlugin.showInterstitial();
  } catch (err) {
    console.warn('Interstitial ad failed:', err);
  }
}

// Keep old export name for backward compat
export const showInterstitialAd = maybeShowInterstitial;

// Rewarded ad — user chooses to watch to earn 1 credit
export async function showRewardedAd(userId: string): Promise<boolean> {
  if (!isNative() || !admobPlugin) {
    // On web — simulate reward for testing
    if (IS_DEVELOPMENT) {
      console.log('[DEV] Simulated rewarded ad for userId:', userId);
      return true;
    }
    return false;
  }

  return new Promise(async (resolve) => {
    try {
      await admobPlugin.prepareRewardVideoAd({
        adId: ADS.rewarded,
        isTesting: IS_DEVELOPMENT,
      });

      admobPlugin.addListener('onRewardedVideoAdReward', async () => {
        resolve(true);
      });

      admobPlugin.addListener('onRewardedVideoAdFailedToLoad', () => {
        resolve(false);
      });

      await admobPlugin.showRewardVideoAd();
    } catch (err) {
      console.warn('Rewarded ad failed:', err);
      resolve(false);
    }
  });
}
