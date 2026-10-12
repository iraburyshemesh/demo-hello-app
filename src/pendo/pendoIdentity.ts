/**
 * Pendo identity helpers — the single place Halo's auth records are mapped
 * onto Pendo visitor / account metadata.
 *
 * Lifecycle (the agent itself is loaded by the install snippet in index.html):
 *   - `pendo.initialize` runs exactly once per page load, anonymously, in
 *     src/main.tsx. Never call it again — the agent ignores repeat calls.
 *   - `identifyPendoVisitor` runs whenever a signed-in identity appears or
 *     changes: session restore at boot (src/main.tsx), sign-in and signup
 *     completion (`authStore.setSession`), and Settings profile / workspace
 *     saves.
 *   - `clearPendoSession` runs whenever the session is destroyed: sign-out
 *     (`authStore.signOut`) and Reset demo data.
 *
 * Imports auth TYPES only: authStore.ts imports this module, so a runtime
 * import back into src/auth would create a cycle.
 */

import { K, readWithSchema, SessionSchema } from '../storage'
import type { Session, Visitor, Workspace } from '../auth/types'

/**
 * Identify the signed-in visitor, with their workspace as the Pendo account.
 * Safe to call repeatedly — each call re-sends the full metadata set, which
 * is how Settings edits reach Pendo without a page reload.
 */
export function identifyPendoVisitor(visitor: Visitor, workspace: Workspace): void {
  // `signedInAt` lives only on the persisted session record. Skip it if that
  // record belongs to someone else (another tab has signed in since).
  const session = readWithSchema<Session | null>(K.session(), SessionSchema, null)
  const signedInAt = session?.visitorId === visitor.id ? session.signedInAt : null

  pendo.identify({
    visitor: {
      id: visitor.id,
      email: visitor.email,
      full_name: `${visitor.firstName} ${visitor.lastName}`.trim(),
      firstName: visitor.firstName,
      lastName: visitor.lastName,
      username: visitor.username,
      jobTitle: visitor.jobTitle,
      role: visitor.role,
      yearsExperience: visitor.yearsExperience,
      location: visitor.location,
      primaryUseCase: visitor.primaryUseCase,
      teamSize: visitor.teamSize,
      topGoals: visitor.topGoals,
      createdAt: visitor.createdAt,
      workspaceId: workspace.id,
      ...(signedInAt === null ? {} : { signedInAt }),
    },
    account: {
      id: workspace.id,
      name: workspace.companyName,
      companyName: workspace.companyName,
      companySize: workspace.companySize,
      industry: workspace.industry,
      planTier: workspace.planTier,
      createdAt: workspace.createdAt,
    },
  })
}

/**
 * Reset Pendo to a fresh anonymous visitor so the next person to use this
 * browser is not tracked as the previous one.
 *
 * `clearSession` is not among the methods the install snippet stubs, so it
 * does not exist until the agent script has loaded (or ever, if an ad blocker
 * stops it). Call it only when present — a throw here would abort the
 * sign-out it is attached to.
 */
export function clearPendoSession(): void {
  pendo.clearSession?.()
}
