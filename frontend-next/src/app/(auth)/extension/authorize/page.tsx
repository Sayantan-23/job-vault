import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AuthorizeFlow } from '@/components/extension/authorize-flow'

export const metadata: Metadata = { title: 'Connect the extension' }

// Public page (outside /app, so middleware doesn't gate it): the Chrome
// extension opens it via chrome.identity.launchWebAuthFlow. useSearchParams
// requires a Suspense boundary under the App Router.
export default function ExtensionAuthorizePage() {
  return (
    <Suspense fallback={null}>
      <AuthorizeFlow />
    </Suspense>
  )
}
