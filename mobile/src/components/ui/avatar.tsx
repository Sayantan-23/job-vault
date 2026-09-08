import { Text, View } from 'react-native-css/components';

import { cn } from './cn';

/**
 * Deterministic, on-brand tints so a given name always maps to the same swatch —
 * a generated monogram, stable per user rather than random.
 *
 * The web writes these as Tailwind palette classes (`bg-indigo-100`). Here they
 * are the same hues as literal sRGB, for the same reason global.css resolves the
 * theme tokens by hand: Tailwind v4's default palette is oklch, and an oklch
 * value inside a custom property does not survive into this runtime.
 *
 * Dark counterparts are omitted on purpose — the runtime dark switch is t-0cdegw
 * and this stack cannot express conditional root variables yet.
 */
const PALETTE = [
  { bg: 'bg-[#e0e7ff]', text: 'text-[#4338ca]' }, // indigo
  { bg: 'bg-[#ffe4e6]', text: 'text-[#be123c]' }, // rose
  { bg: 'bg-[#fef3c7]', text: 'text-[#92400e]' }, // amber
  { bg: 'bg-[#d1fae5]', text: 'text-[#047857]' }, // emerald
  { bg: 'bg-[#e0f2fe]', text: 'text-[#0369a1]' }, // sky
  { bg: 'bg-[#ede9fe]', text: 'text-[#6d28d9]' }, // violet
] as const;

function swatchFor(seed: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? PALETTE[0];
}

export type MonogramAvatarProps = { name: string; className?: string };

export function MonogramAvatar({ name, className }: MonogramAvatarProps) {
  const seed = name.trim() || '?';
  const initial = seed.charAt(0).toUpperCase();
  const swatch = swatchFor(seed);

  return (
    <View
      className={cn(
        'size-8 shrink-0 items-center justify-center rounded-md',
        swatch.bg,
        className
      )}>
      <Text
        className={cn('font-sans-medium text-sm text-center', swatch.text)}
        style={{ includeFontPadding: false, textAlignVertical: 'center' }}>
        {initial}
      </Text>
    </View>
  );
}
