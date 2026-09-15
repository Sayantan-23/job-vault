import { Text, View } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { cn } from './cn';

/**
 * Deterministic, on-brand tints so a given name always maps to the same swatch —
 * a generated monogram, stable per user rather than random.
 */
const LIGHT_PALETTE = [
  { bgClass: 'bg-[#e0e7ff]', textClass: 'text-[#4338ca]', bg: '#e0e7ff', text: '#4338ca' }, // indigo
  { bgClass: 'bg-[#ffe4e6]', textClass: 'text-[#be123c]', bg: '#ffe4e6', text: '#be123c' }, // rose
  { bgClass: 'bg-[#fef3c7]', textClass: 'text-[#92400e]', bg: '#fef3c7', text: '#92400e' }, // amber
  { bgClass: 'bg-[#d1fae5]', textClass: 'text-[#047857]', bg: '#d1fae5', text: '#047857' }, // emerald
  { bgClass: 'bg-[#e0f2fe]', textClass: 'text-[#0369a1]', bg: '#e0f2fe', text: '#0369a1' }, // sky
  { bgClass: 'bg-[#ede9fe]', textClass: 'text-[#6d28d9]', bg: '#ede9fe', text: '#6d28d9' }, // violet
] as const;

const DARK_PALETTE = [
  { bgClass: '', textClass: '', bg: '#26294a', text: '#a5b4fc' }, // indigo
  { bgClass: '', textClass: '', bg: '#451c24', text: '#fda4af' }, // rose
  { bgClass: '', textClass: '', bg: '#432b14', text: '#fcd34d' }, // amber
  { bgClass: '', textClass: '', bg: '#13382c', text: '#6ee7b7' }, // emerald
  { bgClass: '', textClass: '', bg: '#11324d', text: '#7dd3fc' }, // sky
  { bgClass: '', textClass: '', bg: '#342054', text: '#c4b5fd' }, // violet
] as const;

function swatchFor(seed: string, isDark: boolean) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  return palette[Math.abs(hash) % palette.length] ?? palette[0];
}

export type MonogramAvatarProps = { name: string; className?: string };

export function MonogramAvatar({ name, className }: MonogramAvatarProps) {
  const { effectiveTheme } = useTheme() ?? {};
  const isDark = effectiveTheme === 'dark';
  const seed = name.trim() || '?';
  const initial = seed.charAt(0).toUpperCase();
  const swatch = swatchFor(seed, isDark);

  return (
    <View
      className={cn(
        'size-8 shrink-0 items-center justify-center rounded-md',
        !isDark && swatch.bgClass,
        className
      )}
      style={isDark ? { backgroundColor: swatch.bg } : undefined}>
      <Text
        className={cn('font-sans-medium text-sm text-center', !isDark && swatch.textClass)}
        style={{
          includeFontPadding: false,
          textAlignVertical: 'center',
          ...(isDark ? { color: swatch.text } : {}),
        }}>
        {initial}
      </Text>
    </View>
  );
}
