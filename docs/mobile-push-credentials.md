# Mobile Push Notifications: Credentials Setup (Android & iOS)

This guide documents the setup of push notification credentials for JobVault Mobile (`expo-notifications`).

## Overview

Starting with Expo SDK 53, remote push notifications require a **Development Build** or **Production Build** (remote push functionality is removed from the shared Expo Go client APK). 

The JobVault client code is already completely implemented:
- Permission requests and Android notification channels (`mobile/src/lib/push-notifications.ts`)
- Device token retrieval and registration (`POST /api/notifications/push-token`)
- Foreground/background response listeners with deep linking to `/jobs/[id]` (`mobile/src/components/shared/push-notification-provider.tsx`)
- Graceful Expo Go fallback (`isRunningInExpoGo()`) so local UI testing never crashes

To enable remote push notifications to be delivered to real devices from your backend, you must configure platform credentials for **Android (FCM v1)** and **iOS (APNs)**.

---

## 1. Android (Firebase Cloud Messaging — FCM v1)

Google shut down the legacy FCM HTTP API in June 2024. Expo uses the modern **FCM v1** protocol.

### Step 1: Firebase Project Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create or select your JobVault Firebase project.
3. Add an Android app with the package name:
   `com.jobvault.mobile` (matches `android.package` in `mobile/app.json`).

### Step 2: Generate Google Service Account Key (FCM v1)
1. In Firebase Console, click the gear icon next to **Project Overview** > **Project settings**.
2. Go to the **Service accounts** tab.
3. Ensure **Firebase Admin SDK** is selected, and click **Generate new private key**.
4. Confirm and download the JSON key file. Keep this file secure.

### Step 3: Configure Credentials

#### Option A: EAS Build (Recommended)
1. Run the EAS credentials command:
   ```bash
   eas credentials -p android
   ```
2. Select your build profile (`development` or `production`).
3. Select **Google Service Account Key for FCM V1**.
4. Choose **Upload a new Google Service Account Key** and supply the downloaded JSON key file.
5. Alternatively, run:
   ```bash
   eas credentials:push:fcm:v1:upload
   ```

#### Option B: Local Android Build (`npx expo run:android`)
1. Download `google-services.json` from Firebase Console (**Project settings** > **General** > **Your apps** > **google-services.json**).
2. Place `google-services.json` in the `mobile/` directory (`mobile/google-services.json`).
3. Ensure `mobile/app.json` has `android.googleServicesFile`:
   ```json
   "android": {
     "package": "com.jobvault.mobile",
     "googleServicesFile": "./google-services.json"
   }
   ```
4. Verify `mobile/.gitignore` ignores `google-services.json` to prevent checking secret keys into git.

---

## 2. iOS (Apple Push Notification service — APNs)

Push notifications on iOS require an Apple Developer Account (paid) and an APNs Authentication Key (`.p8`).

### Step 1: Create an APNs Key in Apple Developer Portal
1. Go to the [Apple Developer Portal](https://developer.apple.com/account/).
2. Navigate to **Certificates, Identifiers & Profiles** > **Keys**.
3. Click the **+** button to create a new key.
4. Enter a Key Name (e.g. `JobVault Push Key`).
5. Check the box for **Apple Push Notifications service (APNs)**.
6. Click **Continue**, then **Register**.
7. Download the `.p8` key file. Note your **Key ID** and your Apple **Team ID**.
   *(Note: Apple only allows downloading the `.p8` file once.)*

### Step 2: Configure Credentials in EAS

#### Via EAS CLI
1. Run:
   ```bash
   eas credentials -p ios
   ```
2. Select your build profile (`development` or `production`).
3. Select **Push Notifications**.
4. Provide the downloaded `.p8` key file, Key ID, and Team ID when prompted (or let EAS generate one automatically using your Apple login).

#### Via EAS Web Dashboard
1. Go to [expo.dev](https://expo.dev) and select your JobVault project.
2. Go to **Project Settings** > **Credentials** > **iOS**.
3. Under **Push Notifications Key**, upload the `.p8` file and input the Key ID and Team ID.

---

## 3. Testing Push Notifications on Device

1. Build and install a development build or release build on a physical device:
   ```bash
   # Local Android build
   npx expo run:android

   # Or EAS cloud build
   eas build --profile development --platform android
   ```
2. Launch the app and grant notification permissions when prompted.
3. The app logs or sends its push token to the backend:
   `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
4. Send a test push via Expo's web push tool:
   - Go to [https://expo.dev/notifications](https://expo.dev/notifications)
   - Paste the `ExponentPushToken[...]`
   - Fill in Title (e.g. `Interview Scheduled`), Body, and Data payload (e.g. `{"jobId": "<job-uuid>"}`)
   - Click **Send a Notification**
5. On the phone, tapping the notification will open JobVault and deep-link directly to that job.
