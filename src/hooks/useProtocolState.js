import { useState, useEffect, useCallback, useRef } from 'react';
import { getAllProtocolState } from '../services/protocolService.js';

const POLL_INTERVAL_MS = 30_000;

export function useProtocolState(walletAddress = null) {
  const [state, setState] = useState({
    ido: null,
    rebase: null,
    rewards: null,
    governance: null,
    attestation: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchState = useCallback(async () => {
    try {
      const data = await getAllProtocolState(walletAddress);
      if (mountedRef.current) {
        setState(data);
        setError(null);
        setLastUpdated(Date.now());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch protocol state');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [walletAddress]);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    mountedRef.current = true;
    fetchState();

    intervalRef.current = setInterval(fetchState, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchState]);

  return {
    ...state,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}

export default useProtocolState;
