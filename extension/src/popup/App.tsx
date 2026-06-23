import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getToken, getSettings, clearToken } from '@/lib/storage'
import { verifyKey, type QuickCreateResult } from '@/lib/api'
import { ConnectView } from './views/ConnectView'
import { CaptureView } from './views/CaptureView'
import { SuccessView } from './views/SuccessView'
import { SettingsView } from './views/SettingsView'
import { Spinner } from './ui/Spinner'
import { TopBar } from './ui/TopBar'

type Screen =
  | { name: 'loading' }
  | { name: 'connect' }
  | { name: 'capture'; email: string | null }
  | { name: 'success'; result: QuickCreateResult; serverUrl: string }
  | { name: 'settings'; email: string | null }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'loading' })

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
      setScreen({ name: 'capture', email: verified.user.email })
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
    case 'capture':
      return (
        <CaptureView
          onSaved={(result, serverUrl) => setScreen({ name: 'success', result, serverUrl })}
          onSettings={() => setScreen({ name: 'settings', email: screen.email })}
        />
      )
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
