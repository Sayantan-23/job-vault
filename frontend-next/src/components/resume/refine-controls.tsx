'use client'

import { useState } from 'react'
import { Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { RefineAction } from '@/types/cover-letter'

const PRESETS: ReadonlyArray<{ label: string; action: RefineAction }> = [
  { label: 'Humanize', action: 'humanize' },
  { label: 'Shorten', action: 'shorten' },
  { label: 'Make longer', action: 'lengthen' },
  { label: 'Fix grammar', action: 'fix-grammar' },
]

function RefineChip({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  )
}

// The "Improve with AI" trigger panel — the single place to steer the AI (preset
// chips or a custom instruction). Lives in the editor's side rail.
export function RefineControls({ busy, onRun }: { busy: boolean; onRun: (action: RefineAction, instructions?: string) => void }) {
  const [instructions, setInstructions] = useState('')
  const trimmed = instructions.trim()

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        Improve with AI
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <RefineChip key={preset.action} label={preset.label} disabled={busy} onClick={() => onRun(preset.action, trimmed || undefined)} />
        ))}
      </div>

      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) onRun('custom', trimmed)
        }}
      >
        <Input
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Tell the AI what to change…"
          aria-label="Custom AI instructions"
          disabled={busy}
        />
        <Button type="submit" size="sm" className="w-full" disabled={busy || !trimmed}>
          <Wand2 className="size-3.5" aria-hidden="true" />
          {busy ? 'Improving…' : 'Improve'}
        </Button>
      </form>
    </div>
  )
}
