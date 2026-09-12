import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { isRunningInExpoGo } from 'expo';

import { apiClient } from './api-client';

const PUSH_TOKEN_STORAGE_KEY = 'jobvault_push_token';

/**
 * Push notifications are not supported in Expo Go on Android since SDK 53.
 * In Jest tests, we allow execution since tests mock the native layer.
 */
export function isPushSupported(): boolean {
  const isTesting =
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV?.toLowerCase() === 'test';
  if (isTesting) {
    return true;
  }
  return !isRunningInExpoGo();
}

/**
 * Returns expo-notifications module only when NOT running in Expo Go.
 * Remote push notifications were removed from Expo Go in SDK 53 and
 * evaluating the native module in Expo Go throws an unrecoverable exception (t-0ccxkq).
 */
export function getNotifications(): typeof import('expo-notifications') | null {
  if (!isPushSupported()) {
    return null;
  }
  try {
    // Dynamic require so Expo Go never evaluates expo-notifications native module on Android
    // (remote notifications were removed from Expo Go in SDK 53 and throw at import time).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

// Configure foreground handler if native module is available
const notificationsModule = getNotifications();
if (notificationsModule?.setNotificationHandler) {
  notificationsModule.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Configure the Android notification channel. Android 8+ silently drops
 * notifications without a channel (t-0ccxkq).
 */
export async function setupNotificationChannelAsync(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#576cb7',
    });
  }
}

/**
 * Registers device for remote push notifications and posts the Expo push token
 * to the backend endpoint POST /api/push/devices (t-0009).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return null;
  }

  await setupNotificationChannelAsync();

  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const token = tokenData.data;

  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  try {
    await apiClient.post('/api/push/devices', {
      token,
      platform,
    });
    await SecureStore.setItemAsync(PUSH_TOKEN_STORAGE_KEY, token);
  } catch (error) {
    console.warn('Failed to register device push token with backend:', error);
  }

  return token;
}

/**
 * Unregisters the device push token on logout via DELETE /api/push/devices/:token.
 */
export async function unregisterPushTokenAsync(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return;
  }

  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
    if (token) {
      await apiClient.delete(`/api/push/devices/${encodeURIComponent(token)}`);
      await SecureStore.deleteItemAsync(PUSH_TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Failed to unregister push token:', error);
  }
}

export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unsupported';

/**
 * Checks current push notification permission status on device.
 */
export async function getPushStatusAsync(): Promise<PushPermissionStatus> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return 'unsupported';
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch {
    return 'unsupported';
  }
}

/**
 * Retrieves the currently registered device push token from SecureStore, if any.
 */
export async function getStoredPushTokenAsync(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PUSH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}
