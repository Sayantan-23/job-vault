import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Field } from '../ui/Field'
import { getSettings, setSettings, clearToken } from '@/lib/storage'

interface Props {
  email: string | null
  onDisconnected: () => void
}

export function SettingsView({ email, onDisconnected }: Props) {
  const [serverUrl, setServerUrl] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void getSettings().then((s) => setServerUrl(s.serverUrl))
  }, [])

  async function saveUrl() {
    await setSettings({ serverUrl: serverUrl.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  async function disconnect() {
    await clearToken()
    onDisconnected()
  }

  return (
    <div className="space-y-5 p-5">
      <Field label="Connected account">
        <p className="truncate text-sm font-medium text-foreground">{email ?? '—'}</p>
      </Field>
      <Field label="Server URL">
        <Input
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="http://localhost:8080"
        />
      </Field>
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button variant="outline" onClick={saveUrl}>
          {saved ? 'Saved' : 'Save'}
        </Button>
        <Button variant="danger" onClick={disconnect}>
          Disconnect
        </Button>
      </div>
    </div>
  )
}
