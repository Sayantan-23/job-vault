import { useState } from 'react'
import { Button } from '../ui/Button'
import { Spinner } from '../ui/Spinner'
import { TopBar } from '../ui/TopBar'
import { CONNECT, type ConnectResponse } from '@/lib/messages'

export function ConnectView({ onConnected }: { onConnected: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function connect() {
    setBusy(true)
    setError(null)
    try {
      const res = (await chrome.runtime.sendMessage({ type: CONNECT })) as ConnectResponse
      if (res.ok) {
        onConnected()
        return
      }
      setError(res.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <TopBar />
      <div className="space-y-4 p-5">
        <div className="space-y-1">
          <h1 className="text-base font-semibold">Save jobs in one click</h1>
          <p className="text-sm text-muted-foreground">
            Connect JobVault to save postings from LinkedIn, Indeed and more. New here? You’ll create your
            account in the next step.
          </p>
        </div>
        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button onClick={connect} disabled={busy} className="w-full">
          {busy ? (
            <>
              <Spinner /> Connecting…
            </>
          ) : (
            'Connect with JobVault'
          )}
        </Button>
      </div>
    </div>
  )
}
