// ─────────────────────────────────────────────────────────────────────────────
// MEMBRA QR Gateway — Security Configuration
// ─────────────────────────────────────────────────────────────────────────────

const allowedOriginsFromEnv = (process.env.CORS_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const securityConfig = {
  cors: {
    allowedOrigins: [
      "http://localhost:3000",
      "http://localhost:7860",
      ...allowedOriginsFromEnv,
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as const,
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    credentials: true,
    maxAge: 86_400, // 24h preflight cache
  },

  rateLimit: {
    windowMs: 60_000, // 1 minute
    max: 100,         // default: 100 req/min
    authMax: 20,      // auth endpoints: 20 req/min
    adminMax: 50,     // admin endpoints: 50 req/min
    webhookMax: 200,  // webhooks: higher limit (Stripe/Membra)
    skipSuccessfulRequests: false,
    standardHeaders: true,
    legacyHeaders: false,
  },

  session: {
    jwtExpirySeconds: 3_600,       // 1 hour
    refreshThresholdSeconds: 300,   // refresh when <5 min remain
    cookieSecure: true,
    cookieSameSite: "strict" as const,
    cookieHttpOnly: true,
  },

  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:"],
    fontSrc: ["'self'"],
    connectSrc: [
      "'self'",
      "https://api.devnet.solana.com",
      "https://api.mainnet-beta.solana.com",
      "wss://api.devnet.solana.com",
      "wss://api.mainnet-beta.solana.com",
      "https://api.stripe.com",
      "https://js.stripe.com",
    ],
    frameSrc: ["https://js.stripe.com"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: true,
  },

  headers: {
    hsts: true,
    hstsMaxAge: 31_536_000, // 1 year
    hstsIncludeSubDomains: true,
    hstsPreload: true,
    noSniff: true,
    xssProtection: true,
    frameOptions: "DENY" as const,
    referrerPolicy: "strict-origin-when-cross-origin" as const,
    permissionsPolicy: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },

  apiKey: {
    minLength: 32,
    hashAlgorithm: "sha256" as const,
    rotationDays: 90,
  },
} as const;

export type SecurityConfig = typeof securityConfig;
