import React from 'react';
import { Wallet, Activity, Clock, Network, RefreshCw } from 'lucide-react';
import { cn, truncateHash } from '../../utils';
import { useWalletContext } from '../../context/WalletContext.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';
import { Button } from '../ui/Button.jsx';
import { ACTIVE_CHAIN } from '../../data/chainMetadata.js';

export function WalletStatus({ className }) {
  const { connected, publicKey, balance, loading, error, refreshBalance, connect } = useWalletContext();

  const network = ACTIVE_CHAIN.name;

  return (
    <div className={cn('glass-card p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary-orange" />
          <h3 className="font-semibold text-sm">Wallet Status</h3>
        </div>
        <StatusPill
          status={connected ? 'active' : 'locked'}
          label={connected ? 'Connected' : 'Disconnected'}
        />
      </div>

      {connected && publicKey ? (
        <div className="space-y-3">
          {/* Address */}
          <div className="p-3 rounded-lg bg-background-100 border border-white/5">
            <p className="text-xs text-text-muted mb-1">Public Key</p>
            <p className="text-xs font-mono text-text-primary break-all">{publicKey}</p>
          </div>

          {/* Balance */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-background-100 border border-white/5">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary-orange" />
              <div>
                <p className="text-xs text-text-muted">SOL Balance</p>
                <p className="text-sm font-semibold text-text-primary">
                  {balance !== null ? `${balance.toFixed(6)} SOL` : '—'}
                </p>
              </div>
            </div>
            <button
              onClick={refreshBalance}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Refresh balance"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          </div>

          {/* Network */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background-100 border border-white/5">
            <Network className="w-4 h-4 text-primary-orange" />
            <div>
              <p className="text-xs text-text-muted">Network</p>
              <p className="text-sm font-semibold text-text-primary">{network}</p>
            </div>
          </div>

          {/* Last activity */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-background-100 border border-white/5">
            <Clock className="w-4 h-4 text-text-muted" />
            <div>
              <p className="text-xs text-text-muted">Last Activity</p>
              <p className="text-sm text-text-primary">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-text-muted mb-3">
            {error || 'Connect your Solana wallet to access all features.'}
          </p>
          <Button
            variant="primary"
            size="small"
            onClick={connect}
            loading={loading}
            icon={Wallet}
          >
            Connect Wallet
          </Button>
        </div>
      )}
    </div>
  );
}

export default WalletStatus;
