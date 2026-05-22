const SESSION_KEY = 'membra_session';
const SESSION_LAST_ACTIVE_KEY = 'membra_last_active';

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function getSessionAge() {
  const lastActive = sessionStorage.getItem(SESSION_LAST_ACTIVE_KEY);
  if (!lastActive) return SESSION_TIMEOUT_MS + 1;
  return Date.now() - parseInt(lastActive, 10);
}

export function checkSessionValidity() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    if (!session || !session.token) return false;
    if (session.expiresAt && Date.now() > session.expiresAt) return false;
    if (getSessionAge() > SESSION_TIMEOUT_MS) return false;
    return true;
  } catch {
    return false;
  }
}

export function extendSession() {
  sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;
  try {
    const session = JSON.parse(raw);
    session.expiresAt = Date.now() + SESSION_TIMEOUT_MS;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_LAST_ACTIVE_KEY);
  sessionStorage.removeItem('membra_csrf');
}

export function getTimeUntilExpiry() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return 0;
  try {
    const session = JSON.parse(raw);
    if (session.expiresAt) {
      return Math.max(0, session.expiresAt - Date.now());
    }
    const age = getSessionAge();
    return Math.max(0, SESSION_TIMEOUT_MS - age);
  } catch {
    return 0;
  }
}

export default {
  SESSION_TIMEOUT_MS,
  getSessionAge,
  checkSessionValidity,
  extendSession,
  clearSession,
  getTimeUntilExpiry,
};
