

# Plan: Capacitor Native App + Ad Monetization

## Overview
Set up Capacitor for a true native mobile app (publishable to App Store / Play Store), integrate AdMob for the native app, and AdSense for the web version.

## 1. Capacitor Setup

Install and configure Capacitor dependencies:
- `@capacitor/core`, `@capacitor/cli` (dev), `@capacitor/ios`, `@capacitor/android`
- Run `npx cap init` with appId `app.lovable.5d69dfcf808a43f5bcb24c64d90271d6` and appName `examfogeai`
- Configure `capacitor.config.ts` with live-reload server URL pointing to the sandbox preview
- Keep the existing PWA config for the web version

## 2. AdMob for Native App

Install `@capacitor-community/admob` plugin and create:
- A utility module (`src/lib/admob.ts`) that initializes AdMob and provides functions to show banner and interstitial ads
- A platform detection helper to only load AdMob on native (Capacitor) and skip on web
- Call initialization in `App.tsx` on mount
- Show banner ads on Dashboard and interstitial ads between test completions (on ResultsPage)

## 3. AdSense for Web App

- Add the Google AdSense script tag to `index.html` (you will need your AdSense publisher ID, e.g. `ca-pub-XXXXXXX`)
- Create an `<AdSenseAd>` React component that renders `<ins class="adsbygoogle">` ad units
- Place ad units on Dashboard and ResultsPage (only rendered when running in browser, not Capacitor)
- Use platform detection to show AdSense on web only

## 4. Platform Detection

Create a shared utility (`src/lib/platform.ts`):
- `isNative()` — returns true when running inside Capacitor
- `isWeb()` — returns true when running in browser
- Used by ad components to conditionally render AdMob vs AdSense

## Post-Setup Instructions

After implementation, you will need to:
1. Export the project to GitHub via Settings
2. Clone it locally, run `npm install`
3. Run `npx cap add ios` and/or `npx cap add android`
4. Run `npm run build && npx cap sync`
5. Run `npx cap run android` or `npx cap run ios` to test on device/emulator
6. Configure your AdMob app ID in the native project's config files (AndroidManifest.xml / Info.plist)

## What I Need From You

- Your **Google AdSense publisher ID** (format: `ca-pub-XXXXXXX`) for the web ads
- Your **AdMob App ID** and **Ad Unit IDs** (banner + interstitial) for the native ads — these are obtained from the [AdMob console](https://admob.google.com)

