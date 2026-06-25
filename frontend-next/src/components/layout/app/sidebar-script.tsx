import { SIDEBAR_SCRIPT } from '@/lib/sidebar'

// Blocking inline script rendered ahead of the app tree so the `data-sidebar`
// attribute is set on <html> before first paint — prevents an expand→collapse
// flash for users who collapsed the rail.
export function SidebarScript() {
  return <script dangerouslySetInnerHTML={{ __html: SIDEBAR_SCRIPT }} />
}
