import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

import { apiClient } from './api-client';
import {
  getPushStatusAsync,
  getStoredPushTokenAsync,
  registerForPushNotificationsAsync,
  setupNotificationChannelAsync,
  unregisterPushTokenAsync,
} from './push-notifications';

let mockIsDevice = true;
jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  AndroidImportance: { MAX: 5 },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('./api-client', () => ({
  apiClient: {
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('push-notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDevice = true;
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExpoPushToken[test-token-123]',
    });
    (apiClient.post as jest.Mock).mockResolvedValue({});
    (apiClient.delete as jest.Mock).mockResolvedValue({});
  });

  describe('setupNotificationChannelAsync', () => {
    it('configures channel on Android', async () => {
      Platform.OS = 'android';
      await setupNotificationChannelAsync();
      expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'default',
        expect.objectContaining({
          name: 'Default',
          importance: 5,
        })
      );
    });

    it('skips channel on iOS', async () => {
      Platform.OS = 'ios';
      await setupNotificationChannelAsync();
      expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });

  describe('registerForPushNotificationsAsync', () => {
    it('returns null if not a physical device', async () => {
      mockIsDevice = false;
      const result = await registerForPushNotificationsAsync();
      expect(result).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('requests permission and registers push token when granted', async () => {
      mockIsDevice = true;
      Platform.OS = 'ios';

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
        data: 'ExpoPushToken[test-token-123]',
      });
      (apiClient.post as jest.Mock).mockResolvedValue({});

      const token = await registerForPushNotificationsAsync();

      expect(token).toBe('ExpoPushToken[test-token-123]');
      expect(apiClient.post).toHaveBeenCalledWith('/api/push/devices', {
        token: 'ExpoPushToken[test-token-123]',
        platform: 'ios',
      });
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        'jobvault_push_token',
        'ExpoPushToken[test-token-123]'
      );
    });

    it('returns null if permission is denied', async () => {
      mockIsDevice = true;
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'undetermined' });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

      const token = await registerForPushNotificationsAsync();

      expect(token).toBeNull();
      expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('unregisterPushTokenAsync', () => {
    it('calls DELETE /api/push/devices/:token and clears storage', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('ExpoPushToken[test-token-123]');
      (apiClient.delete as jest.Mock).mockResolvedValue({});

      await unregisterPushTokenAsync();

      expect(apiClient.delete).toHaveBeenCalledWith(
        `/api/push/devices/${encodeURIComponent('ExpoPushToken[test-token-123]')}`
      );
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('jobvault_push_token');
    });

    it('does nothing if no token is stored', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await unregisterPushTokenAsync();

      expect(apiClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('getPushStatusAsync', () => {
    it('returns permission status from notifications module', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
      const status = await getPushStatusAsync();
      expect(status).toBe('granted');
    });
  });

  describe('getStoredPushTokenAsync', () => {
    it('retrieves token from SecureStore', async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('token-abc');
      const token = await getStoredPushTokenAsync();
      expect(token).toBe('token-abc');
    });
  });
});
