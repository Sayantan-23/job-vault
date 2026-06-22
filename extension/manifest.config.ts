import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'JobVault — Save jobs',
  version: '0.1.0',
  description: 'Save job postings from LinkedIn, Indeed and more to JobVault in one click.',
  // To pin the extension id (and its chromiumapp.org redirect) across reloads,
  // add a base64 `key` here and mirror the resulting id in the web app's
  // PINNED_EXTENSION_IDS allowlist. See README.
  action: { default_popup: 'src/popup/index.html', default_title: 'Save to JobVault' },
  background: { service_worker: 'src/background/service-worker.ts', type: 'module' },
  permissions: ['storage', 'activeTab', 'scripting', 'identity'],
  // Only the web-app origin (it serves /extension/authorize and proxies /api/* to
  // the backend). Live-DOM extraction needs NO host_permission for job sites — it
  // injects on demand into the active tab via activeTab+scripting on popup open.
  host_permissions: ['http://localhost:8080/*', 'http://127.0.0.1:8080/*'],
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
})
