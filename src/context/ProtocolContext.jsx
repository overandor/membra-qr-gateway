import React, { createContext, useContext } from 'react';
import { useProtocolState } from '../hooks/useProtocolState.js';
import { useWalletContext } from './WalletContext.jsx';

const ProtocolContext = createContext(null);

export function ProtocolProvider({ children }) {
  const { publicKey } = useWalletContext();
  const protocolState = useProtocolState(publicKey);

  return (
    <ProtocolContext.Provider value={protocolState}>
      {children}
    </ProtocolContext.Provider>
  );
}

export function useProtocol() {
  const ctx = useContext(ProtocolContext);
  if (!ctx) throw new Error('useProtocol must be used within a ProtocolProvider');
  return ctx;
}

export default ProtocolContext;
