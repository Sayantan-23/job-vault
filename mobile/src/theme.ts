/**
 * Shell geometry. Colours are NOT here — they live in src/global.css, ported
 * from frontend-next/src/styles/app/theme.css under the same token names, and
 * are consumed as NativeWind classNames. Only values that CSS cannot express
 * (layout maths shared between the bar, the FAB and screen padding) belong here.
 */

/** Height of the tab bar above the bottom safe-area inset. */
export const TAB_BAR_HEIGHT = 60;

/** Diameter of the floating action button (d-0cd3wr: raised clear of the bar). */
export const FAB_SIZE = 56;

/** Gap between the top edge of the tab bar and the bottom of the FAB. */
export const FAB_GAP = 16;

/** Bottom padding a scrolling screen needs so content clears bar + FAB. */
export const SCREEN_BOTTOM_INSET = TAB_BAR_HEIGHT + FAB_GAP + FAB_SIZE;
