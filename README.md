# Cards App Test

A wallet-style Expo app for managing bank cards, personal documents, and club cards with a polished card UI, local persistence, and a native card-scanning flow.

## Highlights

- Wallet dashboard with **stack** and **list** views
- Filter cards by category: **Everything**, **Bank Cards**, **Personal Docs**, and **Club Cards**
- Add and edit cards with a live preview
- Card detail screen for reviewing saved entries
- Local persistence with Zustand so saved cards survive app restarts
- Card scanner flow with camera capture + OCR + confirmation before saving
- Expo Router navigation with tab-based sections
- NativeWind + gluestack UI foundation for styling and UI primitives

## Tech stack

- **Expo SDK 54**
- **React Native 0.81**
- **React 19**
- **Expo Router**
- **Zustand** for app state and persistence
- **NativeWind** + **gluestack-ui**
- **react-native-vision-camera** for camera access
- **@react-native-ml-kit/text-recognition** for OCR
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

The app supports three categories:

- **Bank cards**
- **Personal documents**
- **Club cards**

The add/edit sheet includes dynamic fields based on the selected category and shows a live card preview while typing.

### Scanner flow

The scanner flow:

1. opens the camera
2. captures a card image
3. runs OCR on the image
4. extracts likely card details
5. shows a confirmation screen so the user can edit the detected values before saving

## Important scanner limitation

The scanner uses native camera/OCR libraries and **does not run in Expo Go**.

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

- `react-native-vision-camera`
- `react-native-worklets-core`
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
- improved OCR extraction rules for more card formats
- export/import or backup of saved cards
- stronger form validation for scanned values
