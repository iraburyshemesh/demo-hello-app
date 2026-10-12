/**
 * Pendo Track Events — typed, failure-safe facade over the agent's
 * `pendo.track()` API.
 *
 * Call sites read exactly like the agent API:
 *
 *   import { pendo } from '../pendo/track'
 *   pendo.track('task_created', { priority: 'high' })
 *
 * but each call is forwarded to the global agent (`window.pendo`) only when it
 * is present. The Pendo SDK integration is currently removed (PendoBridge is a
 * pass-through), so until Phase 6 reinstates it every call is a silent no-op.
 * A throw inside the agent is caught and logged, never propagated — tracking
 * must not break the user flow that emitted the event.
 *
 * Event names are Pendo track types matched verbatim (case-sensitive) by Pendo
 * analytics: never re-case or reword an entry in PENDO_TRACK_EVENTS. A new
 * event is registered here first; TypeScript then rejects call-site typos.
 *
 * Property rules:
 *   - No visitorId / accountId — the agent attaches both to every event. In
 *     Halo the Pendo account is the workspace, so no workspaceId either.
 *   - No PII (emails, names, credentials) and no free-text form content (task
 *     titles, descriptions, chat messages); cap the few free-form strings that
 *     are sent on purpose (error messages, help search queries).
 *   - The serialized properties must stay under Pendo's 512-byte limit.
 */

export const PENDO_TRACK_EVENTS = [
  // Signup wizard + sign-in
  'signup_step_completed',
  'signup_completed',
  'signup_failed',
  'signup_duplicate_account_detected',
  'user_signed_in',
  'user_sign_in_failed',
  // Lists
  'task_created',
  'task_updated',
  'task_completed',
  'task_reopened',
  'task_deleted',
  'task_filters_applied',
  // Reports
  'report_csv_exported',
  'report_filters_applied',
  // Team
  'teammate_invited',
  'teammate_role_changed',
  // Settings
  'profile_updated',
  'workspace_settings_updated',
  'plan_tier_changed',
  'demo_data_reset',
  // Help
  'help_search_performed',
  // Agent chat
  'ai_chat_message_sent',
  'ai_chat_response_received',
  'ai_chat_response_failed',
  'ai_chat_conversation_cleared',
] as const

/** Union of every registered Pendo track-event name. */
export type PendoTrackEvent = (typeof PENDO_TRACK_EVENTS)[number]

/** Property value shapes Pendo accepts on a track event. */
export type PendoTrackPropertyValue = string | number | boolean | null | readonly string[]

/** Track-event properties. `undefined` values are dropped when serialized. */
export type PendoTrackProperties = Record<string, PendoTrackPropertyValue | undefined>

export const pendo = {
  /** Send a Pendo track event. No-op while the agent is absent; never throws. */
  track(event: PendoTrackEvent, properties?: PendoTrackProperties): void {
    try {
      window.pendo?.track?.(event, properties)
    } catch (err) {
      console.warn(`[halo:pendo] track "${event}" failed`, err)
    }
  },
}
