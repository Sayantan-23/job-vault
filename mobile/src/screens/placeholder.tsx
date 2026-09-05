import { useRef } from 'react';
import { Text, View } from 'react-native-css/components';
import Animated from 'react-native-reanimated';
import { BlurTargetView } from 'expo-blur';
import { Plus } from 'lucide-react-native';

import { AppHeader } from '@/components/app-header';
import { BlurTargetProvider } from '@/components/ui/blur-target';
import { SpeedDial } from '@/components/ui/speed-dial';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import { SCREEN_BOTTOM_INSET } from '@/theme';

export type PlaceholderProps = {
  title: string;
  note: string;
  /** Accessibility label for the FAB. Omit on screens that have no primary action. */
  action?: string;
};

// ponytail: stand-in body so the shell is scrollable and screenshot-able before
// C3/C4/C6/C8 replace it with the real screens. Delete it with the last one.
const ROWS = Array.from({ length: 14 }, (_, i) => i);

export function Placeholder({ title, note, action }: PlaceholderProps) {
  const { hidden, onScroll } = useHideOnScroll();
  const blurTargetRef = useRef<any>(null);

  return (
    // The screen is painted in the tab bar's colour; the content sits on top with
    // rounded bottom corners, so the bar's surface shows through at the two
    // corners and reads as OS chrome (d-0cd3wr amendment). The FAB stays outside
    // the clipped wrapper so it keeps its verified geometry.
    <BlurTargetProvider blurTarget={blurTargetRef}>
      <View className="flex-1 bg-tab-bar">
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <View className="flex-1 overflow-hidden rounded-b-[20px] bg-background">
            <AppHeader title={title} />
            <Animated.ScrollView
              onScroll={onScroll}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_INSET }}>
              {ROWS.map((row) => (
                <View key={row} className="border-b border-hairline px-5 py-4">
                  <Text className="text-[15px] text-foreground">{note}</Text>
                  <Text className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {`row ${String(row + 1).padStart(2, '0')}`}
                  </Text>
                </View>
              ))}
            </Animated.ScrollView>
          </View>
        </BlurTargetView>
        {action ? (
          <SpeedDial
            hidden={hidden}
            accessibilityLabel={action}
            actions={{
              icon: Plus,
              label: action,
              onPress: () => {},
            }}
            blurTarget={blurTargetRef}
          />
        ) : null}
      </View>
    </BlurTargetProvider>
  );
}

