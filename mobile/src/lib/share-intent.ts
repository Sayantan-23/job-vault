import { isRunningInExpoGo } from 'expo';

export interface ParsedShareIntent {
  url?: string;
  rawText?: string;
}

export function isShareIntentSupported(): boolean {
  const isTesting =
    process.env.JEST_WORKER_ID !== undefined ||
    process.env.NODE_ENV?.toLowerCase() === 'test';
  if (isTesting) {
    return true;
  }
  return !isRunningInExpoGo();
}

/**
 * Extracts URL and plain text from an incoming share intent payload.
 * Supports links sent directly via webUrl or embedded within text (e.g. from LinkedIn or browser).
 */
export function parseShareIntent(shareIntent?: {
  webUrl?: string | null;
  text?: string | null;
} | null): ParsedShareIntent | null {
  if (!shareIntent) return null;

  const webUrl = shareIntent.webUrl?.trim();
  if (webUrl && /^https?:\/\//i.test(webUrl)) {
    return {
      url: webUrl,
      rawText: shareIntent.text?.trim() || undefined,
    };
  }

  if (shareIntent.text) {
    const trimmed = shareIntent.text.trim();
    const match = trimmed.match(/https?:\/\/[^\s]+/i);
    if (match) {
      return {
        url: match[0].trim(),
        rawText: trimmed,
      };
    }
    if (trimmed.length > 0) {
      return {
        rawText: trimmed,
      };
    }
  }

  return null;
}
