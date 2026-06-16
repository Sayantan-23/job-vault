import type { Metadata } from 'next'
import { SettingsWorkspace } from '@/components/settings/settings-workspace'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  // Theme comes from the cookie-backed ThemeProvider and account details from
  // the already-cached current-user query, so no server fetch is needed here.
  return <SettingsWorkspace />
}
