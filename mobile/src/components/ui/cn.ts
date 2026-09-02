export type ClassValue = string | false | null | undefined;

/**
 * Joins class names, dropping falsy ones.
 *
 * The web's `cn` (frontend-next/src/lib/utils.ts) is clsx + tailwind-merge; this
 * one deliberately is not, because neither package is installed here and adding
 * dependencies is outside this lane. The consequence is real: without
 * tailwind-merge, a caller's `className` does not *replace* a conflicting base
 * class, it only competes with it, and react-native-css resolves the winner by
 * CSS specificity and stylesheet order rather than by string order. Primitives
 * here therefore never rely on being overridden — a variant that needs to differ
 * gets a variant, not an override.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
