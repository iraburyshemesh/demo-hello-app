/**
 * Ambient type for the Pendo agent global, `window.pendo`.
 *
 * The install snippet in index.html defines the global before any app code
 * runs. Until the agent script has loaded it is a stub that only queues
 * `initialize`, `identify`, `updateOptions`, `pageLoad`, `track` and
 * `trackAgent` — anything else, `clearSession` included, is undefined until
 * then (and stays undefined if the agent is blocked), so it is typed optional.
 *
 * Only the members the app calls are declared.
 */

/** Metadata values Pendo accepts: strings (incl. ISO 8601 dates), numbers, booleans, lists. */
type PendoMetadataValue = string | number | boolean | readonly string[]

/**
 * Visitor or account metadata. `id` is required; every other key is a custom
 * field. An `undefined` value is dropped by Pendo rather than recorded.
 */
type PendoMetadata = {
  id: string
  [field: string]: PendoMetadataValue | undefined
}

type PendoIdentity = {
  visitor: PendoMetadata
  account?: PendoMetadata
}

type PendoAgent = {
  initialize: (options: PendoIdentity) => void
  identify: (identity: PendoIdentity) => void
  clearSession?: () => void
}

declare var pendo: PendoAgent
