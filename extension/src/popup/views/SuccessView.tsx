import { Button } from '../ui/Button'
import { CheckIcon, ExternalLinkIcon } from '../ui/icons'
import type { QuickCreateResult } from '@/lib/api'

interface Props {
  result: QuickCreateResult
  serverUrl: string
  onDone: () => void
}

export function SuccessView({ result, serverUrl, onDone }: Props) {
  function open() {
    chrome.tabs.create({ url: `${serverUrl}/app/jobs?job=${result.id}` })
  }
  return (
    <div className="space-y-4 p-6 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CheckIcon className="size-6" />
      </div>
      <div className="space-y-1">
        <h1 className="text-base font-semibold">
          {result.isDuplicate ? 'Already in JobVault' : 'Saved to JobVault'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {result.title} · {result.company}
        </p>
      </div>
      <div className="space-y-2">
        <Button onClick={open} className="w-full">
          Open in JobVault <ExternalLinkIcon className="size-3.5" />
        </Button>
        <Button variant="ghost" onClick={onDone} className="w-full">
          Done
        </Button>
      </div>
    </div>
  )
}
