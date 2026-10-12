/**
 * Ambient type for the `pendo` global created by the Pendo install snippet in
 * index.html.
 *
 * Covers only the slice of the agent API Halo calls. The snippet stubs
 * `initialize` and `identify` (calls queue until the agent script loads), but
 * NOT `clearSession` — hence its optional type: it only exists once the agent
 * has loaded.
 */

/** Pendo metadata values: strings (incl. ISO 8601 timestamps), numbers, booleans, lists. */
type PendoMetadataValue = string | number | boolean | string[]

interface PendoMetadata {
  /** Unique id. An empty visitor id at initialize lets the agent resume its last-seen visitor. */
  id: string
  [field: string]: PendoMetadataValue
}

interface PendoIdentity {
  visitor: PendoMetadata
  account?: PendoMetadata
}

interface PendoAgent {
  initialize(options: PendoIdentity): void
  identify(options: PendoIdentity): void
  clearSession?: () => void
}

declare var pendo: PendoAgent
