/**
 * PendoBridge — provider slot for Pendo install & wiring.
 *
 * Currently a pass-through: the Pendo agent is loaded by the snippet in
 * index.html, initialized once in src/main.tsx, and identified / cleared via
 * src/pendo/pendoIdentity.ts — none of which needs React context. The
 * component is kept because its position in the App.tsx provider stack is
 * fixed per FND-07, so future React-side Pendo wiring can land here without
 * touching the provider tree.
 */

import type { ReactNode } from 'react'

export function PendoBridge({ children }: { children: ReactNode }) {
  return <>{children}</>
}
