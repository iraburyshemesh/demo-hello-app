/// <reference types="vite/client" />

// Note: the Agent Chat feature's ANTHROPIC_API_KEY deliberately has NO VITE_
// prefix and is read server-side only, in vite.config.ts's dev proxy plugin
// (via `loadEnv`) — never through `import.meta.env` in client code. See
// src/chat/claudeClient.ts for why (CORS + key-exposure rationale).

interface Window {
  /**
   * Pendo agent global (Agent Analytics `trackAgent` only). Optional because the
   * Pendo snippet isn't installed yet — src/pendo/PendoBridge.tsx is a pass-through
   * — and `trackAgent` is optional because a snippet stub or an older Pendo agent
   * may not define it. Call as `window.pendo?.trackAgent?.(...)`.
   */
  pendo?: { trackAgent?: (eventType: string, metadata: object) => void }
}
