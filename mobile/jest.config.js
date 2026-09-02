const { transform } = require('jest-expo/jest-preset');

/**
 * jest-expo's preset, with three additions:
 *  - `haste.defaultPlatform` is android, because mobile is Android-first (d-0cc2w5),
 *    so a `.android.tsx` variant is the one under test.
 *  - `lucide-react-native` and `marked` join the transform allowlist and `.mjs`
 *    joins the transform map: under the `react-native` export condition lucide
 *    resolves to an ESM `.mjs` bundle, and `marked` ships as ESM, both of which
 *    the preset neither allows nor knows how to parse.
 *  - a resolver that keeps react-native-worklets off its `.native` modules, which
 *    expect a real native binding.
 *
 * @type {import('jest').Config}
 */
module.exports = {
  preset: 'jest-expo',
  haste: { defaultPlatform: 'android', platforms: ['android', 'ios', 'native'] },
  resolver: '<rootDir>/jest.resolver.js',
  transform: { ...transform, '\\.mjs$': transform['\\.[jt]sx?$'] },
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|lucide-react-native|marked))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
};
