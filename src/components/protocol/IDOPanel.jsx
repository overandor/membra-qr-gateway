import React, { useState, useCallback, useEffect } from 'react';
import { DollarSign, Clock, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '../../utils';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';
import { useWalletContext } from '../../context/WalletContext.jsx';
import { buyIDO } from '../../services/protocolService.js';

function useCountdown(endTime) {
  const [remaining, setRemaining] = useState(null);

  useEffect(() => {
    if (!endTime) return;
    const update = () => {
      const diff = endTime - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  return remaining;
}

export function IDOPanel({ idoState, loading, className }) {
  const { connected, publicKey } = useWalletContext();
  const [amount, setAmount] = useState('');
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState(null);
  const [buySuccess, setBuySuccess] = useState(null);
  const countdown = useCountdown(idoState?.endTime);

  const {
    status = 'pending',
    raiseTarget = 0,
    amountRaised = 0,
    percentComplete = 0,
    participants = 0,
  } = idoState || {};

  const handleBuy = useCallback(async () => {
    if (!connected || !publicKey) return;
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      setBuyError('Enter a valid amount');
      return;
    }
    setBuying(true);
    setBuyError(null);
    setBuySuccess(null);
    try {
      const result = await buyIDO(publicKey, parsed);
      setBuySuccess(`Purchase recorded. Tx: ${result?.txSignature || 'pending'}`);
      setAmount('');
    } catch (err) {
      setBuyError(err.message || 'Purchase failed');
    } finally {
      setBuying(false);
    }
  }, [connected, publicKey, amount]);

  return (
    <div className={cn('glass-card p-6', className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary-orange" />
          <h3 className="font-semibold">IDO — MCHAT Token Sale</h3>
        </div>
        <StatusPill status={status} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-orange/30 border-t-primary-orange rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress */}
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-text-muted">Raised</span>
              <span className="text-sm font-bold text-primary-orange">{percentComplete.toFixed(1)}%</span>
            </div>
            <div className="h-3 rounded-full bg-background-100 border border-white/5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-orange to-primary-gold transition-all duration-700 rounded-full"
                style={{ width: `${Math.min(100, percentComplete)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs text-text-muted">{formatCurrency(amountRaised)}</span>
              <span className="text-xs text-text-muted">Target: {formatCurrency(raiseTarget)}</span>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-background-100 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs text-text-muted">Participants</span>
              </div>
              <p className="text-lg font-bold text-text-primary">{formatNumber(participants)}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-100 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-3.5 h-3.5 text-text-muted" />
                <span className="text-xs text-text-muted">Ends In</span>
              </div>
              <p className="text-sm font-bold text-primary-gold">{countdown || '—'}</p>
            </div>
          </div>

          {/* Buy form */}
          {connected ? (
            <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/20">
              <p className="text-sm font-medium mb-3">Purchase MCHAT</p>
              <div className="flex gap-2 mb-3">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in SOL"
                    className="w-full px-3 py-2 rounded-xl bg-background-50 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-orange/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">SOL</span>
                </div>
                <Button
                  variant="primary"
                  size="medium"
                  onClick={handleBuy}
                  loading={buying}
                  disabled={!amount || status !== 'active'}
                  icon={TrendingUp}
                >
                  Buy
                </Button>
              </div>
              {buyError && (
                <div className="flex items-center gap-2 text-xs text-danger">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {buyError}
                </div>
              )}
              {buySuccess && (
                <p className="text-xs text-success">{buySuccess}</p>
              )}
              {status !== 'active' && (
                <p className="text-xs text-text-muted">IDO is not currently active.</p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-background-100 border border-white/5 text-center">
              <p className="text-sm text-text-muted">Connect your wallet to participate in the IDO.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default IDOPanel;
