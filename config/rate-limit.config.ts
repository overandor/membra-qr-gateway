// ─────────────────────────────────────────────────────────────────────────────
// MEMBRA QR Gateway — Rate Limit Configuration by Route
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitTier {
  /** Route pattern (prefix match) */
  pattern: string;
  /** Rolling window in milliseconds */
  windowMs: number;
  /** Max requests per window */
  max: number;
  /** Human-readable description for error messages */
  description: string;
  /** Skip counting successful requests (useful for read-only endpoints) */
  skipSuccessful?: boolean;
}

export const rateLimitTiers: RateLimitTier[] = [
  // ── Authentication ────────────────────────────────────────────────────────
  {
    pattern: "/api/auth/login",
    windowMs: 60_000,
    max: 10,
    description: "10 login attempts per minute",
  },
  {
    pattern: "/api/auth/register",
    windowMs: 3_600_000,
    max: 5,
    description: "5 registrations per hour",
  },
  {
    pattern: "/api/auth/refresh",
    windowMs: 60_000,
    max: 20,
    description: "20 token refreshes per minute",
  },
  {
    pattern: "/api/auth/",
    windowMs: 60_000,
    max: 30,
    description: "30 auth requests per minute (catch-all)",
  },

  // ── QR endpoints ──────────────────────────────────────────────────────────
  {
    pattern: "/api/qr/scan",
    windowMs: 60_000,
    max: 60,
    description: "60 QR scans per minute",
  },
  {
    pattern: "/api/qr/generate",
    windowMs: 60_000,
    max: 30,
    description: "30 QR generations per minute",
  },

  // ── Webhooks (higher limit — Stripe/Membra send bursts) ───────────────────
  {
    pattern: "/api/webhooks/stripe",
    windowMs: 60_000,
    max: 300,
    description: "300 Stripe webhook events per minute",
    skipSuccessful: true,
  },
  {
    pattern: "/api/webhooks/membra",
    windowMs: 60_000,
    max: 300,
    description: "300 Membra webhook events per minute",
    skipSuccessful: true,
  },

  // ── Admin endpoints ───────────────────────────────────────────────────────
  {
    pattern: "/api/admin/",
    windowMs: 60_000,
    max: 50,
    description: "50 admin requests per minute",
  },

  // ── Protocol / Solana read ────────────────────────────────────────────────
  {
    pattern: "/api/protocol/",
    windowMs: 60_000,
    max: 120,
    description: "120 protocol reads per minute",
    skipSuccessful: true,
  },

  // ── Public / health (no limit in practice) ────────────────────────────────
  {
    pattern: "/health",
    windowMs: 60_000,
    max: 1_000,
    description: "Health check (effectively unlimited)",
    skipSuccessful: true,
  },

  // ── Default (catch-all) ───────────────────────────────────────────────────
  {
    pattern: "/api/",
    windowMs: 60_000,
    max: 100,
    description: "100 API requests per minute (default)",
  },
];

/** Look up the most specific rate limit tier for a given path */
export function tierForPath(path: string): RateLimitTier {
  // Sort by pattern length descending — longest match wins
  const sorted = [...rateLimitTiers].sort((a, b) => b.pattern.length - a.pattern.length);
  const match = sorted.find((t) => path.startsWith(t.pattern));
  return match ?? rateLimitTiers[rateLimitTiers.length - 1];
}
