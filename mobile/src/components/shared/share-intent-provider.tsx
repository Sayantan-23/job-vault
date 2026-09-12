import { useState, type ReactNode } from 'react';

import { isShareIntentSupported, parseShareIntent } from '@/lib/share-intent';
import { AddJobSheet } from '@/components/jobs/add-job-sheet';

/**
 * Native listener component, dynamically evaluated only when running outside
 * Expo Go. Expo Go does not include the native expo-share-intent module.
 */
function NativeShareIntentListener() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useShareIntent } = require('expo-share-intent');
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  const [dismissed, setDismissed] = useState(false);
  const [prevIntent, setPrevIntent] = useState<unknown>(null);

  if (hasShareIntent && shareIntent && prevIntent !== shareIntent) {
    setPrevIntent(shareIntent);
    setDismissed(false);
  }

  const parsed = hasShareIntent && shareIntent ? parseShareIntent(shareIntent) : null;
  const capturedUrl = parsed?.url ?? null;
  const sheetOpen = Boolean(capturedUrl && !dismissed);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDismissed(true);
      try {
        resetShareIntent();
      } catch {
        // Safe fallback if reset fails
      }
    }
  };

  return (
    <AddJobSheet
      open={sheetOpen}
      onOpenChange={handleOpenChange}
      initialUrl={capturedUrl ?? undefined}
      autoFetch={true}
    />
  );
}

export function ShareIntentProvider({ children }: { children?: ReactNode }) {
  if (!isShareIntentSupported()) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <NativeShareIntentListener />
    </>
  );
}
