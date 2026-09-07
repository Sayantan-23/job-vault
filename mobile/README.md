# JobVault Mobile (Expo)

Android-first universal React Native / Expo app for JobVault.

Built with:
- Expo SDK 53+ / Expo Router (file-based navigation)
- React 19 / React Native 0.86
- TanStack Query v5 (data fetching & offline cache)
- NativeWind v5 / Tailwind CSS v4 / React Native CSS
- Expo Blur (`expo-blur` with Android Dimezis native provider)
- Lucide React Native icons

## Scripts

- `npm start` — Start Expo bundler
- `npm run android` — Run on Android device / emulator
- `npm run ios` — Run on iOS simulator
- `npm run web` — Run in web browser
- `npm test` — Run Jest unit test suite
- `npm run typecheck` — Typecheck without emitting
- `npm run lint` — Lint code with Expo ESLint config

## Push Notifications

For details on configuring Firebase Cloud Messaging (FCM v1) for Android and Apple Push Notification service (APNs) for iOS, see:
- [`docs/mobile-push-credentials.md`](../docs/mobile-push-credentials.md)
