import { useState, useCallback, useEffect, useRef } from 'react';
import * as walletService from '../services/walletService.js';

export function useWallet() {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const balanceIntervalRef = useRef(null);

  const fetchBalance = useCallback(async (pk) => {
    if (!pk) return;
    try {
      const bal = await walletService.getBalance(pk);
      setBalance(bal);
    } catch {
      // non-fatal
    }
  }, []);

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await walletService.connect();
      setPublicKey(result.publicKey);
      setConnected(true);
      await fetchBalance(result.publicKey);
    } catch (err) {
      setError(err.message || 'Failed to connect wallet');
      setConnected(false);
      setPublicKey(null);
    } finally {
      setLoading(false);
    }
  }, [fetchBalance]);

  const disconnect = useCallback(async () => {
    setLoading(true);
    try {
      await walletService.disconnect();
    } catch {
      // best-effort
    } finally {
      setConnected(false);
      setPublicKey(null);
      setBalance(null);
      setLoading(false);
    }
  }, []);

  const signMessage = useCallback(async (message) => {
    if (!connected) throw new Error('Wallet not connected');
    return walletService.signMessage(message);
  }, [connected]);

  const signTransaction = useCallback(async (tx) => {
    if (!connected) throw new Error('Wallet not connected');
    return walletService.signTransaction(tx);
  }, [connected]);

  const refreshBalance = useCallback(() => {
    if (publicKey) fetchBalance(publicKey);
  }, [publicKey, fetchBalance]);

  // Auto-detect if wallet is already connected
  useEffect(() => {
    const alreadyConnected = walletService.isConnected();
    if (alreadyConnected) {
      const pk = walletService.getPublicKey();
      if (pk) {
        setPublicKey(pk);
        setConnected(true);
        fetchBalance(pk);
      }
    }
  }, [fetchBalance]);

  // Listen for wallet account changes
  useEffect(() => {
    const unsubChange = walletService.onAccountChange((newPk) => {
      if (newPk) {
        setPublicKey(newPk);
        setConnected(true);
        fetchBalance(newPk);
      } else {
        setConnected(false);
        setPublicKey(null);
        setBalance(null);
      }
    });

    const unsubDisconnect = walletService.onDisconnect(() => {
      setConnected(false);
      setPublicKey(null);
      setBalance(null);
    });

    return () => {
      unsubChange();
      unsubDisconnect();
    };
  }, [fetchBalance]);

  // Poll balance every 30s when connected
  useEffect(() => {
    if (connected && publicKey) {
      balanceIntervalRef.current = setInterval(() => {
        fetchBalance(publicKey);
      }, 30000);
    }
    return () => {
      if (balanceIntervalRef.current) {
        clearInterval(balanceIntervalRef.current);
      }
    };
  }, [connected, publicKey, fetchBalance]);

  return {
    connected,
    publicKey,
    balance,
    connect,
    disconnect,
    signMessage,
    signTransaction,
    refreshBalance,
    loading,
    error,
  };
}

export default useWallet;
