import { getCsrfToken } from '../security/csrf.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7860';
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 300;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeError(status, body) {
  const messages = {
    400: 'Bad request',
    401: 'Unauthorized — please reconnect your wallet',
    403: 'Forbidden — insufficient permissions',
    404: 'Resource not found',
    422: 'Validation error',
    429: 'Rate limited — please slow down',
    500: 'Internal server error',
    502: 'Gateway error',
    503: 'Service temporarily unavailable',
  };
  const detail = body?.detail || body?.message || body?.error || messages[status] || `HTTP ${status}`;
  const err = new Error(detail);
  err.status = status;
  err.body = body;
  return err;
}

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json().catch(() => null);
  }
  return res.text().catch(() => null);
}

export async function apiFetch(path, options = {}, attempt = 1) {
  const url = `${BASE_URL}${path}`;
  const csrfToken = getCsrfToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...options.headers,
  };

  const sessionRaw = sessionStorage.getItem('membra_session');
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      if (session?.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
    } catch {
      // ignore malformed session
    }
  }

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (networkError) {
    if (attempt < MAX_RETRIES) {
      await delay(RETRY_BASE_MS * Math.pow(2, attempt - 1));
      return apiFetch(path, options, attempt + 1);
    }
    const err = new Error(`Network error: ${networkError.message}`);
    err.status = 0;
    throw err;
  }

  const body = await parseResponse(res);

  if (!res.ok) {
    const err = normalizeError(res.status, body);
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get('retry-after');
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : RETRY_BASE_MS * Math.pow(2, attempt - 1);
      await delay(waitMs);
      return apiFetch(path, options, attempt + 1);
    }
    throw err;
  }

  return body;
}

export function apiGet(path, params) {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return apiFetch(`${path}${query}`, { method: 'GET' });
}

export function apiPost(path, data) {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function apiPut(path, data) {
  return apiFetch(path, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}

export default { apiFetch, apiGet, apiPost, apiPut, apiDelete };
