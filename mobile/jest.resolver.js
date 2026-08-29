const reactNativeResolver = require('@react-native/jest-preset/jest/resolver');

/**
 * react-native-worklets ships `.native.ts` modules that reach for a real native
 * binding; under Jest the non-native variant is the one that works. This is
 * react-native-worklets/jest/resolver.js, delegating to React Native's resolver
 * instead of Jest's default so the preset's own resolution still applies.
 *
 * @type {import('jest-resolve').SyncResolver}
 */
module.exports = (request, options) => {
  if (
    options.basedir.includes('react-native-worklets') ||
    request.includes('react-native-worklets')
  ) {
    options = {
      ...options,
      extensions: options.extensions?.filter((ext) => !ext.includes('native')),
    };
  }

  return reactNativeResolver(request, options);
};
