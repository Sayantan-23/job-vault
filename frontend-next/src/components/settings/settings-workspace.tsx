'use client'

import Link from 'next/link'
import { Sun, Moon, Monitor } from 'lucide-react'
import { PageHeading } from '@/components/layout/app/page-heading'
import { AppPage } from '@/components/layout/app/app-page'
import { Button } from '@/components/ui/button'
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control'
import { SettingsCard } from './settings-card'
import { ConnectedAppsSection } from './connected-apps-section'
import { useTheme } from '@/hooks/use-theme'
import { useCurrentUser, useLogout } from '@/hooks/use-auth'
import type { Theme } from '@/lib/theme'

const THEME_OPTIONS: ReadonlyArray<SegmentedOption<Theme>> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm text-foreground">{value}</span>
    </div>
  )
}

export function SettingsWorkspace() {
  const { theme, setTheme } = useTheme()
  const { data: user } = useCurrentUser()
  const logout = useLogout()

  return (
    <AppPage width="default">
      <PageHeading title="Settings" description="Manage how JobVault looks and your account." />
      {/* A single, readable column of section cards with even spacing between
          them. (Sections have very uneven heights, so a multi-column grid left
          awkward gaps — a single column keeps the rhythm clean.) */}
      <div className="space-y-4">
          <SettingsCard
            title="Appearance"
            description="Choose your theme. System follows your device’s light/dark setting."
          >
            <SegmentedControl<Theme>
              value={theme}
              onValueChange={setTheme}
              options={THEME_OPTIONS}
              aria-label="Theme"
            />
          </SettingsCard>

          <SettingsCard
            title="Account"
            description="Your sign-in details. Edit your full profile to change them."
          >
            <div className="divide-y divide-border">
              <Field label="Name" value={user?.name?.trim() || '—'} />
              <Field label="Email" value={user?.email || '—'} />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4">
              <Link
                href="/app/profile"
                className="text-sm font-medium text-primary underline-offset-2 hover:underline"
              >
                Edit profile →
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                {logout.isPending ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </SettingsCard>

          <ConnectedAppsSection />

          <SettingsCard
            title="Notifications"
            description="How JobVault reaches you about reminders and ghosted applications."
          >
            <p className="text-sm text-foreground">
              In-app notifications are <span className="font-medium">on</span> — reminders and ghost
              alerts appear in the bell and update in real time.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Email notifications are coming soon.</p>
          </SettingsCard>
      </div>
    </AppPage>
  )
}
