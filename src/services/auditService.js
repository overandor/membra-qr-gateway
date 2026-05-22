import { apiGet, apiPost } from './apiClient.js';

export async function getAuditTrail(filters = {}) {
  const { page = 1, limit = 50, type, actor, severity, from, to } = filters;
  const params = { page, limit };
  if (type) params.type = type;
  if (actor) params.actor = actor;
  if (severity) params.severity = severity;
  if (from) params.from = from;
  if (to) params.to = to;
  return apiGet('/api/audit/trail', params);
  // Returns { items: [], total, page, limit }
}

export async function logEvent(type, data = {}) {
  return apiPost('/api/audit/log', {
    type,
    data,
    clientTimestamp: Date.now(),
    userAgent: navigator.userAgent,
  });
}

export async function getAuditEvent(id) {
  return apiGet(`/api/audit/events/${encodeURIComponent(id)}`);
}

export async function exportAuditLog(format = 'json', filters = {}) {
  const params = new URLSearchParams({ format, ...filters }).toString();
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:7860';
  const sessionRaw = sessionStorage.getItem('membra_session');
  const headers = { Accept: format === 'csv' ? 'text/csv' : 'application/json' };
  if (sessionRaw) {
    try {
      const session = JSON.parse(sessionRaw);
      if (session?.token) headers['Authorization'] = `Bearer ${session.token}`;
    } catch { /* ignore */ }
  }
  const res = await fetch(`${baseUrl}/api/audit/export?${params}`, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  if (format === 'csv') return res.text();
  return res.json();
}

export const EVENT_TYPES = {
  WALLET_CONNECT: 'wallet.connect',
  WALLET_DISCONNECT: 'wallet.disconnect',
  QR_SCAN: 'qr.scan',
  QR_VERIFY: 'qr.verify',
  RECEIPT_CREATE: 'receipt.create',
  ARTIFACT_VIEW: 'artifact.view',
  IDO_BUY: 'ido.buy',
  STAKE: 'rewards.stake',
  UNSTAKE: 'rewards.unstake',
  CLAIM: 'rewards.claim',
  VOTE: 'governance.vote',
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  SESSION_EXTEND: 'session.extend',
  PERMISSION_DENIED: 'security.permission_denied',
  INTEGRITY_FAIL: 'security.integrity_fail',
};

export const SEVERITY = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical',
};

export default { getAuditTrail, logEvent, getAuditEvent, exportAuditLog, EVENT_TYPES, SEVERITY };
