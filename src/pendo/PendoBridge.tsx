/**
 * PendoBridge — provider slot for Pendo install & wiring.
 *
 * Pendo is wired outside React, so this is a pass-through: the snippet in
 * index.html loads the agent, src/main.tsx calls `pendo.initialize` once
 * before the first render, and src/pendo/pendoIdentity.ts keeps the visitor
 * and account in step with the auth store. The component is kept because its
 * position in the App.tsx provider stack is fixed per FND-07 — preserving the
 * slot leaves the provider tree alone if Pendo wiring ever needs React.
 */

import type { ReactNode } from 'react'

export function PendoBridge({ children }: { children: ReactNode }) {
  return <>{children}</>
}
