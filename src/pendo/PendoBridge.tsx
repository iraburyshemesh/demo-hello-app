/**
 * PendoBridge — provider slot for Pendo install & wiring.
 *
 * The Pendo SDK integration has been removed, so this is currently a
 * pass-through. The component is kept because its position in the App.tsx
 * provider stack is fixed per FND-07 — preserving the slot means reinstating
 * the integration is a one-file change that leaves the provider tree alone.
 */

import type { ReactNode } from 'react'

export function PendoBridge({ children }: { children: ReactNode }) {
  return <>{children}</>
}
