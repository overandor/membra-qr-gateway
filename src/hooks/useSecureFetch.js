import { useState, useCallback } from 'react';
import { apiFetch } from '../services/apiClient.js';
import { checkSessionValidity, extendSession } from '../security/sessionPolicy.js';
import { clearSession } from '../security/sessionPolicy.js';

export function useSecureFetch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const secureFetch = useCallback(async (path, options = {}, onUnauthorized = null) => {
    setError(null);

    // Check session validity before request
    const sessionOk = checkSessionValidity();
    if (!sessionOk) {
      const err = new Error('Session expired. Please reconnect your wallet.');
      err.status = 401;
      setError(err.message);
      if (onUnauthorized) onUnauthorized('session_expired');
      return null;
    }

    // Extend session on each request
    extendSession();

    setLoading(true);
    try {
      const result = await apiFetch(path, options);
      return result;
    } catch (err) {
      if (err.status === 401) {
        // Clear session and notify caller
        clearSession();
        setError('Session expired. Please reconnect your wallet.');
        if (onUnauthorized) onUnauthorized('unauthorized');
      } else {
        setError(err.message || 'Request failed');
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const secureGet = useCallback((path, params, onUnauthorized) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return secureFetch(`${path}${query}`, { method: 'GET' }, onUnauthorized);
  }, [secureFetch]);

  const securePost = useCallback((path, data, onUnauthorized) => {
    return secureFetch(path, {
      method: 'POST',
      body: JSON.stringify(data),
    }, onUnauthorized);
  }, [secureFetch]);

  const clearError = useCallback(() => setError(null), []);

  return {
    loading,
    error,
    secureFetch,
    secureGet,
    securePost,
    clearError,
  };
}

export default useSecureFetch;
