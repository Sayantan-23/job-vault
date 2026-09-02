import Constants from 'expo-constants';

/**
 * Where the backend lives, resolved at runtime so one build works on an
 * emulator, a USB device and a Wi-Fi device with no per-machine config
 * (spec §2.2). Metro's `hostUri` has already solved exactly this problem:
 * it is `10.0.2.2` on an Android emulator and the machine's LAN IP on a
 * physical device. Compose publishes the API on all interfaces, so nothing
 * changes server-side.
 *
 * `EXPO_PUBLIC_API_URL` overrides it — for a production build, or a device on
 * another subnet after `adb reverse tcp:3100 tcp:3100`.
 */
export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ??
  `http://${Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost'}:3100`;
