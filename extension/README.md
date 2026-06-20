# JobVault Chrome Extension

One-click "Save to JobVault" from LinkedIn, Indeed, and most job boards. Part of
Slice 8 — see `docs/superpowers/plans/2026-06-20-slice-8-chrome-extension.md`.

> **Status: work in progress.** The logic core (extractors, detector, confidence,
> storage, API client, auth helpers) is implemented and unit-tested. The popup UI,
> background service worker, MV3 manifest, and crxjs build are next.

## Stack

React 19 + Vite + Tailwind v4 + TypeScript, built to a Manifest V3 bundle with
`@crxjs/vite-plugin`. Auth uses the one-click `chrome.identity.launchWebAuthFlow`
connect flow against the JobVault web app's `/extension/authorize` page, storing a
revocable `X-API-Key` token in `chrome.storage.local`.

## Commands

```bash
npm install
npm run typecheck
npm test          # vitest (logic units; jsdom)
npm run build     # vite build → dist/ (load unpacked) — pending the UI/manifest layer
```

## Load unpacked (once the build layer lands)

1. `npm run build`
2. Chrome → `chrome://extensions` → enable Developer mode → **Load unpacked** → `dist/`.
3. Click the toolbar icon → **Connect with JobVault** (creates an account inline if needed).

The extension talks to the backend directly (default `http://localhost:3100`,
configurable in the popup's Settings). Release/packaging (Web Store) is deferred —
see `docs/deferred-tasks.md`.
