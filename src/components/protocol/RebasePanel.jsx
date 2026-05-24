import React, { useState, useCallback } from 'react';
import {
  RefreshCw, Clock, Activity, ArrowDownToLine, ArrowUpFromLine,
  Info, CheckCircle2, XCircle, AlertTriangle, Layers,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn, formatNumber } from '../../utils';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
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

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card p-2 text-xs border border-primary-orange/20">
      <p className="text-text-muted">{label}</p>
      <p className="text-primary-orange font-bold">Index: {payload[0]?.value?.toFixed(8)}</p>
    </div>
  );
};

function StatBox({ label, value, sub, accent }) {
  return (
    <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-center">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={cn('text-base font-bold', accent || 'text-text-primary')}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
        active
          ? 'bg-primary-orange text-black'
          : 'text-text-muted hover:text-text-primary hover:bg-white/5'
      )}
    >
      {children}
    </button>
  );
}

export function RebasePanel({ rebaseState, userPosition, onDeposit, onWithdraw, loading, className }) {
  const [tab, setTab] = useState('overview'); // 'overview' | 'deposit' | 'withdraw'
  const [depositAmt, setDepositAmt] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);

  const {
    index = 1,
    lastRebaseTime = null,
    nextRebaseETA = null,
    oraclePrice = null,
    targetPrice = null,
    paused = false,
    totalShares = 0,
    history = [],
    connected = false,
  } = rebaseState || {};

  const {
    shares = 0,
    redeemableTokens = 0,
    depositedTokens = 0,
  } = userPosition || {};

  const pnlTokens = redeemableTokens - depositedTokens;
  const pnlPct = depositedTokens > 0 ? (pnlTokens / depositedTokens) * 100 : 0;

  const chartData = history.length > 1
    ? history.map((h) => ({ time: formatTime(h.timestamp), index: h.index }))
    : null;

  const act = useCallback(async (type, fn) => {
    setBusy(type);
    setMsg(null);
    try {
      await fn();
      setMsg({ type: 'success', text: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} submitted` });
      if (type === 'deposit') setDepositAmt('');
      if (type === 'withdraw') setWithdrawShares('');
    } catch (err) {
      setMsg({ type: 'error', text: err.message || `${type} failed` });
    } finally {
      setBusy(null);
    }
  }, []);

  const indexDrift = index - 1;
  const driftPct = (indexDrift * 100).toFixed(4);
  const driftColor = indexDrift >= 0 ? 'text-success' : 'text-danger';

  return (
    <div className={cn('glass-card p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <RefreshCw className={cn('w-5 h-5', paused ? 'text-text-muted' : 'text-primary-orange')} />
          <div>
            <h3 className="font-semibold">Rebase Protocol</h3>
            <p className="text-xs text-text-muted">Elastic supply · shares/index model</p>
          </div>
        </div>
        <StatusPill
          status={paused ? 'locked' : loading ? 'pending' : 'active'}
          label={paused ? 'Paused' : loading ? 'Loading' : 'Live'}
        />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-background-100 border border-white/5 mb-4">
        <TabButton active={tab === 'overview'} onClick={() => setTab('overview')}>Overview</TabButton>
        <TabButton active={tab === 'deposit'} onClick={() => setTab('deposit')}>Deposit</TabButton>
        <TabButton active={tab === 'withdraw'} onClick={() => setTab('withdraw')}>Withdraw</TabButton>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="w-6 h-6 border-2 border-primary-orange/30 border-t-primary-orange rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {paused && <Alert type="warning">Rebase execution is currently paused by governance.</Alert>}

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-3">
                <StatBox
                  label="Rebase Index"
                  value={index?.toFixed(6)}
                  sub={<span className={driftColor}>{indexDrift >= 0 ? '+' : ''}{driftPct}%</span>}
                  accent="text-primary-gold"
                />
                <StatBox
                  label="Oracle Price"
                  value={oraclePrice ? `$${oraclePrice}` : '—'}
                  sub={targetPrice ? `Target $${targetPrice}` : null}
                  accent="text-primary-orange"
                />
                <StatBox
                  label="Last Rebase"
                  value={formatRelative(lastRebaseTime)}
                />
              </div>

              {/* Total shares */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
                <Layers className="w-4 h-4 text-text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-text-muted">Total Shares Outstanding</p>
                  <p className="text-sm font-bold text-text-primary">{formatNumber(totalShares)}</p>
                </div>
                {nextRebaseETA && (
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Next Rebase</p>
                    <p className="text-xs font-semibold text-primary-orange">{formatTime(nextRebaseETA)}</p>
                  </div>
                )}
              </div>

              {/* Chart */}
              {chartData ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-text-muted" />
                    <p className="text-xs text-text-muted">Index History</p>
                  </div>
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <defs>
                          <linearGradient id="rebaseGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF8A1F" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FF8A1F" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9B9489' }} tickLine={false} axisLine={false} />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip content={<ChartTooltip />} />
                        <Area type="monotone" dataKey="index" stroke="#FF8A1F" strokeWidth={2} fill="url(#rebaseGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 rounded-lg bg-background-100 border border-white/5">
                  <p className="text-xs text-text-muted">No rebase history yet</p>
                </div>
              )}

              {/* Rebase math explainer */}
              <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-xs text-text-muted space-y-1">
                <p className="font-medium text-text-primary text-xs">How it works</p>
                <p>Deposit tokens → receive shares at current index</p>
                <p>Rebase adjusts the index without touching balances</p>
                <p>Withdraw → get <span className="text-primary-orange font-mono">shares × index / 1e12</span> tokens back</p>
              </div>
            </div>
          )}

          {/* DEPOSIT TAB */}
          {tab === 'deposit' && (
            <div className="space-y-4">
              {!connected ? (
                <Alert type="info">Connect your wallet to deposit tokens into the rebase vault.</Alert>
              ) : paused ? (
                <Alert type="warning">Deposits are disabled while rebase is paused.</Alert>
              ) : (
                <>
                  <div className="p-3 rounded-lg bg-primary-orange/5 border border-primary-orange/20 text-xs space-y-1">
                    <p className="font-medium text-text-primary">Deposit preview</p>
                    {depositAmt && index ? (
                      <>
                        <p className="text-text-muted">
                          You deposit: <span className="text-primary-orange font-bold">{formatNumber(parseFloat(depositAmt) || 0)} tokens</span>
                        </p>
                        <p className="text-text-muted">
                          You receive: <span className="text-primary-gold font-bold">
                            {formatNumber(((parseFloat(depositAmt) || 0) * 1e12 / (index * 1e12)).toFixed(6))} shares
                          </span>
                        </p>
                        <p className="text-text-muted font-mono text-[10px]">
                          shares = amount × 1e12 / index
                        </p>
                      </>
                    ) : (
                      <p className="text-text-muted">Enter an amount to see your share allocation.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-text-muted font-medium">Token Amount</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2.5 pr-16 rounded-xl bg-background-50 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-orange/40"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-medium">MCHAT</span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="medium"
                    onClick={() => act('deposit', () => onDeposit?.(parseFloat(depositAmt)))}
                    loading={busy === 'deposit'}
                    disabled={!depositAmt || parseFloat(depositAmt) <= 0}
                    icon={ArrowDownToLine}
                    className="w-full"
                  >
                    Deposit Tokens
                  </Button>

                  {msg && <Alert type={msg.type}>{msg.text}</Alert>}
                </>
              )}
            </div>
          )}

          {/* WITHDRAW TAB */}
          {tab === 'withdraw' && (
            <div className="space-y-4">
              {!connected ? (
                <Alert type="info">Connect your wallet to withdraw from the rebase vault.</Alert>
              ) : (
                <>
                  {/* Position summary */}
                  {shares > 0 ? (
                    <div className="p-3 rounded-lg bg-primary-gold/5 border border-primary-gold/20 space-y-2">
                      <p className="text-xs font-medium text-text-primary">Your Position</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-text-muted">Shares</p>
                          <p className="font-bold text-primary-gold">{formatNumber(shares)}</p>
                        </div>
                        <div>
                          <p className="text-text-muted">Redeemable</p>
                          <p className="font-bold text-primary-orange">{formatNumber(redeemableTokens)} MCHAT</p>
                        </div>
                        <div>
                          <p className="text-text-muted">Deposited</p>
                          <p className="font-bold">{formatNumber(depositedTokens)} MCHAT</p>
                        </div>
                        <div>
                          <p className="text-text-muted">P&amp;L</p>
                          <p className={cn('font-bold', pnlTokens >= 0 ? 'text-success' : 'text-danger')}>
                            {pnlTokens >= 0 ? '+' : ''}{formatNumber(pnlTokens.toFixed(4))} ({pnlPct.toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Alert type="info">You have no shares to withdraw. Deposit first.</Alert>
                  )}

                  {shares > 0 && (
                    <>
                      {withdrawShares && index ? (
                        <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-xs">
                          <p className="text-text-muted">You burn: <span className="font-bold text-text-primary">{formatNumber(parseFloat(withdrawShares) || 0)} shares</span></p>
                          <p className="text-text-muted">You receive: <span className="font-bold text-primary-orange">
                            {formatNumber(((parseFloat(withdrawShares) || 0) * index).toFixed(6))} MCHAT
                          </span></p>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-text-muted font-medium">Shares to Burn</label>
                          <button
                            onClick={() => setWithdrawShares(String(shares))}
                            className="text-xs text-primary-orange hover:underline"
                          >
                            Max ({formatNumber(shares)})
                          </button>
                        </div>
                        <div className="relative">
                          <input
                            type="number"
                            min="1"
                            max={shares}
                            step="1"
                            value={withdrawShares}
                            onChange={(e) => setWithdrawShares(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2.5 pr-16 rounded-xl bg-background-50 border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-orange/40"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-medium">shares</span>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="medium"
                        onClick={() => act('withdraw', () => onWithdraw?.(parseFloat(withdrawShares)))}
                        loading={busy === 'withdraw'}
                        disabled={!withdrawShares || parseFloat(withdrawShares) <= 0 || parseFloat(withdrawShares) > shares}
                        icon={ArrowUpFromLine}
                        className="w-full"
                      >
                        Withdraw Tokens
                      </Button>
                    </>
                  )}

                  {msg && <Alert type={msg.type}>{msg.text}</Alert>}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default RebasePanel;
