/**
 * Pendo identity wiring — keeps the Pendo visitor and account in step with the
 * auth store.
 *
 * `pendo.initialize` runs exactly once, in src/main.tsx, with an anonymous
 * visitor. `syncPendoIdentity()` is called right after it and:
 *
 *   - identifies the session the auth store restored at module-init (page
 *     reload). This cannot live in `hydrateAuthFromStorage()`: that runs while
 *     main.tsx's imports are evaluated, before `pendo.initialize` has run;
 *   - re-identifies whenever the signed-in visitor or workspace changes —
 *     credential sign-in and signup completion (both via
 *     `authStore.setSession`) and Settings > Profile / Workspace saves;
 *   - resets Pendo to a fresh anonymous visitor on sign-out, so the next user
 *     is not tracked under the previous user's identity.
 *
 * Zustand calls subscribers synchronously inside `set`, so Pendo is updated
 * before the calling page navigates. The listener must never throw: it is
 * registered before React mounts, so it runs ahead of React's own subscribers
 * and a throw would stop them from seeing the update.
 */

import { useAuthStore, type Session, type Visitor, type Workspace } from '../auth'
import { K, readWithSchema, SessionSchema } from '../storage'

/** Send the signed-in visitor and their workspace (the Pendo account) to Pendo. */
function identifyVisitor(visitor: Visitor, workspace: Workspace): void {
  // signedInAt only lives on the persisted Session record, not in the store.
  const session = readWithSchema<Session | null>(K.session(), SessionSchema, null)

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
      signedInAt: session?.signedInAt,
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
 * Reset Pendo to a fresh anonymous visitor. `clearSession` is not stubbed by
 * the install snippet, so it is undefined until the agent has loaded (and for
 * good if the agent is blocked) — skip it then rather than let sign-out throw.
 */
export function clearPendoSession(): void {
  if (typeof pendo.clearSession === 'function') {
    pendo.clearSession()
  }
}

/** Call once, immediately after `pendo.initialize` (src/main.tsx). */
export function syncPendoIdentity(): void {
  const { currentVisitor, currentWorkspace } = useAuthStore.getState()
  if (currentVisitor !== null && currentWorkspace !== null) {
    identifyVisitor(currentVisitor, currentWorkspace)
  }

  useAuthStore.subscribe((state, prev) => {
    const { currentVisitor: visitor, currentWorkspace: workspace } = state
    if (visitor === prev.currentVisitor && workspace === prev.currentWorkspace) return

    if (visitor !== null && workspace !== null) {
      // Sign-in, signup completion, or a Settings > Profile / Workspace save.
      identifyVisitor(visitor, workspace)
    } else if (visitor === null && prev.currentVisitor !== null) {
      // Sign-out (authStore.signOut → clearSession).
      clearPendoSession()
    }
  })
}
