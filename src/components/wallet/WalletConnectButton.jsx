import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Wallet, Copy, LogOut, ChevronDown, Check } from 'lucide-react';
import { cn, truncateHash } from '../../utils';
import { useWalletContext } from '../../context/WalletContext.jsx';
import { Button } from '../ui/Button.jsx';

export function WalletConnectButton({ className }) {
  const { connected, publicKey, balance, connect, disconnect, loading, error } = useWalletContext();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  const handleClickOutside = useCallback((e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, handleClickOutside]);

  const handleCopy = useCallback(async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [publicKey]);

  const handleDisconnect = useCallback(async () => {
    setOpen(false);
    await disconnect();
  }, [disconnect]);

  if (!connected) {
    return (
      <div className={cn('flex flex-col items-start gap-1', className)}>
        <Button
          variant="primary"
          size="medium"
          onClick={connect}
          loading={loading}
          icon={Wallet}
        >
          Connect Wallet
        </Button>
        {error && (
          <p className="text-xs text-danger mt-1 max-w-[200px]">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl',
          'bg-primary-orange/10 border border-primary-orange/30',
          'text-primary-orange hover:bg-primary-orange/20 transition-colors',
          'font-medium text-sm'
        )}
      >
        <Wallet className="w-4 h-4" />
        <span className="font-mono">{truncateHash(publicKey, 4, 4)}</span>
        {balance !== null && (
          <span className="text-xs text-text-muted">
            {balance.toFixed(3)} SOL
          </span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 glass-card p-2 z-50">
          {/* Address row */}
          <div className="px-3 py-2 border-b border-white/5 mb-1">
            <p className="text-xs text-text-muted mb-1">Connected Wallet</p>
            <p className="text-xs font-mono text-text-primary break-all">{publicKey}</p>
            {balance !== null && (
              <p className="text-xs text-primary-orange mt-1">
                {balance.toFixed(6)} SOL
              </p>
            )}
          </div>

          {/* Copy address */}
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            {copied ? 'Copied!' : 'Copy Address'}
          </button>

          {/* Disconnect */}
          <button
            onClick={handleDisconnect}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export default WalletConnectButton;
