import { useState } from 'react'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
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
    <div className="space-y-5 p-5">
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl leading-tight">Save jobs in one click</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Connect JobVault to save postings straight from the page you’re on — title, company and the full
          description, deduplicated into your board.
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge>LinkedIn</Badge>
        <Badge>Indeed</Badge>
        <Badge>Naukri</Badge>
        <Badge>and more</Badge>
      </div>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Button onClick={connect} disabled={busy} className="w-full">
          {busy ? (
            <>
              <Spinner /> Connecting…
            </>
          ) : (
            'Connect with JobVault'
          )}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          New here? You’ll create your account in the next step.
        </p>
      </div>
    </div>
  )
}
