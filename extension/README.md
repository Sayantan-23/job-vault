# JobVault Chrome Extension

One-click "Save to JobVault" from LinkedIn, Indeed, and most job boards. Part of
Slice 8 — see `docs/superpowers/plans/2026-06-20-slice-8-chrome-extension.md`.

> **Status: implemented; pending a live browser smoke.** Logic core (extractors,
> detector, confidence, storage, API client, auth helpers), the popup UI (Connect /
> Capture / Success / Settings), the background connect flow, the MV3 manifest, and
> the crxjs build are all done and green (typecheck + 22 vitest tests + `vite build`).
> Next: load it unpacked and smoke the real connect + capture flows.

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

## Load unpacked

1. Make sure the JobVault stack is running (web app on `http://localhost:8080`,
   backend on `http://localhost:3100`).
2. `npm install && npm run build`
3. Chrome → `chrome://extensions` → enable Developer mode → **Load unpacked** → `dist/`.
4. Click the toolbar icon → **Connect with JobVault** (creates an account inline if needed).
5. On a LinkedIn/Indeed job page, open the popup and **Save to JobVault**. If a job
   tab was open *before* you installed the extension, reload it once so the content
   script is present.

### Pinning the extension id (recommended)

The connect redirect (`https://<extension-id>.chromiumapp.org/`) depends on the id.
To keep it stable across reloads — and to lock the web app's redirect allowlist to
this extension — add a `key` to `manifest.config.ts` and put the resulting id in
`frontend-next/src/lib/extension-authorize.ts` (`PINNED_EXTENSION_IDS`). Until then
the web app accepts any `*.chromiumapp.org` https redirect (dev-only).

The extension points at the JobVault **web app** (default `http://localhost:8080`,
configurable in the popup's Settings) — it serves the `/extension/authorize` page
and proxies `/api/*` to the backend, so one origin covers everything. Release/
packaging (Web Store) is deferred — see `docs/deferred-tasks.md`.
