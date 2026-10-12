import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import '@mantine/notifications/styles.css'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { runMigrations } from './storage'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { useAuthStore } from './auth'
import { identifyPendoVisitor } from './pendo/pendoIdentity'

// Run storage migrations synchronously BEFORE React mounts.
// This ensures halo:v1:meta is written and any schema upgrades are applied
// before any component attempts to read from localStorage.
// Note: called at module-init time (not in useEffect), so StrictMode double-mount
// does not affect it. The runner is idempotent — safe to call multiple times.
runMigrations()

// Register the dayjs UTC plugin at app boot — Phase 4 plan 06 (gap closure for
// CR-01 / CR-02 per 04-REVIEW.md). All ISO timestamps in Halo storage are
// UTC-anchored (`*.toISOString()` writes); read-side formatters use
// `dayjs(value).utc().format(...)` / `dayjs.utc(value).format(...)` to display
// those instants in the timezone they were intended for (the *day* the user
// picked), independent of the browser's local timezone. The plugin ships
// inside the dayjs ^1.11.20 package — no new dependency.
//
// Idempotent: dayjs.extend is safe to call multiple times.
dayjs.extend(utc)

// Boot Pendo exactly once per page load, before React renders (the agent
// ignores repeat initialize calls). The empty visitor id lets the agent resume
// the visitor it last saw, or start a new anonymous one; signed-in users are
// attached via identifyPendoVisitor. React Router SPA route changes are
// auto-detected by Pendo via History API hooks.
pendo.initialize({ visitor: { id: '' } })

// authStore restores a persisted session at module-init time — before this
// line runs — so a returning visitor is identified here, right after initialize.
const { currentVisitor, currentWorkspace } = useAuthStore.getState()
if (currentVisitor && currentWorkspace) {
  identifyPendoVisitor(currentVisitor, currentWorkspace)
}

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
