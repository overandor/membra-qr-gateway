const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SHA256_HEX_REGEX = /^[0-9a-fA-F]{64}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

export function sanitizeString(s, maxLen = 1000) {
  if (s === null || s === undefined) return '';
  const str = String(s).trim();
  if (str.length > maxLen) return str.slice(0, maxLen);
  return str;
}

export function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"'/]/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

export function validateWalletAddress(addr) {
  if (!addr || typeof addr !== 'string') {
    return { valid: false, error: 'Address is required' };
  }
  const trimmed = addr.trim();
  if (!SOLANA_ADDRESS_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid Solana wallet address' };
  }
  return { valid: true, value: trimmed };
}

export function validateHash(hash) {
  if (!hash || typeof hash !== 'string') {
    return { valid: false, error: 'Hash is required' };
  }
  const trimmed = hash.trim().replace(/^0x/, '');
  if (!SHA256_HEX_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid SHA-256 hash (must be 64 hex characters)' };
  }
  return { valid: true, value: trimmed };
}

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email address' };
  }
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address too long' };
  }
  return { valid: true, value: trimmed };
}

export function validateAmount(amount) {
  const num = Number(amount);
  if (!isFinite(num)) {
    return { valid: false, error: 'Amount must be a number' };
  }
  if (num < 0) {
    return { valid: false, error: 'Amount must be non-negative' };
  }
  if (num > 1_000_000_000) {
    return { valid: false, error: 'Amount exceeds maximum allowed' };
  }
  const rounded = Math.round(num * 1e9) / 1e9;
  return { valid: true, value: rounded };
}

export default {
  sanitizeString,
  escapeHtml,
  validateWalletAddress,
  validateHash,
  validateEmail,
  validateAmount,
};
