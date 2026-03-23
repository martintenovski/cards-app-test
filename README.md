# Cards App Test

A wallet-style Expo app for managing bank cards, personal documents, club cards, insurance cards, vehicle documents, and access badges with a polished card UI, local persistence, biometric app lock, expiry reminders, and an ML Kit-powered scanning flow.

## Highlights

- Wallet dashboard with **stack** and **list** views
- Filter cards by category: **Everything**, **Bank Cards**, **Personal Docs**, **Club Cards**, **Insurance Cards**, **Vehicle Docs**, and **Access Badges**
- Add and edit cards with a live preview
- Card detail screen for reviewing saved entries
- Biometric app lock with Face ID, Touch ID, or device PIN/pattern fallback
- Expiry badges for bank cards and personal documents
- Local push notifications 1 month, 2 weeks, and 2 days before expiry
- Local persistence with Zustand so saved cards survive app restarts
- Card scanner flow with camera capture + on-device OCR extraction + confirmation before saving
- Expo Router navigation with tab-based sections
- NativeWind + gluestack UI foundation for styling and UI primitives

## Tech stack

- **Expo SDK 54**
- **React Native 0.81**
- **React 19**
- **Expo Router**
- **Zustand** for app state and persistence
- **NativeWind** + **gluestack-ui**
- **@react-native-ml-kit/text-recognition** for on-device OCR
- **react-native-reanimated** and **react-native-gesture-handler** for motion and gestures

## Project structure

```text
app/                  Expo Router screens and navigation
components/           Wallet UI, forms, sheets, previews, scanner screen
constants/            Shared constants such as card gradients
types/                Card data models and helper utilities
store/                Zustand store for cards and view/filter state
utils/                OCR parsing helpers
assets/               App icons and splash assets
```

## Features

### Dashboard

The home screen displays cards in either:

- **Stack view** for the wallet-style browsing experience
- **List view** for a straightforward scrolling layout

Cards can be filtered by category from the top menu.

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

- The app locks on launch and after returning from the background, using **Face ID**, **Touch ID**, or the device credential fallback supported by `expo-local-authentication`
- Bank cards and personal documents show a **green / yellow / red** validity badge based on the saved expiry date
- Cards and documents with expiry dates schedule local reminders for:
  - **1 month before expiry**
  - **2 weeks before expiry**
  - **2 days before expiry**

### Scanner flow

The scanner flow:

1. opens the camera
2. captures a card image
3. runs on-device text recognition with ML Kit
4. shows the detected fields for review
5. shows a confirmation screen so the user can edit the detected values before saving

## Important scanner limitation

The scanner uses the native camera module and native ML Kit text recognition.

### What works where

- **Expo Go**: general UI preview and non-scanner flows
- **Native development build**: full app including camera scanner
- **Web**: wallet UI works, scanner is intentionally unavailable

If you open the scanner in Expo Go, the app shows a fallback message instead of crashing.

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

## Native scanner setup notes

Because the scanner depends on native modules, use a native development build when testing it on device.

Relevant packages already included in this project:

- `@react-native-ml-kit/text-recognition`
- `expo-dev-client`

### Camera permissions

Camera permissions are already configured in `app.json`:

- **iOS**: `NSCameraUsageDescription`
- **Android**: `android.permission.CAMERA`

## Build profiles

This repo includes `eas.json` with:

- `development`
- `preview`
- `production`

The development profile is configured for a development client build.

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
- export/import or backup of saved cards
- stronger form validation for scanned values
