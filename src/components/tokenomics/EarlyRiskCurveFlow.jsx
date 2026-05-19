import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  QrCode, Wallet, AlertTriangle, Coins, Receipt,
  TrendingUp, Shield, Zap, CheckCircle, ArrowRight,
  Activity, Users, Lock, Copy, ChevronDown, ChevronUp,
  RefreshCw, Clock, BarChart2, Plus, Loader2,
} from 'lucide-react';
import { cn } from '../../utils';
import { api } from '../../services/api';

// ── Constants ────────────────────────────────────────────────────────────────
const SOL_USD_RATE   = 150;
const DENOMINATION   = 0.10;
const MARKET_MIN     = 0.10;
const MARKET_MAX     = 1.00;
const REBASE_EVERY_S = 3 * 60 * 60;
const REBASE_PCT     = 0.03;

const DEFAULT_SALE_PARAMS = {
  name: 'MEMBRA QR Token',
  symbol: 'MQRT',
  maxSupply: 10_000_000,
  initialPrice: DENOMINATION,
  maxBonusPct: 0.50,
  decayLambda: 3.0,
};

// ── Math helpers ─────────────────────────────────────────────────────────────
function curvePrice(totalSold, maxSupply) {
  const s = maxSupply > 0 ? totalSold / maxSupply : 0;
  return DENOMINATION * (1 + s);
}

function earlyBonusPct(totalSold, maxSupply, maxBonusPct, decayLambda) {
  const s = maxSupply > 0 ? totalSold / maxSupply : 0;
  return maxBonusPct * Math.exp(-decayLambda * s);
}

function holderMultiplier(holderCount) {
  return 1 + (holderCount / 5000) * 0.4;
}

function buildCurvePoints(maxSupply, maxBonusPct, decayLambda) {
  return Array.from({ length: 11 }, (_, i) => {
    const s = i / 10;
    return { s, price: DENOMINATION * (1 + s), bonus: maxBonusPct * Math.exp(-decayLambda * s) };
  });
}

const FLOW_STEPS = [
  { icon: QrCode,        label: 'QR Created',       desc: 'Artifact registered on-chain with consent hash',      status: 'complete' },
  { icon: Users,         label: 'Buyer Scans QR',   desc: 'Gateway opens terms page — no blind execution',       status: 'complete' },
  { icon: AlertTriangle, label: 'Terms + Risk',      desc: 'Capped rebate disclosed. Pool-limited. No profit guarantee.', status: 'complete' },
  { icon: Wallet,        label: 'Wallet Connect',   desc: 'User signs locally — no private key exposure',        status: 'active'   },
  { icon: Coins,         label: 'Contribution',     desc: 'SOL or USDC → artifact vault PDA at $0.10/token',     status: 'pending'  },
  { icon: TrendingUp,    label: 'Bonding Curve',    desc: 'Base tokens = contribution ÷ curve price (from $0.10)', status: 'pending' },
  { icon: Zap,           label: 'Decay Bonus',      desc: 'Earlier buyers earn higher bonus (e^−λs decay)',      status: 'pending'  },
  { icon: Activity,      label: 'Split 80/10/5/5',  desc: 'Treasury · Protocol · Validator · Reward Pool',      status: 'pending'  },
  { icon: RefreshCw,     label: 'Rebase Epoch',     desc: '3 % of holders rebased every 3 h — supply reacts to holder count', status: 'pending' },
  { icon: Receipt,       label: 'Receipt On-chain', desc: 'PDA stores buyer hash, tokens, position, timestamp',  status: 'pending'  },
  { icon: Shield,        label: 'Rebate Eligible',  desc: 'Earlier buyers may claim from capped reward pool',   status: 'pending'  },
  { icon: CheckCircle,   label: 'Sale Finalized',   desc: 'Liquidity migrated, claims window opens',             status: 'locked'   },
];

const SPLIT_SLICES = [
  { label: 'Treasury / Liquidity / Project Reserve', pct: 80, color: 'bg-primary-orange',  textColor: 'text-primary-orange' },
  { label: 'Protocol / Builder',                     pct: 10, color: 'bg-primary-gold',    textColor: 'text-primary-gold'   },
  { label: 'Validator / Proof Pool',                 pct:  5, color: 'bg-primary-bronze',  textColor: 'text-primary-bronze' },
  { label: 'Capped Early Reward Pool',               pct:  5, color: 'bg-success',         textColor: 'text-success'        },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function MiniBarChart({ points, valueKey, maxValue, activeColor, label, supplyFraction }) {
  return (
    <div className="p-4 rounded-xl bg-background-100 border border-white/5">
      <p className="text-[10px] text-text-muted mb-3">{label}</p>
      <div className="flex items-end gap-0.5 h-14">
        {points.map((pt, i) => {
          const h   = Math.max((pt[valueKey] / maxValue) * 100, 4);
          const cur = Math.abs(pt.s - supplyFraction) < 0.06;
          return (
            <div key={i} className="flex-1 relative">
              <div
                className={cn('w-full rounded-t-sm', cur ? activeColor : `${activeColor}/20`)}
                style={{ height: `${h}%` }}
              />
              {cur && <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EpochBar({ epoch, maxSupply }) {
  const pct = Math.min((epoch.totalSupply / maxSupply) * 100, 100);
  const priceColor =
    epoch.marketPrice >= 0.70 ? 'bg-primary-gold' :
    epoch.marketPrice >= 0.40 ? 'bg-primary-orange' : 'bg-primary-bronze';
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] text-primary-gold font-bold">${epoch.marketPrice.toFixed(2)}</span>
      <div className="flex-1 w-5 flex flex-col-reverse">
        <div className={cn('w-full rounded-t-sm', priceColor)} style={{ height: `${pct}%`, minHeight: 4 }} />
      </div>
      <span className="text-[9px] text-text-muted">E{epoch.epoch}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function EarlyRiskCurveFlow() {
  const [amount,          setAmount]          = useState('10');
  const [currency,        setCurrency]        = useState('USDC');
  const [expandedStep,    setExpandedStep]    = useState(null);
  const [claimSubmitted,  setClaimSubmitted]  = useState(false);
  const [copied,          setCopied]          = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');

  // Live sale state
  const [sale,            setSale]            = useState(null);
  const [saleLoading,     setSaleLoading]     = useState(true);
  const [contributionResult, setContributionResult] = useState(null);
  const [buyerWallet,     setBuyerWallet]     = useState('');

  // Rebase epoch state
  const [marketPrice,     setMarketPrice]     = useState(0.42);
  const [holderCount,     setHolderCount]     = useState(0);
  const [totalSupply,     setTotalSupply]     = useState(0);
  const [epochHistory,    setEpochHistory]    = useState([]);
  const [nextRebaseSecs,  setNextRebaseSecs]  = useState(REBASE_EVERY_S);
  const [rebaseCount,     setRebaseCount]     = useState(0);
  const [lastWinners,     setLastWinners]     = useState([]);

  // Countdown tick
  useEffect(() => {
    const t = setInterval(() => setNextRebaseSecs((s) => (s > 0 ? s - 1 : REBASE_EVERY_S)), 1000);
    return () => clearInterval(t);
  }, []);

  const fmtCountdown = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  };

  // ── Fetch or create sale on mount ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function initSale() {
      try {
        setSaleLoading(true);
        setError('');
        const newSale = await api.createTokenSale({
          ...DEFAULT_SALE_PARAMS,
          creator_wallet: buyerWallet,
        });
        if (!cancelled) {
          setSale(newSale);
          setTotalSupply(0);
          setHolderCount(1);
          setRebaseCount(0);
          setEpochHistory([]);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Backend unavailable. Start app.py on port 7860 to create a token sale.');
        }
      } finally {
        if (!cancelled) setSaleLoading(false);
      }
    }
    initSale();
    return () => { cancelled = true; };
  }, []);

  // ── Poll rebase state when sale exists ─────────────────────────────────────
  useEffect(() => {
    if (!sale?.sale_id) return;
    let cancelled = false;
    async function pollRebase() {
      try {
        const state = await api.getRebaseState(sale.sale_id);
        if (!cancelled && state) {
          setMarketPrice(state.market_price || 0.42);
          setHolderCount(state.holder_count || 1);
          setTotalSupply(state.total_supply || 0);
          setRebaseCount(state.epoch || 0);
          if (state.last_winners) setLastWinners(state.last_winners.slice(0, 5));
        }
      } catch (_) {}
      try {
        const history = await api.getRebaseHistory(sale.sale_id, 10);
        if (!cancelled && history?.epochs) setEpochHistory(history.epochs);
      } catch (_) {}
    }
    pollRebase();
    const interval = setInterval(pollRebase, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sale?.sale_id]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const maxSupply = sale?.maxSupply || DEFAULT_SALE_PARAMS.maxSupply;
  const maxBonusPct = sale?.maxBonusPct || DEFAULT_SALE_PARAMS.maxBonusPct;
  const decayLambda = sale?.decayLambda || DEFAULT_SALE_PARAMS.decayLambda;
  const totalSold = sale?.totalSold || 0;
  const totalRaised = sale?.totalRaised || 0;
  const rewardPoolBalance = sale?.rewardPoolBalance || 0;

  const supplyFraction = maxSupply > 0 ? totalSold / maxSupply : 0;
  const currentPrice   = curvePrice(totalSold, maxSupply);
  const bonusPct       = earlyBonusPct(totalSold, maxSupply, maxBonusPct, decayLambda);
  const curvePoints    = buildCurvePoints(maxSupply, maxBonusPct, decayLambda);

  const amtNum      = useMemo(() => Math.max(parseFloat(amount) || 0, 0), [amount]);
  const usdEq       = useMemo(() => (currency === 'SOL' ? amtNum * SOL_USD_RATE : amtNum), [currency, amtNum]);
  const baseTokens  = useMemo(() => (currentPrice > 0 ? usdEq / currentPrice : 0), [usdEq, currentPrice]);
  const bonusTokens = useMemo(() => baseTokens * bonusPct, [baseTokens, bonusPct]);
  const totalTokens = useMemo(() => baseTokens + bonusTokens, [baseTokens, bonusTokens]);

  const splitAmounts = useMemo(() => SPLIT_SLICES.map((s) => ({ ...s, amount: usdEq * (s.pct / 100) })), [usdEq]);
  const maxRebate    = useMemo(() => Math.min(splitAmounts[3].amount, rewardPoolBalance * 0.01), [splitAmounts, rewardPoolBalance]);

  // Current rebase stats
  const rebaseFactor  = marketPrice / DENOMINATION;
  const hMult         = holderMultiplier(holderCount);
  const selected3pct  = Math.max(1, Math.round(holderCount * REBASE_PCT));
  const avgHolderBal  = holderCount > 0 ? totalSupply / holderCount : 0;
  const epochBonus    = avgHolderBal * (rebaseFactor - 1) * hMult;
  const maxEpochSupply = epochHistory.length > 0 ? Math.max(...epochHistory.map((e) => e.totalSupply)) : 1;

  function handleCopy() {
    navigator.clipboard.writeText(contributionResult?.receiptHash || 'a7f3c…2b1e').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ── Trigger rebase via API ─────────────────────────────────────────────────
  const triggerRebase = useCallback(async () => {
    if (!sale?.sale_id) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.triggerRebase({ sale_id: sale.sale_id });
        setMarketPrice(result.market_price || marketPrice);
        setHolderCount(result.holder_count || holderCount);
        setTotalSupply(result.total_supply || totalSupply);
        setRebaseCount(result.epoch || rebaseCount + 1);
        setNextRebaseSecs(REBASE_EVERY_S);
        if (result.winners) setLastWinners(result.winners.slice(0, 5));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sale, holderCount, totalSupply, rebaseCount, marketPrice]);

  // ── Record contribution via API ────────────────────────────────────────────
  const handleContribute = useCallback(async () => {
    if (!sale?.sale_id || amtNum <= 0) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.recordContribution({
        sale_id: sale.sale_id,
        buyer_wallet: buyerWallet,
        amount: amtNum,
        currency,
      });
      setContributionResult(result);
      const updated = await api.getTokenSale(sale.sale_id);
      setSale(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sale, amtNum, currency, buyerWallet, baseTokens, bonusTokens, totalTokens]);

  // ── Submit claim via API ───────────────────────────────────────────────────
  const handleClaim = useCallback(async () => {
    if (!sale?.sale_id || !contributionResult) return;
    setLoading(true);
    setError('');
    try {
      await api.submitClaim({
          sale_id: sale.sale_id,
          buyer_wallet: buyerWallet,
          contribution_id: contributionResult.receiptHash || contributionResult.position,
        });
        setClaimSubmitted(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [sale, contributionResult, buyerWallet]);

  return (
    <div className="glass-card p-6 mb-6">
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/30 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-danger flex-shrink-0" />
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}
      {saleLoading && (
        <div className="mb-4 p-3 rounded-xl bg-primary-orange/10 border border-primary-orange/30 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-primary-orange animate-spin flex-shrink-0" />
          <p className="text-xs text-primary-orange">Initializing token sale…</p>
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary-orange" />
          Early-Risk Curve / QR Tokenomics + Rebase Engine
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-success/10 border border-success/30 text-success text-xs font-bold">
            IDO ACTIVE
          </span>
          <span className="px-3 py-1 rounded-full bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-xs font-bold">
            {(supplyFraction * 100).toFixed(1)}% SOLD
          </span>
          <span className="px-3 py-1 rounded-full bg-primary-gold/10 border border-primary-gold/30 text-primary-gold text-xs font-bold">
            DENOM $0.10
          </span>
        </div>
      </div>
      <p className="text-xs text-text-muted mb-5">
        Token denomination: <strong className="text-primary-orange">$0.10</strong> · Market oscillates $0.10–$1.00 · Every 3 h, 3% of holders rebased · Supply expands with holder count
      </p>

      {/* ── Flow Steps ─────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-1.5 overflow-x-auto pb-4 mb-6 scrollbar-thin">
        {FLOW_STEPS.map((step, i) => {
          const Icon       = step.icon;
          const isExpanded = expandedStep === i;
          return (
            <React.Fragment key={step.label}>
              <button
                onClick={() => setExpandedStep(isExpanded ? null : i)}
                className={cn(
                  'min-w-[90px] p-2.5 rounded-xl border text-left transition-all flex-shrink-0',
                  step.status === 'complete' && 'bg-success/10 border-success/30',
                  step.status === 'active'   && 'bg-primary-orange/10 border-primary-orange/40 ring-1 ring-primary-orange/30',
                  step.status === 'pending'  && 'bg-background-100 border-white/5',
                  step.status === 'locked'   && 'bg-background-100 border-white/5 opacity-50',
                  isExpanded && 'ring-1 ring-primary-gold/50'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Icon className={cn('w-3.5 h-3.5',
                    step.status === 'complete' && 'text-success',
                    step.status === 'active'   && 'text-primary-orange',
                    (step.status === 'pending' || step.status === 'locked') && 'text-text-muted'
                  )} />
                  {isExpanded ? <ChevronUp className="w-3 h-3 text-text-muted" /> : <ChevronDown className="w-3 h-3 text-text-muted" />}
                </div>
                <p className="text-[11px] font-semibold leading-tight mb-0.5">{step.label}</p>
                <span className={cn('text-[9px] font-bold uppercase',
                  step.status === 'complete' && 'text-success',
                  step.status === 'active'   && 'text-primary-orange',
                  (step.status === 'pending' || step.status === 'locked') && 'text-text-muted'
                )}>{step.status}</span>
                {isExpanded && <p className="text-[10px] text-text-muted mt-1.5 leading-tight">{step.desc}</p>}
              </button>
              {i < FLOW_STEPS.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-primary-orange/25 flex-shrink-0 mt-3" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── Rebase Engine Panel ─────────────────────────────────────────────── */}
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-primary-gold/10 via-background-100 to-primary-orange/5 border border-primary-gold/20">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-primary-gold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Elastic Rebase Engine — Epoch #{rebaseCount}
          </h4>
          <button
            onClick={triggerRebase}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-gold/10 border border-primary-gold/30 text-primary-gold text-xs font-bold hover:bg-primary-gold/20 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Simulate Next Epoch
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-4">
          {/* Denomination */}
          <div className="p-3 rounded-xl bg-background-50 border border-primary-orange/20">
            <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wide">Denomination</p>
            <p className="text-2xl font-bold text-primary-orange">$0.10</p>
            <p className="text-[10px] text-text-muted">base peg · 10 cents</p>
          </div>
          {/* Market price this epoch */}
          <div className="p-3 rounded-xl bg-background-50 border border-primary-gold/20">
            <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wide">Market Price</p>
            <p className="text-2xl font-bold text-primary-gold">${marketPrice.toFixed(3)}</p>
            <p className="text-[10px] text-text-muted">range $0.10 – $1.00</p>
          </div>
          {/* Rebase factor */}
          <div className="p-3 rounded-xl bg-background-50 border border-primary-bronze/20">
            <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wide">Rebase Factor</p>
            <p className="text-2xl font-bold text-primary-bronze">{rebaseFactor.toFixed(2)}×</p>
            <p className="text-[10px] text-text-muted">market ÷ denom</p>
          </div>
          {/* Countdown */}
          <div className="p-3 rounded-xl bg-background-50 border border-white/5">
            <p className="text-[10px] text-text-muted mb-1 uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3" /> Next Rebase
            </p>
            <p className="text-lg font-bold text-text-primary font-mono">{fmtCountdown(nextRebaseSecs)}</p>
            <p className="text-[10px] text-text-muted">every 3 hours</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Epoch supply bar chart */}
          <div className="col-span-1 p-4 rounded-xl bg-background-100 border border-white/5">
            <p className="text-[10px] text-text-muted mb-3 flex items-center gap-1">
              <BarChart2 className="w-3 h-3" /> Supply Growth per Epoch (price above bar)
            </p>
            <div className="flex items-end gap-1.5 h-24">
              {epochHistory.map((ep) => (
                <EpochBar key={ep.epoch} epoch={ep} maxSupply={maxEpochSupply * 1.05} />
              ))}
            </div>
          </div>

          {/* This epoch mechanics */}
          <div className="col-span-1 p-4 rounded-xl bg-background-100 border border-white/5 space-y-2">
            <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wide">This Epoch Mechanics</p>
            {[
              { label: 'Holder Count',         value: holderCount.toLocaleString() },
              { label: '3% Selected',          value: selected3pct.toLocaleString() + ' wallets' },
              { label: 'Holder Multiplier',    value: `${hMult.toFixed(3)}×` },
              { label: 'Avg Holder Balance',   value: avgHolderBal.toFixed(0) + ' tokens' },
              { label: 'Bonus per Winner',     value: epochBonus.toFixed(0) + ' tokens' },
              { label: 'Total Supply Now',     value: totalSupply.toLocaleString(undefined, { maximumFractionDigits: 0 }) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-xs">
                <span className="text-text-muted">{row.label}</span>
                <span className="font-bold text-text-primary font-mono">{row.value}</span>
              </div>
            ))}
          </div>

          {/* Last 3% winners */}
          <div className="col-span-1 p-4 rounded-xl bg-background-100 border border-white/5">
            <p className="text-[10px] text-text-muted mb-3 uppercase tracking-wide">Last Epoch Winners (3%)</p>
            <div className="space-y-2">
              {lastWinners.map((w, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary-orange">{w.wallet}</span>
                  <span className="text-xs font-bold text-primary-gold">+{w.bonus.toFixed(0)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] text-text-muted">
                formula: balance × (market ÷ $0.10 − 1) × holder_mult
              </p>
              <p className="text-[10px] text-primary-gold mt-1">
                more holders → bigger epoch bonus
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Simulation Panel ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-5">

        {/* Col 1 — Contribution Calculator */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-primary-orange uppercase tracking-wide">Contribution Calculator</h4>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
              <p className="text-[10px] text-text-muted mb-0.5">IDO Price</p>
              <p className="text-sm font-bold text-primary-orange">${currentPrice.toFixed(4)}</p>
              <p className="text-[10px] text-text-muted">from $0.10 base</p>
            </div>
            <div className="p-3 rounded-lg bg-background-100 border border-primary-gold/10">
              <p className="text-[10px] text-text-muted mb-0.5">Early Bonus</p>
              <p className="text-sm font-bold text-primary-gold">+{(bonusPct * 100).toFixed(1)}%</p>
              <p className="text-[10px] text-text-muted">decaying</p>
            </div>
            <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
              <p className="text-[10px] text-text-muted mb-0.5">Total Raised</p>
              <p className="text-sm font-bold text-text-primary">${totalRaised.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
              <p className="text-[10px] text-text-muted mb-0.5">Tokens Sold</p>
              <p className="text-sm font-bold text-text-primary">{(totalSold / 1_000).toFixed(0)}k</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-text-muted uppercase tracking-wide">Your Contribution</label>
            <div className="flex gap-2">
              <div className="flex rounded-lg border border-white/10 overflow-hidden flex-shrink-0">
                {['USDC', 'SOL'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={cn('px-2.5 py-1.5 text-xs font-medium transition-colors',
                      currency === c ? 'bg-primary-orange text-white' : 'bg-background-100 text-text-muted hover:bg-background-200'
                    )}
                  >{c}</button>
                ))}
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0.10"
                step="1"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-background-100 border border-white/10 text-sm text-text-primary focus:outline-none focus:border-primary-orange/40"
              />
            </div>
            <p className="text-[10px] text-text-muted">
              {currency === 'SOL' ? `≈ $${usdEq.toFixed(2)} USD at $${SOL_USD_RATE}/SOL` : `${usdEq.toFixed(2)} USDC`}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-primary-orange/10 to-primary-bronze/5 border border-primary-orange/20 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Base Tokens @ $0.10</span>
              <span className="text-sm font-bold text-text-primary">{baseTokens.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-text-muted">Early Bonus (+{(bonusPct * 100).toFixed(1)}%)</span>
              <span className="text-sm font-bold text-primary-gold">+{bonusTokens.toFixed(0)}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold">Total Tokens</span>
              <span className="text-base font-bold text-primary-orange">{totalTokens.toFixed(0)}</span>
            </div>
          </div>

          <button
            onClick={handleContribute}
            disabled={loading || amtNum <= 0}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-primary-orange to-primary-bronze text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            {contributionResult ? 'Contribute Again' : 'Record Contribution'}
          </button>

          <div className="p-3 rounded-lg bg-danger/5 border border-danger/20">
            <p className="text-[10px] text-danger font-semibold mb-0.5">Not investment advice</p>
            <p className="text-[10px] text-text-muted">
              Denomination $0.10 is a reference price, not a guaranteed return. Rebase bonus ≠ income. Position ≠ profit.
            </p>
          </div>
        </div>

        {/* Col 2 — Curve Visualizations */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-primary-orange uppercase tracking-wide">Bonding Curve + Decay</h4>

          <MiniBarChart
            points={curvePoints}
            valueKey="price"
            maxValue={curvePoints[curvePoints.length - 1].price}
            activeColor="bg-primary-orange"
            label="Price Curve — rises above $0.10 as supply fraction grows (▲ = now)"
            supplyFraction={supplyFraction}
          />

          <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-xs font-mono space-y-1">
            <p className="text-[10px] text-text-muted mb-1">Bonding Curve Formula</p>
            <p className="text-primary-orange">price(s) = $0.10 × (1 + s)</p>
            <p className="text-text-muted">s = supply fraction sold</p>
            <p className="text-primary-gold mt-1">→ ${currentPrice.toFixed(4)} at {(supplyFraction * 100).toFixed(1)}% sold</p>
          </div>

          <MiniBarChart
            points={curvePoints}
            valueKey="bonus"
            maxValue={maxBonusPct}
            activeColor="bg-primary-gold"
            label="Early Bonus Decay — higher for earlier buyers (▲ = now)"
            supplyFraction={supplyFraction}
          />

          <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-xs font-mono space-y-1">
            <p className="text-[10px] text-text-muted mb-1">Decay + Rebase Formulas</p>
            <p className="text-primary-gold">bonus(s) = 50% × e^(−3s)</p>
            <p className="text-primary-gold mt-1">rebase(w) = bal × (mkt÷$0.10 − 1)</p>
            <p className="text-text-muted">→ +{(bonusPct * 100).toFixed(1)}% early bonus now</p>
          </div>
        </div>

        {/* Col 3 — Split + Receipt + Claim */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-primary-orange uppercase tracking-wide">Split · Receipt · Claim</h4>

          <div className="p-4 rounded-xl bg-background-100 border border-white/5">
            <p className="text-[10px] text-text-muted mb-3">${usdEq.toFixed(2)} contribution split on-chain</p>
            {splitAmounts.map((slice) => (
              <div key={slice.label} className="mb-2.5">
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-text-muted">{slice.label}</span>
                  <span className={cn('font-bold', slice.textColor)}>{slice.pct}% · ${slice.amount.toFixed(2)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-background-200 overflow-hidden">
                  <div className={cn('h-full rounded-full transition-all', slice.color)} style={{ width: `${slice.pct}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-gradient-to-br from-primary-gold/5 to-primary-bronze/5 border border-primary-gold/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-text-muted">On-chain Receipt (PDA)</p>
              <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-primary-orange hover:text-primary-gold transition-colors">
                <Copy className="w-3 h-3" />{copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'Buyer Position',  value: contributionResult ? `#${contributionResult.position}` : '—',    mono: true,  color: 'text-primary-orange' },
                { label: 'Total Tokens',    value: totalTokens.toFixed(0),        mono: true,  color: 'text-text-primary'   },
                { label: 'Denom Price',     value: '$0.10',                        mono: false, color: 'text-primary-orange' },
                { label: 'Proof Hash',      value: 'a7f3c…2b1e',                  mono: true,  color: 'text-primary-orange' },
                { label: 'Max Rebate',      value: `$${maxRebate.toFixed(2)}`,    mono: false, color: 'text-primary-gold'   },
                { label: 'Status',          value: 'Pending Finalization',         mono: false, color: 'text-text-muted'     },
              ].map((row) => (
                <div key={row.label} className="flex justify-between items-center">
                  <span className="text-[10px] text-text-muted">{row.label}</span>
                  <span className={cn('text-xs', row.mono && 'font-mono', row.color)}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cn('p-4 rounded-xl border transition-all',
            claimSubmitted ? 'bg-success/10 border-success/30' : 'bg-background-100 border-white/5'
          )}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-text-muted font-semibold">CAPPED REBATE POOL</p>
              <Lock className="w-3 h-3 text-text-muted" />
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">Pool Balance</span>
              <span className="font-bold text-primary-gold">${rewardPoolBalance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs mb-3">
              <span className="text-text-muted">Your Max Rebate</span>
              <span className="font-bold text-primary-gold">${maxRebate.toFixed(2)}</span>
            </div>
            <p className="text-[10px] text-text-muted mb-3 leading-relaxed">
              Claimable only after sale is finalized. Capped at 5% pool allocation. Not profit — cashback only if pool is funded.
            </p>
            <button
              onClick={handleClaim}
              className={cn('w-full py-2 rounded-lg text-xs font-medium transition-colors',
                claimSubmitted
                  ? 'bg-success/20 border border-success/30 text-success'
                  : 'bg-primary-orange/10 border border-primary-orange/30 text-primary-orange hover:bg-primary-orange/20'
              )}
            >
              {claimSubmitted ? '✓ Claim Submitted (Awaiting Sale Finalization)' : 'Submit Rebate Claim'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Finalization Banner ──────────────────────────────────────────────── */}
      <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-background-100 to-background-200 border border-white/5">
        <div className="flex items-center gap-4 overflow-x-auto">
          {[
            { label: 'Sale Finalized',     status: false },
            { label: 'Liquidity Migrated', status: false },
            { label: 'Claims Window Open', status: false },
            { label: 'Reward Pool Funded', status: true  },
          ].map((item, i) => (
            <React.Fragment key={item.label}>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className={cn('w-2 h-2 rounded-full', item.status ? 'bg-success' : 'bg-background-200 border border-white/10')} />
                <span className={cn('text-xs', item.status ? 'text-success font-medium' : 'text-text-muted')}>{item.label}</span>
              </div>
              {i < 3 && <ArrowRight className="w-3.5 h-3.5 text-primary-orange/20 flex-shrink-0" />}
            </React.Fragment>
          ))}
          <div className="ml-auto text-[10px] text-text-muted flex-shrink-0">Claims enabled only when all conditions met</div>
        </div>
      </div>

      {/* ── Core Guardrail ───────────────────────────────────────────────────── */}
      <div className="mt-4 p-4 rounded-xl bg-danger/5 border border-danger/20">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-danger mb-0.5">Core Guardrail — Always Disclosed Before Contribution</p>
            <p className="text-xs text-text-muted">
              Denomination is $0.10 (reference only). No guaranteed profit. No infinite passive rewards. Rebase selects 3% of holders randomly every 3 h — selection is not guaranteed.
              Cashback is capped, disclosed, pool-limited, and claimable only if funded.
              Token ≠ Profit · Bonus ≠ Income · Rebate ≠ Investment Return · Rebase ≠ Yield · QR ≠ Blind Execution
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
