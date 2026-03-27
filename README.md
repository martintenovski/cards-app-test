# Pocket ID

A wallet-style Expo app for managing bank cards, personal documents, club cards, insurance cards, vehicle documents, and access badges with a polished card UI, local persistence, biometric app lock, and expiry reminders.

## Highlights

- Wallet dashboard with **stack** and **list** views (defaulting to **list**)
- Filter cards by category: **Everything**, **Bank Cards**, **Personal Docs**, **Club Cards**, **Insurance Cards**, **Vehicle Docs**, and **Access Badges**
- Add and edit cards with a live preview
- Card detail screen for reviewing saved entries
- Biometric app lock with Face ID, Touch ID, or device PIN/pattern fallback
- Expiry badges for bank cards and personal documents
- Local push notifications 1 month, 2 weeks, and 2 days before expiry
- Local persistence with Zustand so saved cards survive app restarts
- Google sign-in with optional encrypted Supabase cloud sync
- Single-card Pocket ID file export/import for moving one card between devices
- Responsive layout polish for smaller and older Android/iOS devices
- Expo Router navigation with tab-based sections
- Optional biometric lock prompt after onboarding, with manual unlock instead of surprise auto-prompts
- NativeWind + gluestack UI foundation for styling and UI primitives

## Tech stack

- **Expo SDK 54**
- **React Native 0.81**
- **React 19**
- **Expo Router**
- **Zustand** for app state and persistence
- **NativeWind** + **gluestack-ui**
- **react-native-reanimated** and **react-native-gesture-handler** for motion and gestures

## Project structure

```text
app/                  Expo Router screens and navigation
components/           Wallet UI, forms, sheets, and previews
constants/            Shared constants such as card gradients
types/                Card data models and helper utilities
store/                Zustand store for cards and view/filter state
utils/                App utilities
assets/               App icons and splash assets
```

## Features

### Dashboard

The home screen displays cards in either:

- **Stack view** for the wallet-style browsing experience
- **List view** for a straightforward scrolling layout

Cards can be filtered by category from the top menu.

The app is tuned for compact devices as well, with responsive dashboard,
preview, profile, and tab bar layouts for narrower or shorter screens.

### Add / edit card flow

The app supports six categories:

- **Bank cards**
- **Personal documents**
- **Club cards**
- **Insurance cards**
- **Vehicle documents**
- **Access badges**

The add/edit sheet includes dynamic fields based on the selected category and shows a live card preview while typing.

### Security and expiry tracking

- Users can opt into biometric lock after onboarding, and Pocket ID then locks on relaunch or after returning from the background using **Face ID**, **Touch ID**, or the device credential fallback supported by `expo-local-authentication`
- Bank cards and personal documents show a **green / yellow / red** validity badge based on the saved expiry date
- Cards and documents with expiry dates schedule local reminders for:
  - **1 month before expiry**
  - **2 weeks before expiry**
  - **2 days before expiry**

### Cloud sync and account management

- Sign in with **Google** to connect a personal cloud vault for card sync
- Switch to a different Google account from the profile screen
- Delete synced cloud data directly from the profile screen
- Pause sync on a device by forgetting the local sync passphrase

Cloud sync is designed so the device can keep working locally even when the
user has not enabled the encrypted cloud vault yet.

Automatic cloud reconciliation now runs silently in the background; only user-requested sync actions surface a status banner.

### Encrypted cloud vault

Pocket ID supports client-side encrypted sync for the `wallet_snapshots`
payload stored in Supabase.

- Card data is encrypted on-device before upload
- The sync passphrase is stored only on the device using secure storage
- Supabase stores ciphertext, not readable card details, once encrypted sync is enabled
- The passphrase screen includes a live strength meter and a clear warning that
  forgetting the passphrase means the synced vault cannot be recovered on a new device

Encryption details:

- **XChaCha20-Poly1305** for authenticated encryption
- **scrypt** for passphrase-based key derivation

If you are migrating from older plaintext sync data, the app can read the old
snapshot and re-upload it in encrypted form after a sync passphrase has been set.

### Sharing and importing a single card

The card detail screen can export one card as a **Pocket ID file**.

- On **Android**, the app saves the file to a folder you choose and then offers
  a **Share now** step for apps like Gmail, Drive, WhatsApp, Messenger, or Viber
- On **iOS**, the app prepares the file and then offers the same **Share now**
  confirmation before opening the native share sheet
- The add-card sheet now includes an **Import shared card** entry point
- The import screen can open a shared Pocket ID file directly from Files,
  Gmail, Google Drive, Downloads, or similar apps

## Getting started

### Prerequisites

Recommended:

- **Node.js 18+**
- **npm**
- **Expo CLI tooling** via `npx`

Optional depending on platform:

- **Android Studio** for Android native development
- **Xcode** on macOS for local iOS native builds
- **EAS CLI** if you want cloud builds

### Install dependencies

```bash
npm install
```

### Start the app

```bash
npm run start
```

### Run on web

```bash
npm run web
```

### Run Android native build

```bash
npm run android
```

### Run iOS native build

```bash
npm run ios
```

> Local iOS native builds require **macOS + Xcode**. On Windows, you cannot produce a local native iOS build directly.

## Build profiles

This repo includes `eas.json` with:

- `development`
- `preview`
- `production`

The development profile is configured for a development client build.

## Supabase cloud sync setup

Google sign-in by itself does **not** create the cloud sync table.
To make cards sync between devices, you also need to run the SQL in
`supabase/schema.sql` inside your Supabase project's SQL editor.

That file creates the `public.wallet_snapshots` table and the RLS policies used
by `CloudSyncManager` to pull and push cards for the signed-in user.

If this SQL has not been applied yet, sign-in can still work while card sync
silently fails.

### Environment variables

For local development, add the following to `.env.local`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
- `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`

For EAS `preview`, `development`, or `production` builds, you must also add
the same `EXPO_PUBLIC_*` values in your Expo/EAS environment configuration
before starting the build. Remote builds do not receive your ignored local
`.env.local` file automatically.

If these values are missing or still set to the example placeholders, the app
will treat the affected service as not configured in that build. In practice:

- missing Supabase / Google values disable cloud sign-in and sync
- missing RevenueCat values disable the support purchase flow

### RevenueCat / Google Play testing notes

For Android support purchases to appear in RevenueCat on internal testing builds:

- keep the Android package name as `com.tenovski.cardsapp`
- create the matching products in **Google Play Console** and mark them active
- attach those exact product IDs to the RevenueCat offering with identifier `support`
- install the build from the **Play internal testing track**, not by side-loading an APK
- sign in to **Google Play** on the device with a tester or license-tester account
- prefer a **physical Android device**; if you use an emulator, it must be a **Google Play-enabled** system image

If products work locally but not in a Play-distributed build, the issue is usually
Play billing availability on the test device/account or a mismatch between the
Play Console products and the RevenueCat `support` offering.

### Native Google Sign-In setup

Pocket ID now uses native Google account selection on iOS and Android and then
hands the returned Google ID token to Supabase with
`supabase.auth.signInWithIdToken({ provider: "google", token })`.

Google Cloud setup summary:

- create an **Android OAuth client ID** for package `com.tenovski.cardsapp`
- add every required Android **SHA-1** fingerprint for your debug, EAS, and
  release signing configs
- create an **iOS OAuth client ID** for bundle ID `com.tenovski.cardsapp`
- copy that iOS client's **reversed client ID** into
  `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME`
- create a **Web OAuth client ID** and place it in
  `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` so the native SDK can mint the ID token
  that Supabase verifies

After adding or changing the Google native credentials, rebuild the native app
or development client so the Expo config plugin can register the iOS URL scheme.

### OAuth redirect scheme

The app supports these schemes:

- `pocketid://auth/callback`
- `cards-app://auth/callback` (legacy Android compatibility)

### Encrypted sync setup flow

After Google sign-in works and the Supabase SQL has been applied:

1. open the **Profile** tab
2. tap **Set Sync Passphrase**
3. choose a strong passphrase and confirm it
4. let the app sync again so the wallet snapshot is uploaded in encrypted form

If the passphrase is forgotten, the encrypted synced vault cannot be recovered
on a new device.

## Recommended Git workflow

If you're used to a `development -> live` flow on web projects, that maps very well here with one important mobile twist:

- **`main`** = production-ready code
- **`develop`** = integration branch for day-to-day work
- **`hotfix/*`** = urgent fixes branched from `main`

### Suggested branch flow

1. commit your day-to-day work directly to `develop`
2. test with a local dev build or preview build
3. when you want to ship, open a PR from `develop` into `main`
4. review the PR and merge it only when the release looks good
5. create a production build from `main`
6. tag the release, for example `v1.0.0`

This repository uses `main` as the production-ready branch.

### How mobile releases differ from web

On web, merging to production often means the live site updates immediately.

On mobile, there are usually **two different kinds of releases**:

- **JavaScript / asset updates**: can be delivered quickly with Expo update infrastructure
- **Native changes**: require a new app binary and usually App Store / Play Store submission

In this app, changes involving packages like ML Kit OCR, camera modules, local authentication, or notification modules should be treated as **native-impacting** changes and should go through a fresh build.

### Practical mapping for this repo

- `develop` → internal testing using the `development` or `preview` EAS profile
- `main` → store-ready builds using the `production` EAS profile

### Minimum repo rules worth adopting

- protect `main` from direct pushes
- allow direct commits to `develop` if this is a solo-maintained project
- use PRs from `develop` into `main` for releases
- require the validation workflow to pass before merge
- tag every production release
- keep release notes in GitHub releases or a changelog

## Validation scripts

This repo includes a few lightweight checks you can run before pushing:

```bash
npm run typecheck
npm run doctor
npm run check
```

These are also good candidates to run in CI on pull requests.

## Persistence

Cards and dashboard preferences are stored locally using Zustand persistence.

That includes:

- saved cards
- selected home filter
- current view mode

## Scripts

```bash
npm run start
npm run android
npm run ios
npm run web
```

## Notes for Windows development

- Android and web are the easiest local targets
- Expo Go can be used to preview non-scanner flows on a phone
- The scanner requires a native development build
- Local iOS native builds are not available on Windows

## Repository

GitHub: `martintenovski/cards-app-test`

## Future improvements

Some useful next additions could be:

- automated tests
- screenshots/GIFs in the README
- richer scanned-card review and validation flows
- full-wallet encrypted backup/export flow
- stronger form validation for scanned values
