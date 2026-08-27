import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getToken, getSettings, clearToken } from '@/lib/storage'
import { verifyKey, type QuickCreateResult } from '@/lib/api'
import { ConnectView } from './views/ConnectView'
import { CaptureView } from './views/CaptureView'
import { AnswersView } from './views/AnswersView'
import { SuccessView } from './views/SuccessView'
import { SettingsView } from './views/SettingsView'
import { Spinner } from './ui/Spinner'
import { Tabs } from './ui/Tabs'
import { TopBar } from './ui/TopBar'
import { readPage, type PageRead } from './capture'

type Screen =
  | { name: 'loading' }
  | { name: 'connect' }
  | { name: 'capture'; email: string | null; page: PageRead }
  | { name: 'success'; result: QuickCreateResult; serverUrl: string }
  | { name: 'settings'; email: string | null }

const UNREADABLE_PAGE: PageRead = {
  job: { title: '', company: '', sourceUrl: '', platform: 'generic', confidence: 'empty' },
  fields: [],
  tabId: null,
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' })
  const [tab, setTab] = useState<'job' | 'answers'>('job')

  // Resolve the entry screen from stored state: no token → connect; a valid
  // token → capture; a revoked/invalid token → clear and connect.
  const refresh = useCallback(async () => {
    setScreen({ name: 'loading' })
    const token = await getToken()
    if (!token) {
      setScreen({ name: 'connect' })
      return
    }
    const { serverUrl } = await getSettings()
    try {
      const verified = await verifyKey(serverUrl, token)
      // One injected pass reads both signals; the page context only picks which
      // tab opens active — both tabs always render. A page we cannot read
      // (chrome://, a scrape that fails) is not a bad key, so it must not fall
      // into the clearToken path — CaptureView takes it from here with manual entry.
      const page = await readPage(serverUrl, token).catch(() => UNREADABLE_PAGE)
      setTab(page.fields.length > 0 ? 'answers' : 'job')
      setScreen({ name: 'capture', email: verified.user.email, page })
    } catch {
      await clearToken()
      setScreen({ name: 'connect' })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  switch (screen.name) {
    case 'loading':
      return (
        <div>
          <TopBar />
          <Centered>
            <Spinner className="text-primary" />
          </Centered>
        </div>
      )
    case 'connect':
      return <ConnectView onConnected={() => void refresh()} />
    case 'capture': {
      const onSettings = () => setScreen({ name: 'settings', email: screen.email })
      return (
        <div>
          <Tabs
            items={[
              { id: 'job', label: 'Save job' },
              { id: 'answers', label: 'Answers' },
            ]}
            active={tab}
            onChange={(id) => setTab(id as 'job' | 'answers')}
          />
          {tab === 'job' ? (
            <CaptureView
              page={screen.page}
              onSaved={(result, serverUrl) => setScreen({ name: 'success', result, serverUrl })}
              onSettings={onSettings}
            />
          ) : (
            <AnswersView fields={screen.page.fields} tabId={screen.page.tabId} onSettings={onSettings} />
          )}
        </div>
      )
    }
    case 'success':
      return <SuccessView result={screen.result} serverUrl={screen.serverUrl} onDone={() => void refresh()} />
    case 'settings':
      return (
        <SettingsView
          email={screen.email}
          onBack={() => void refresh()}
          onDisconnected={() => setScreen({ name: 'connect' })}
        />
      )
  }
}

function Centered({ children }: { children: ReactNode }) {
  return <div className="flex h-40 items-center justify-center">{children}</div>
}
