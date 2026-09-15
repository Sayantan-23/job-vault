import { Tabs } from 'expo-router/tabs';

import { TabBar } from '@/components/tab-bar';
import { useTheme } from '@/hooks/use-theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.tabBar },
      }}
      tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="answers" />
      <Tabs.Screen name="vault" />
      <Tabs.Screen name="activity" />
    </Tabs>
  );
}
