import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCsrfToken, setCsrfToken, generateNonce } from '../security/csrf.js';
import {
  checkSessionValidity,
  extendSession,
  clearSession,
  getTimeUntilExpiry,
  SESSION_TIMEOUT_MS,
} from '../security/sessionPolicy.js';
import { getEffectiveRole, hasPermission, requiresWallet, canPerform } from '../security/permissions.js';
import { getSession } from '../services/authService.js';

const SecurityContext = createContext(null);

const WARN_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export function SecurityProvider({ children }) {
  const [csrfToken, setCsrfState] = useState(() => getCsrfToken());
  const [sessionValid, setSessionValid] = useState(() => checkSessionValidity());
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(() => getTimeUntilExpiry());
  const [session, setSession] = useState(() => getSession());
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  const refreshCsrf = useCallback(() => {
    const nonce = generateNonce();
    setCsrfToken(nonce);
    setCsrfState(nonce);
    return nonce;
  }, []);

  const extendCurrentSession = useCallback(() => {
    extendSession();
    setTimeUntilExpiry(getTimeUntilExpiry());
    setShowExpiryWarning(false);
    setSessionValid(true);
  }, []);

  const invalidateSession = useCallback(() => {
    clearSession();
    setSessionValid(false);
    setSession(null);
    setTimeUntilExpiry(0);
    setShowExpiryWarning(false);
  }, []);

  const refreshSession = useCallback(() => {
    const sess = getSession();
    const valid = checkSessionValidity();
    const expiry = getTimeUntilExpiry();
    setSession(sess);
    setSessionValid(valid);
    setTimeUntilExpiry(expiry);
    setShowExpiryWarning(valid && expiry < WARN_THRESHOLD_MS);
  }, []);

  // Poll session state every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshSession, 30_000);
    return () => clearInterval(interval);
  }, [refreshSession]);

  // Warn when session is close to expiry
  useEffect(() => {
    if (sessionValid && timeUntilExpiry > 0 && timeUntilExpiry < WARN_THRESHOLD_MS) {
      setShowExpiryWarning(true);
    } else {
      setShowExpiryWarning(false);
    }
  }, [sessionValid, timeUntilExpiry]);

  const role = getEffectiveRole(session);

  const checkPermission = useCallback((action) => {
    return hasPermission(role, action);
  }, [role]);

  const checkCanPerform = useCallback((action, walletConnected = false) => {
    return canPerform(session, action, walletConnected);
  }, [session]);

  const value = {
    csrfToken,
    sessionValid,
    session,
    timeUntilExpiry,
    showExpiryWarning,
    role,
    refreshCsrf,
    extendSession: extendCurrentSession,
    invalidateSession,
    refreshSession,
    hasPermission: checkPermission,
    requiresWallet,
    canPerform: checkCanPerform,
    SESSION_TIMEOUT_MS,
    WARN_THRESHOLD_MS,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error('useSecurity must be used within a SecurityProvider');
  return ctx;
}

export default SecurityContext;
