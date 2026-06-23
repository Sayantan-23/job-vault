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
    <div className="space-y-5 p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success/12 text-success">
        <CheckIcon className="size-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="font-serif text-2xl leading-tight">
          {result.isDuplicate ? 'Already in JobVault' : 'Saved to JobVault'}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{result.title}</span>
          {result.company ? ` · ${result.company}` : ''}
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
