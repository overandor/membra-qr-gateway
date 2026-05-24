const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:7860';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ── Circuit breaker ──────────────────────────────────────────────────────────
const CB_STATES = { CLOSED: 0, OPEN: 1, HALF_OPEN: 2 };
const circuitBreakers = new Map();

function getCircuitBreaker(key) {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, { state: CB_STATES.CLOSED, failures: 0, lastFailure: 0, threshold: 5, resetMs: 30_000 });
  }
  return circuitBreakers.get(key);
}

function recordCircuitSuccess(key) {
  const cb = getCircuitBreaker(key);
  if (cb.state === CB_STATES.HALF_OPEN || cb.state === CB_STATES.CLOSED) {
    cb.failures = 0;
    cb.state = CB_STATES.CLOSED;
  }
}

function recordCircuitFailure(key) {
  const cb = getCircuitBreaker(key);
  cb.failures += 1;
  cb.lastFailure = Date.now();
  if (cb.failures >= cb.threshold) {
    cb.state = CB_STATES.OPEN;
  }
}

function isCircuitOpen(key) {
  const cb = getCircuitBreaker(key);
  if (cb.state === CB_STATES.OPEN) {
    if (Date.now() - cb.lastFailure > cb.resetMs) {
      cb.state = CB_STATES.HALF_OPEN;
      return false;
    }
    return true;
  }
  return false;
}

// ── Request deduplication ────────────────────────────────────────────────────
const inflight = new Map();

function dedupeKey(path, body) {
  return `${path}::${body || ''}`;
}

// ── Core request with timeout + retry + circuit breaker ────────────────────
async function request(path, options = {}) {
  const cbKey = path.split('?')[0];
  if (isCircuitOpen(cbKey)) {
    throw new ApiError('Service temporarily unavailable (circuit open)', 503, 'CIRCUIT_OPEN');
  }

  const dedupe = dedupeKey(path, options.body);
  if (!options.skipDedupe && inflight.has(dedupe)) {
    return inflight.get(dedupe);
  }

  const url = `${API_BASE}${path}`;
  const attempt = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': crypto.randomUUID(), ...options.headers },
        ...options,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new ApiError(err.detail || `HTTP ${res.status}`, res.status, err.code);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  };

  let lastError;
  const promise = (async () => {
    for (let i = 0; i <= MAX_RETRIES; i++) {
      try {
        const result = await attempt();
        recordCircuitSuccess(cbKey);
        return result;
      } catch (e) {
        lastError = e;
        const isNetwork = e.name === 'TypeError' || e.name === 'AbortError';
        const isServer = e.status >= 500;
        if (!isNetwork && !isServer) break; // don't retry client errors
        if (i < MAX_RETRIES) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, i)));
      }
    }
    recordCircuitFailure(cbKey);
    throw lastError;
  })();

  if (!options.skipDedupe) {
    inflight.set(dedupe, promise);
    promise.finally(() => inflight.delete(dedupe));
  }
  return promise;
}

// ── API surface ──────────────────────────────────────────────────────────────
export const api = {
  // Health
  health: () => request('/api/health', { skipDedupe: true }),
  ready: () => request('/api/ready', { skipDedupe: true }),

  // Artifacts
  getArtifacts: () => request('/api/artifacts'),
  createArtifact: (data) => request('/api/artifacts', { method: 'POST', body: JSON.stringify(data) }),

  // Token Sales
  createTokenSale: (data) => request('/api/token-sale', { method: 'POST', body: JSON.stringify(data) }),
  getTokenSale: (saleId) => request(`/api/token-sale/${encodeURIComponent(saleId)}`),
  calculateContribution: (data) => request('/api/token-sale/calculate', { method: 'POST', body: JSON.stringify(data) }),
  recordContribution: (data) => request('/api/token-sale/contribute', { method: 'POST', body: JSON.stringify(data) }),
  getReceipt: (saleId, contributionId) =>
    request(`/api/token-sale/${encodeURIComponent(saleId)}/receipt/${encodeURIComponent(contributionId)}`),

  // Claims
  submitClaim: (data) => request('/api/token-sale/claim', { method: 'POST', body: JSON.stringify(data) }),
  getClaims: (saleId) => request(`/api/token-sale/${encodeURIComponent(saleId)}/claims`),

  // Rebase
  triggerRebase: (data) => request('/api/rebase/trigger', { method: 'POST', body: JSON.stringify(data) }),
  getRebaseState: (saleId) => request(`/api/rebase/${encodeURIComponent(saleId)}/state`),
  getRebaseHistory: (saleId, limit = 20) =>
    request(`/api/rebase/${encodeURIComponent(saleId)}/history?limit=${Math.max(1, Math.min(limit, 100))}`),
  getWalletRebaseEvents: (saleId, wallet) =>
    request(`/api/rebase/${encodeURIComponent(saleId)}/wallet/${encodeURIComponent(wallet)}`),

  // Events
  getEvents: () => request('/api/events'),
  ingestEvent: (data) => request('/api/events/ingest', { method: 'POST', body: JSON.stringify(data) }),

  // Stripe
  createCheckout: (data) => request('/api/stripe/create-checkout-session', { method: 'POST', body: JSON.stringify(data) }),

  // LLM
  llmInference: (data) => request('/api/llm/inference', { method: 'POST', body: JSON.stringify(data) }),
};

