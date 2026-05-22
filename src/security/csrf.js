const CSRF_KEY = 'membra_csrf';

export function getCsrfToken() {
  return sessionStorage.getItem(CSRF_KEY) || null;
}

export function setCsrfToken(token) {
  if (!token) {
    sessionStorage.removeItem(CSRF_KEY);
    return;
  }
  sessionStorage.setItem(CSRF_KEY, token);
}

export function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default { getCsrfToken, setCsrfToken, generateNonce };
