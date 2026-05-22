import React, { createContext, useContext, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet.js';
import { isConnected as checkWalletConnected, getPublicKey } from '../services/walletService.js';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const wallet = useWallet();

  // Auto-reconnect: if wallet was previously connected, try to re-connect silently
  useEffect(() => {
    const alreadyConnected = checkWalletConnected();
    const pk = getPublicKey();
    // useWallet already handles auto-detection in its own effect.
    // This effect is a safety net if the wallet became available after mount.
    if (!wallet.connected && alreadyConnected && pk) {
      wallet.connect().catch(() => {
        // Silent — user will need to reconnect manually
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WalletContext.Provider value={wallet}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWalletContext() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within a WalletProvider');
  return ctx;
}

// Re-export as useWallet for convenience
export { useWalletContext as useWallet };

export default WalletContext;
