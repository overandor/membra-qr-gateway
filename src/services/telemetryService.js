const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860';
const QUEUE_FLUSH_MS = 5000;
const MAX_QUEUE_SIZE = 20;

let queue = [];
let flushTimer = null;

function getSessionId() {
  let id = sessionStorage.getItem('membra_telemetry_session');
  if (!id) {
    id = `tel_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('membra_telemetry_session', id);
  }
  return id;
}

function getUserAgent() {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
}

function buildBasePayload() {
  return {
    sessionId: getSessionId(),
    userAgent: getUserAgent(),
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : null,
  };
}

async function flushQueue() {
  if (queue.length === 0) return;
  const batch = [...queue];
  queue = [];
  try {
    await fetch(`${BASE_URL}/api/metrics/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    // telemetry failures are silent
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushQueue();
  }, QUEUE_FLUSH_MS);
}

function enqueue(event) {
  queue.push(event);
  if (queue.length >= MAX_QUEUE_SIZE) {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    flushQueue();
  } else {
    scheduleFlush();
  }
}

export function trackPageView(page) {
  enqueue({
    type: 'page_view',
    page,
    ...buildBasePayload(),
  });
}

export function trackEvent(name, props = {}) {
  enqueue({
    type: 'event',
    name,
    props,
    ...buildBasePayload(),
  });
}

export function trackError(error) {
  const payload = {
    type: 'error',
    message: error?.message || String(error),
    stack: error?.stack || null,
    name: error?.name || 'Error',
    ...buildBasePayload(),
  };
  // Errors are sent immediately
  try {
    fetch(`${BASE_URL}/api/metrics/error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // silent
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushQueue();
  });
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushQueue();
    }
  });
}

export default { trackPageView, trackEvent, trackError };
