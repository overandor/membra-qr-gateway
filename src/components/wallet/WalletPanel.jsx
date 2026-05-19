import React, { useState, useEffect } from 'react';
import { Wallet, Copy, CheckCircle, AlertTriangle, ExternalLink, Unplug, Zap } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

export function WalletPanel() {
  const { connected, publicKey, connect, disconnect, wallet } = useWallet();
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(null);

  const handleCopy = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  useEffect(() => {
    if (connected && publicKey && window.solana?.connection) {
      window.solana.connection.getBalance(new window.solanaWeb3.PublicKey(publicKey))
        .then((lamports) => setBalance(lamports / 1e9))
        .catch(() => setBalance(null));
    }
  }, [connected, publicKey]);

  return (
    <div className="space-y-6">
      {/* Wallet Card */}
      <div className="neo-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="neo-btn-primary w-10 h-10 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-black" />
          </div>
          <div>
            <h3 className="font-semibold">Solana Wallet</h3>
            <p className="text-[11px] text-[var(--text-muted)]">{connected ? 'Connected' : 'Not connected'}</p>
          </div>
        </div>

        {connected && publicKey ? (
          <div className="space-y-4">
            <div className="neo-card-pressed p-4 rounded-xl">
              <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking mb-1">Public Key</p>
              <div className="flex items-center gap-2">
                <p className="mono text-sm truncate flex-1">{publicKey}</p>
                <button onClick={handleCopy} className="neo-btn p-1.5 rounded-lg">
                  {copied ? <CheckCircle className="w-4 h-4 text-[var(--accent-success)]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="neo-card-pressed p-3 rounded-xl">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Balance</p>
                <p className="text-lg font-bold mt-1">{balance !== null ? `${balance.toFixed(4)} SOL` : '—'}</p>
              </div>
              <div className="neo-card-pressed p-3 rounded-xl">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Network</p>
                <p className="text-lg font-bold mt-1 text-[var(--accent-success)]">Devnet</p>
              </div>
            </div>

            <div className="flex gap-2">
              <a
                href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="neo-btn flex-1 py-2 text-center text-xs flex items-center justify-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> Explorer
              </a>
              <button onClick={disconnect} className="neo-btn flex-1 py-2 text-center text-xs flex items-center justify-center gap-1 text-[var(--accent-danger)]">
                <Unplug className="w-3 h-3" /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Wallet className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--text-muted)] mb-4">Connect your Solana wallet to interact with artifacts and token sales</p>
            <button onClick={connect} className="neo-btn-primary px-6 py-2.5 text-sm font-semibold flex items-center gap-2 mx-auto">
              <Zap className="w-4 h-4" /> Connect Wallet
            </button>
          </div>
        )}
      </div>

      {/* Devnet Faucet */}
      <div className="neo-card p-5">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--accent-gold)]" />
          Devnet Resources
        </h4>
        <div className="space-y-2">
          <a
            href="https://faucet.solana.com/"
            target="_blank"
            rel="noreferrer"
            className="neo-btn w-full py-2 text-center text-xs flex items-center justify-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Solana Devnet Faucet
          </a>
          <a
            href="https://explorer.solana.com/?cluster=devnet"
            target="_blank"
            rel="noreferrer"
            className="neo-btn w-full py-2 text-center text-xs flex items-center justify-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> Devnet Explorer
          </a>
        </div>
      </div>
    </div>
  );
}
