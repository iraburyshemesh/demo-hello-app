/**
 * Pendo Agent Analytics — typed, fail-safe wrapper around `pendo.trackAgent()`.
 *
 * `window.pendo` only exists once the Pendo install snippet has run, so calls
 * are no-ops until then. Anything the Pendo agent throws is swallowed:
 * analytics must never break the feature being tracked (e.g. turn a
 * successful chat reply into an error state).
 */

/** Conversational events recorded by Pendo Agent Analytics. */
export type AgentEventType = 'prompt' | 'agent_response' | 'user_reaction'

/** Metadata accepted by `pendo.trackAgent()`. */
export interface AgentEventMetadata {
  /** Pendo ID of the AI agent the event belongs to. */
  agentId: string
  /** Groups the events of one conversation. */
  conversationId: string
  /** Unique message ID — for `user_reaction`, the ID of the message reacted to. */
  messageId: string
  /** Message text, or for `user_reaction`: 'positive' | 'negative' | 'mixed' | 'undo' | 'retry'. */
  content: string
  /** LLM that produced an `agent_response`. */
  modelUsed?: string
  /** Whether the prompt was a predefined/suggested prompt. */
  suggestedPrompt?: boolean
  /** Tools/functions the agent called while responding. */
  toolsUsed?: string[]
  /** Whether a file was attached to the message. */
  fileUploaded?: boolean
}

declare global {
  interface Window {
    /** The Pendo agent — undefined until the Pendo install snippet has run. */
    pendo?: {
      trackAgent?: (eventType: AgentEventType, metadata: AgentEventMetadata) => void
    }
  }
}

/** Record a Pendo Agent Analytics event. No-op when Pendo isn't loaded. */
export function trackAgent(eventType: AgentEventType, metadata: AgentEventMetadata): void {
  try {
    window.pendo?.trackAgent?.(eventType, metadata)
  } catch {
    // Never let analytics break the feature being tracked.
  }
}
