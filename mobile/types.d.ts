// expo/types declares the asset and CSS modules Metro resolves. Expo regenerates
// expo-env.d.ts with the same reference, but that file is gitignored, so declare
// it here too and typecheck works on a fresh clone. `className` on the React
// Native prop interfaces comes from nativewind-env.d.ts, which react-native-css
// generates and owns.
/// <reference types="expo/types" />
/// <reference types="jest" />
