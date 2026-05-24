import React, { useState, useCallback, useEffect } from 'react';
import {
  DollarSign, Clock, TrendingUp, Users, AlertTriangle,
  Gift, RotateCcw, CheckCircle2, XCircle, Info,
} from 'lucide-react';
import { cn, formatCurrency, formatNumber } from '../../utils';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';

function useCountdown(endMs) {
  const [label, setLabel] = useState(null);
  useEffect(() => {
    if (!endMs) return;
    const tick = () => {
      const diff = endMs - Date.now();
      if (diff <= 0) { setLabel('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs]);
  return label;
}

function Alert({ type = 'info', children }) {
  const styles = {
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
    success: 'bg-success/10 border-success/20 text-success',
    error: 'bg-danger/10 border-danger/20 text-danger',
    warning: 'bg-primary-gold/10 border-primary-gold/20 text-primary-gold',
  };
  const Icon = { info: Info, success: CheckCircle2, error: XCircle, warning: AlertTriangle }[type];
  return (
    <div className={cn('flex items-start gap-2 p-3 rounded-lg border text-xs', styles[type])}>
      <Icon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function StatBox({ label, value, sub, accent }) {
  return (
    <div className="p-3 rounded-lg bg-background-100 border border-white/5">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={cn('text-base font-bold', accent || 'text-text-primary')}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export function IDOPanel({ idoState, userRecord, onBuy, onClaim, onRefund, loading, className }) {
  const [buyAmount, setBuyAmount] = useState('');
  const [busy, setBusy] = useState(null); // 'buy' | 'claim' | 'refund'
  const [msg, setMsg] = useState(null); // { type, text }

  const {
    status = 'pending',       // 'pending' | 'active' | 'paused' | 'finalized' | 'cancelled'
    tokenSymbol = 'MCHAT',
    raiseTarget = 0,
    amountRaised = 0,
    percentComplete = 0,
    participants = 0,
    tokenPriceUsd = 0,
    minPurchase = 0,
    maxPurchase = 0,
    endTime = null,
    claimStartTime = null,
    connected = false,
  } = idoState || {};

  const {
    tokensPurchased = 0,
    paymentDeposited = 0,
    claimed = false,
    refunded = false,
  } = userRecord || {};

  const countdown = useCountdown(endTime);
  const claimCountdown = useCountdown(claimStartTime);
  const canClaim = status === 'finalized' && tokensPurchased > 0 && !claimed &&
    (!claimStartTime || Date.now() >= claimStartTime);
  const claimPending = status === 'finalized' && tokensPurchased > 0 && !claimed &&
    claimStartTime && Date.now() < claimStartTime;
  const canRefund = status === 'cancelled' && paymentDeposited > 0 && !refunded;

  const act = useCallback(async (type, fn) => {
    setBusy(type);
    setMsg(null);
    try {
      const res = await fn();
      setMsg({ type: 'success', text: res?.message || `${type} successful` });
      if (type === 'buy') setBuyAmount('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || `${type} failed` });
    } finally {
      setBusy(null);
    }
  }, []);

  const handleBuy = useCallback(() => {
    const parsed = parseFloat(buyAmount);
    if (!parsed || parsed <= 0) { setMsg({ type: 'error', text: 'Enter a valid amount' }); return; }
    if (parsed < minPurchase) { setMsg({ type: 'error', text: `Minimum is ${minPurchase} ${tokenSymbol}` }); return; }
    if (parsed > maxPurchase) { setMsg({ type: 'error', text: `Maximum is ${maxPurchase} ${tokenSymbol}` }); return; }
    act('buy', () => onBuy?.(parsed));
  }, [buyAmount, minPurchase, maxPurchase, tokenSymbol, act, onBuy]);

  const statusConfig = {
    pending:   { label: 'Not Started', pill: 'pending' },
    active:    { label: 'Live',        pill: 'active' },
    paused:    { label: 'Paused',      pill: 'locked' },
    finalized: { label: 'Finalized',   pill: 'active' },
    cancelled: { label: 'Cancelled',   pill: 'failed' },
  }[status] || { label: status, pill: 'pending' };

  return (
    <div className={cn('glass-card p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary-orange" />
          <div>
            <h3 className="font-semibold">{tokenSymbol} Token Sale</h3>
            <p className="text-xs text-text-muted">Initial Decentralized Offering</p>
          </div>
        </div>
        <StatusPill status={statusConfig.pill} label={statusConfig.label} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary-orange/30 border-t-primary-orange rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-text-muted">Raised</span>
              <span className="font-bold text-primary-orange">{percentComplete.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-background-100 border border-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-orange to-primary-gold transition-all duration-700"
                style={{ width: `${Math.min(100, percentComplete)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-xs text-text-muted">
              <span>{formatCurrency(amountRaised)}</span>
              <span>Target: {formatCurrency(raiseTarget)}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              label="Token Price"
              value={tokenPriceUsd ? `$${tokenPriceUsd.toFixed(4)}` : '—'}
              sub="per MCHAT"
              accent="text-primary-gold"
            />
            <StatBox
              label="Participants"
              value={formatNumber(participants)}
              sub="unique wallets"
            />
            <StatBox
              label="Min / Max"
              value={`${formatNumber(minPurchase)} / ${formatNumber(maxPurchase)}`}
              sub={`${tokenSymbol} per wallet`}
            />
            <StatBox
              label={status === 'active' ? 'Ends In' : 'Status'}
              value={status === 'active' ? (countdown || '—') : statusConfig.label}
              accent={status === 'active' ? 'text-primary-gold' : ''}
            />
          </div>

          {/* User allocation info */}
          {connected && (tokensPurchased > 0 || paymentDeposited > 0) && (
            <div className="p-3 rounded-xl bg-primary-gold/5 border border-primary-gold/20">
              <p className="text-xs text-text-muted mb-2 font-medium">Your Allocation</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-text-muted">Purchased</span>
                  <p className="font-bold text-primary-gold">{formatNumber(tokensPurchased)} {tokenSymbol}</p>
                </div>
                <div>
                  <span className="text-text-muted">Deposited</span>
                  <p className="font-bold text-text-primary">{formatCurrency(paymentDeposited / 1e6)}</p>
                </div>
              </div>
              {claimed && <p className="text-xs text-success mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Tokens claimed</p>}
              {refunded && <p className="text-xs text-success mt-2 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Payment refunded</p>}
            </div>
          )}

          {/* Buy form */}
          {status === 'active' && connected && (
            <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/20 space-y-3">
              <p className="text-sm font-medium">Purchase {tokenSymbol}</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={minPurchase}
                    max={maxPurchase}
                    step="1"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder={`${minPurchase}–${maxPurchase}`}
                    className="w-full px-3 py-2 pr-16 rounded-xl bg-background-50 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-orange/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-medium">{tokenSymbol}</span>
                </div>
                <Button
                  variant="primary"
                  size="medium"
                  onClick={handleBuy}
                  loading={busy === 'buy'}
                  disabled={!buyAmount}
                  icon={TrendingUp}
                >
                  Buy
                </Button>
              </div>
              {buyAmount && tokenPriceUsd > 0 && (
                <p className="text-xs text-text-muted">
                  Cost: ≈ {formatCurrency(parseFloat(buyAmount || 0) * tokenPriceUsd)}
                </p>
              )}
            </div>
          )}

          {/* Claim button */}
          {canClaim && (
            <Button
              variant="primary"
              size="medium"
              onClick={() => act('claim', () => onClaim?.())}
              loading={busy === 'claim'}
              icon={Gift}
              className="w-full"
            >
              Claim {formatNumber(tokensPurchased)} {tokenSymbol}
            </Button>
          )}

          {/* Claim pending */}
          {claimPending && (
            <Alert type="warning">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Claims open {claimStartTime ? `in ${claimCountdown}` : 'soon'}
              </span>
            </Alert>
          )}

          {/* Refund button */}
          {canRefund && (
            <Button
              variant="danger"
              size="medium"
              onClick={() => act('refund', () => onRefund?.())}
              loading={busy === 'refund'}
              icon={RotateCcw}
              className="w-full"
            >
              Refund {formatCurrency(paymentDeposited / 1e6)}
            </Button>
          )}

          {/* No wallet */}
          {!connected && status === 'active' && (
            <Alert type="info">Connect your wallet to participate in the IDO.</Alert>
          )}

          {/* IDO not active */}
          {connected && status === 'pending' && (
            <Alert type="info">The IDO has not started yet. Check back later.</Alert>
          )}

          {/* Feedback */}
          {msg && <Alert type={msg.type}>{msg.text}</Alert>}
        </div>
      )}
    </div>
  );
}

export default IDOPanel;
