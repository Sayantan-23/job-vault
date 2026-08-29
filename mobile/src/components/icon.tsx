import { useCssElement } from 'react-native-css';
import type { LucideIcon, LucideProps } from 'lucide-react-native';

export type IconProps = Omit<LucideProps, 'color'> & {
  icon: LucideIcon;
  className?: string;
};

/**
 * Lucide icon that takes its colour from a Tailwind text-* class, so icons use
 * the same tokens as everything else instead of a second colour palette in JS.
 * Lucide draws with `stroke`, so the resolved `color` is mapped onto that prop
 * rather than written into a style object.
 */
export function Icon({ icon: Glyph, ...props }: IconProps) {
  return useCssElement(Glyph, props, {
    className: { target: false, nativeStyleMapping: { color: 'stroke' } },
  });
}
