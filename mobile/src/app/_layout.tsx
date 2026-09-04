import '@/global.css';

import { useEffect } from 'react';
import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold } from '@expo-google-fonts/geist';
import { GeistMono_400Regular, GeistMono_500Medium } from '@expo-google-fonts/geist-mono';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { hydrateSession } from '@/lib/auth';
import { getQueryClient } from '@/lib/query-client';
import { useSession } from '@/lib/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    Newsreader_400Regular,
  });
  const session = useSession();
  const signedIn = session.status === 'signedIn';

  useEffect(() => {
    void hydrateSession();
  }, []);

  // The splash covers the keychain read as well as the fonts, so neither the
  // tabs nor the login screen is ever shown to be replaced a frame later.
  const ready = fontsLoaded && session.status !== 'loading';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={getQueryClient()}>
        <StatusBar style="auto" />
        {/* `Stack.Protected` is expo-router's own guard: a false `guard` removes
            those routes from the tree entirely, and a user standing on one is
            navigated out. So signing in or out needs no imperative navigation —
            flipping the session store is the navigation. */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="(tabs)" />
            {/* Full-screen detail route, sibling of (tabs) at the root Stack so
                the tab bar is hidden. Lives under the same signedIn guard — a
                signed-out user standing on a deep link is navigated out by the
                Stack.Protected gate. */}
            <Stack.Screen name="jobs" options={{ headerShown: false }} />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
          {/* Dev surface, deliberately outside the guard: a device pass over the
              primitives should not need an account. */}
          <Stack.Screen name="gallery" />
        </Stack>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
