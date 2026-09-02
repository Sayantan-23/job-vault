import { Text } from 'react-native-css/components';

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
  'bg-[#e0e7ff] text-[#4338ca]', // indigo
  'bg-[#ffe4e6] text-[#be123c]', // rose
  'bg-[#fef3c7] text-[#92400e]', // amber
  'bg-[#d1fae5] text-[#047857]', // emerald
  'bg-[#e0f2fe] text-[#0369a1]', // sky
  'bg-[#ede9fe] text-[#6d28d9]', // violet
] as const;

function swatchFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length] ?? PALETTE[0];
}

export type MonogramAvatarProps = { name: string; className?: string };

export function MonogramAvatar({ name, className }: MonogramAvatarProps) {
  const seed = name.trim() || '?';
  const initial = seed.charAt(0).toUpperCase();

  return (
    <Text
      className={cn(
        'size-8 shrink-0 rounded-md text-center font-sans-medium text-sm leading-8',
        swatchFor(seed),
        className
      )}>
      {initial}
    </Text>
  );
}
