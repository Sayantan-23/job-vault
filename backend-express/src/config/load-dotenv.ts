import { config } from 'dotenv'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Loads the REPO-ROOT .env — the single source of truth (see /.env.example).
//
// Deliberately not `import 'dotenv/config'`, which reads backend-express/.env.
// Under Docker, compose already sets the environment, and dotenv never
// overwrites a variable that is already present in process.env — so a second
// env file next to the app can only ever shadow the real one, silently. That
// is how a valid GEMINI_API_KEY once sat in backend-express/.env while the API
// reported AI as disabled.
//
// Resolved from this module's own location, not process.cwd(), so it behaves
// the same under tsx, vitest, drizzle-kit and a compiled dist/ build. Inside
// the container the path does not exist and this is a harmless no-op.
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

config({ path: resolve(repoRoot, '.env'), quiet: true })
