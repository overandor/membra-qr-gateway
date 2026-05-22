import { apiGet, apiPost } from './apiClient.js';
import { setCsrfToken } from '../security/csrf.js';

const SESSION_KEY = 'membra_session';

export async function requestChallenge(walletAddress) {
  const data = await apiPost('/api/auth/challenge', { walletAddress });
  return data; // { challenge: string, nonce: string, expiresAt: number }
}

export async function verifySignature(address, signature, challenge) {
  const data = await apiPost('/api/auth/verify', { address, signature, challenge });
  if (data?.token) {
    const session = {
      token: data.token,
      refreshToken: data.refreshToken || null,
      address,
      expiresAt: data.expiresAt || Date.now() + 30 * 60 * 1000,
      createdAt: Date.now(),
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
  }
  return data;
}

export async function logout() {
  try {
    await apiPost('/api/auth/logout', {});
  } catch {
    // best-effort
  } finally {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem('membra_csrf');
  }
}

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (session.expiresAt && Date.now() > session.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function refreshToken() {
  const session = getSession();
  if (!session?.refreshToken) {
    throw new Error('No refresh token available');
  }
  const data = await apiPost('/api/auth/refresh', { refreshToken: session.refreshToken });
  if (data?.token) {
    const updated = {
      ...session,
      token: data.token,
      expiresAt: data.expiresAt || Date.now() + 30 * 60 * 1000,
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }
  }
  return data;
}

export async function fetchCsrfToken() {
  const data = await apiGet('/api/auth/csrf');
  if (data?.csrfToken) {
    setCsrfToken(data.csrfToken);
  }
  return data?.csrfToken || null;
}

export default { requestChallenge, verifySignature, logout, getSession, refreshToken, fetchCsrfToken };
