import { THEME_SCRIPT } from '@/lib/theme'

// Blocking inline script rendered as the first child of <body> so the correct
// `.dark` class is set before the browser paints — prevents a light-mode flash
// on load for users whose theme (or OS) is dark.
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
}
