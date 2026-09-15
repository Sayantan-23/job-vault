import type { ReactNode } from 'react';
import { Text, View } from 'react-native-css/components';

import { Card } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';

export interface ProfileSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ProfileSection({ title, description, action, children }: ProfileSectionProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <Card className="mb-4">
      <View className="flex-row items-start justify-between pb-3">
        <View className="min-w-0 flex-1 pr-2">
          <Text style={{ color: colors.foreground }} className="text-base font-semibold text-card-foreground">
            {title}
          </Text>
          {description ? (
            <Text style={{ color: colors.mutedForeground }} className="text-xs text-muted-foreground mt-0.5">
              {description}
            </Text>
          ) : null}
        </View>
        {action ? <View className="flex-shrink-0">{action}</View> : null}
      </View>
      <View className="pt-0">{children}</View>
    </Card>
  );
}
