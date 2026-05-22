import { apiGet, apiPost } from './apiClient.js';

export async function getReceipt(id) {
  return apiGet(`/api/receipts/${encodeURIComponent(id)}`);
  // Returns { id, artifactId, hash, creator, supporter, amount, timestamp, onChainTx, status }
}

export async function createReceipt(data) {
  return apiPost('/api/receipts', data);
  // data: { artifactId, walletAddress, amount, termsHash, signature }
  // Returns { id, hash, onChainTx }
}

export async function verifyReceipt(hash) {
  return apiGet('/api/receipts/verify', { hash });
  // Returns { valid: boolean, receipt: object|null }
}

export async function listReceipts(page = 1, limit = 20, filters = {}) {
  return apiGet('/api/receipts', { page, limit, ...filters });
  // Returns { items: [], total, page, limit }
}

export async function exportReceipts(format = 'json', filters = {}) {
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
  const res = await fetch(`${baseUrl}/api/receipts/export?${params}`, { headers, credentials: 'include' });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  if (format === 'csv') return res.text();
  return res.json();
}

export default { getReceipt, createReceipt, verifyReceipt, listReceipts, exportReceipts };
