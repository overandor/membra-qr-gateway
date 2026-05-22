// ─────────────────────────────────────────────────────────────────────────────
// MEMBRA QR Gateway — Observability Configuration
// Covers: metrics, tracing, alerting, log levels
// ─────────────────────────────────────────────────────────────────────────────

export const observabilityConfig = {
  metrics: {
    enabled: true,
    endpoint: "/metrics",
    /** Prometheus scrape interval matches prometheus.yml */
    scrapeIntervalSeconds: 15,
    defaultLabels: {
      service: "membra-qr-gateway",
      version: process.env.APP_VERSION ?? "unknown",
      environment: process.env.NODE_ENV ?? "development",
    },
    histogramBuckets: {
      /** HTTP request duration in seconds */
      httpDuration: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      /** DB query duration in seconds */
      dbDuration: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1],
      /** Solana RPC call duration in seconds */
      rpcDuration: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    },
  },

  tracing: {
    enabled: process.env.TRACING_ENABLED === "true",
    serviceName: "membra-qr-gateway",
    /** OTLP exporter endpoint (e.g. Tempo, Jaeger) */
    otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318",
    sampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    propagators: ["tracecontext", "baggage"] as const,
  },

  logging: {
    level: (process.env.LOG_LEVEL ?? "INFO") as "DEBUG" | "INFO" | "WARNING" | "ERROR",
    format: process.env.NODE_ENV === "production" ? "json" : "pretty",
    /** Structured fields always included */
    defaultFields: {
      service: "membra-qr-gateway",
      environment: process.env.NODE_ENV ?? "development",
    },
    /** Do not log these paths (health checks spam logs) */
    excludePaths: ["/health", "/metrics", "/favicon.ico"],
  },

  alerting: {
    /** Match alertmanager.yml receivers */
    channels: {
      critical: "pagerduty",
      warning: "slack",
      info: "email",
    },
    thresholds: {
      /** Alert if error rate exceeds this over 5-minute window */
      errorRatePercent: 5,
      /** Alert if p99 latency exceeds this (ms) */
      p99LatencyMs: 2_000,
      /** Alert if API is down for this many consecutive checks */
      consecutiveFailures: 3,
      /** Alert if auth failure rate exceeds per minute */
      authFailuresPerMinute: 20,
    },
  },

  healthCheck: {
    endpoint: "/health",
    /** Components checked in health endpoint */
    components: ["database", "solana_rpc", "disk_space"] as const,
    diskSpaceWarningPercent: 80,
    diskSpaceCriticalPercent: 90,
    /** RPC latency above this is considered degraded */
    rpcLatencyDegradedMs: 1_000,
  },
} as const;

export type ObservabilityConfig = typeof observabilityConfig;
