import React, { useState, useEffect, createContext, useContext } from 'react';

const WalletContext = createContext({ connected: false, publicKey: null, connect: () => {}, disconnect: () => {} });

export function useWallet() {
  return useContext(WalletContext);
}

export default function SolanaWalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);

  useEffect(() => {
    const sol = window?.solana;
    if (sol) setWallet(sol);
  }, []);

  const connect = async () => {
    if (!wallet) return;
    try {
      await wallet.connect();
      setConnected(true);
      setPublicKey(wallet.publicKey?.toString() || null);
    } catch (_) { /* ignore wallet connect errors */ }
  };

  const disconnect = () => {
    wallet?.disconnect?.();
    setConnected(false);
    setPublicKey(null);
  };

  return (
    <WalletContext.Provider value={{ connected, publicKey, connect, disconnect, wallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export { WalletContext };
