import { isNative } from './platform';

// Placeholder Ad Unit IDs — replace with your real ones from AdMob console
const BANNER_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const INTERSTITIAL_AD_UNIT_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

let admobPlugin: any = null;

export async function initializeAdMob(): Promise<void> {
  if (!isNative()) return;

  try {
    const { AdMob } = await import('@capacitor-community/admob');
    admobPlugin = AdMob;

    await AdMob.initialize({
      initializeForTesting: true, // Set to false in production
    });
    console.log('AdMob initialized');
  } catch (err) {
    console.warn('AdMob initialization failed:', err);
  }
}

export async function showBannerAd(): Promise<void> {
  if (!isNative() || !admobPlugin) return;

  try {
    const { BannerAdSize, BannerAdPosition } = await import('@capacitor-community/admob');
    await admobPlugin.showBanner({
      adId: BANNER_AD_UNIT_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: true, // Set to false in production
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

export async function showInterstitialAd(): Promise<void> {
  if (!isNative() || !admobPlugin) return;

  try {
    await admobPlugin.prepareInterstitial({
      adId: INTERSTITIAL_AD_UNIT_ID,
      isTesting: true, // Set to false in production
    });
    await admobPlugin.showInterstitial();
  } catch (err) {
    console.warn('Interstitial ad failed:', err);
  }
}
