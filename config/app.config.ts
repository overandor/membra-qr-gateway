// ─────────────────────────────────────────────────────────────────────────────
// MEMBRA QR Gateway — Application Configuration
// ─────────────────────────────────────────────────────────────────────────────

export const appConfig = {
  name: "MEMBRA QR Gateway",
  version: "1.1.0",

  api: {
    baseUrl: process.env.VITE_API_URL ?? "http://localhost:7860",
    timeout: 10_000,
    retries: 3,
    retryDelay: 500,
  },

  session: {
    timeoutMs: 30 * 60 * 1_000, // 30 minutes
    extendOnActivity: true,
    warningBeforeExpiryMs: 5 * 60 * 1_000, // warn 5 min before expiry
  },

  features: {
    walletConnect: true,
    stripePayments: true,
    onChainProof: true,
    debugMode: process.env.NODE_ENV === "development",
  },

  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
  },

  qr: {
    defaultExpirySeconds: 300, // 5 minutes
    refreshBeforeExpirySeconds: 30,
    scanTimeoutMs: 5_000,
  },
} as const;

export type AppConfig = typeof appConfig;
