import React, { useState, useEffect } from 'react';
import {
  QrCode, Wallet, AlertTriangle, Coins, TrendingUp,
  Zap, Activity, RefreshCw, Receipt, Shield, CheckCircle,
  Scan, Hash, Github, ExternalLink, Copy, ArrowRight,
  Users, Lock, BarChart2, Sparkles, Radio,
} from 'lucide-react';
import { EarlyRiskCurveFlow } from './components/tokenomics/EarlyRiskCurveFlow';
import { cn } from './utils';

// ── IDO Workflow steps ────────────────────────────────────────────────────────
const IDO_STEPS = [
  { n: 1,  icon: QrCode,        label: 'QR Created',      sub: 'Artifact on-chain',        status: 'done'    },
  { n: 2,  icon: Scan,          label: 'QR Scanned',      sub: 'Gateway opens terms',       status: 'done'    },
  { n: 3,  icon: AlertTriangle, label: 'Risk Disclosed',  sub: 'Capped · pool-limited',     status: 'done'    },
  { n: 4,  icon: Wallet,        label: 'Wallet Connect',  sub: 'Local sign · no key export', status: 'active' },
  { n: 5,  icon: Coins,         label: 'Contribution',   sub: 'SOL / USDC @ $0.10',        status: 'pending' },
  { n: 6,  icon: TrendingUp,    label: 'Bonding Curve',  sub: 'Price from $0.10 base',      status: 'pending' },
  { n: 7,  icon: Zap,           label: 'Decay Bonus',    sub: 'Early buyers earn more',     status: 'pending' },
  { n: 8,  icon: Activity,      label: 'Split 80/10/5/5', sub: 'Treasury · Protocol · Pool', status: 'pending' },
  { n: 9,  icon: RefreshCw,     label: 'Rebase Epoch',   sub: '3 h · 3% random selected',   status: 'pending' },
  { n: 10, icon: Receipt,       label: 'Receipt PDA',    sub: 'On-chain proof record',       status: 'pending' },
  { n: 11, icon: Shield,        label: 'Rebate Eligible', sub: 'Capped cashback pool',       status: 'pending' },
  { n: 12, icon: CheckCircle,   label: 'Finalized',      sub: 'Liquidity migrated',          status: 'locked'  },
];

// ── Hero metrics ──────────────────────────────────────────────────────────────
const HERO_METRICS = [
  { label: 'Total Raised',  value: '$148,500', sub: 'of $1M target',        accent: false },
  { label: 'Token Price',   value: '$0.1149',  sub: 'bonding curve + 14.9%', accent: true  },
  { label: 'Holders',       value: '312',      sub: '+8 this epoch',         accent: false },
  { label: 'Denomination',  value: '$0.10',    sub: '10 cents · peg ref',    accent: false },
];

// ── Split data ────────────────────────────────────────────────────────────────
const SPLIT = [
  { label: 'Treasury / Liquidity / Project Reserve', pct: 80, color: '#FF8A1F', glow: 'rgba(255,138,31,0.3)'  },
  { label: 'Protocol / Builder',                     pct: 10, color: '#D6A64F', glow: 'rgba(214,166,79,0.3)'  },
  { label: 'Validator / Proof Pool',                 pct:  5, color: '#9A6A35', glow: 'rgba(154,106,53,0.3)'  },
  { label: 'Capped Early Reward Pool',               pct:  5, color: '#49D17D', glow: 'rgba(73,209,125,0.3)'  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCountdown(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ── Step Node ─────────────────────────────────────────────────────────────────
function StepNode({ step, index, total }) {
  const Icon   = step.icon;
  const isDone = step.status === 'done';
  const isAct  = step.status === 'active';
  const isLock = step.status === 'locked';

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        {/* Node circle */}
        <div className={cn(
          'step-node w-12 h-12 flex items-center justify-center relative',
          isDone && 'step-node-done',
          isAct  && 'step-node-active',
          isLock && 'step-node-locked',
        )}>
          <Icon className={cn(
            'w-5 h-5',
            isDone ? 'text-success'          :
            isAct  ? 'text-primary-orange'   :
            isLock ? 'text-text-dim'         : 'text-text-muted'
          )} />
          {/* Step number badge */}
          <span className={cn(
            'absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold',
            isDone ? 'bg-success text-black'              :
            isAct  ? 'bg-primary-orange text-black'       :
            isLock ? 'bg-background-300 text-text-dim'    : 'bg-background-200 text-text-muted'
          )}>{step.n}</span>
        </div>

        {/* Label */}
        <div className="text-center w-20">
          <p className={cn(
            'text-[10px] font-semibold leading-tight',
            isDone ? 'text-success'         :
            isAct  ? 'text-primary-orange'  :
            isLock ? 'text-text-dim'        : 'text-text-muted'
          )}>{step.label}</p>
          <p className="text-[9px] text-text-dim leading-tight mt-0.5 hidden sm:block">{step.sub}</p>
        </div>
      </div>

      {/* Connector */}
      {index < total - 1 && (
        <div className={cn(
          'step-connector mx-1',
          isDone ? 'step-connector-done'   :
          isAct  ? 'step-connector-active' : ''
        )} />
      )}
    </div>
  );
}

// ── Split Bar ─────────────────────────────────────────────────────────────────
function SplitSection() {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 text-center">
        Contribution Split — Executed On-chain
      </h2>
      <div className="neo-glass p-6">
        {/* Stacked bar */}
        <div className="flex rounded-xl overflow-hidden h-10 mb-6" style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)' }}>
          {SPLIT.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-center text-[10px] font-bold text-black transition-all"
              style={{ width: `${s.pct}%`, background: s.color, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2)` }}
            >
              {s.pct}%
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPLIT.map((s) => (
            <div key={s.label} className="neo-glass-sm p-3 text-center">
              <div className="w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center font-bold text-sm text-black"
                style={{ background: s.color, boxShadow: `0 0 12px ${s.glow}` }}>
                {s.pct}
              </div>
              <p className="text-[10px] text-text-muted leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Doctrine Footer ───────────────────────────────────────────────────────────
function DoctrineFooter() {
  const items = [
    { icon: Hash,     label: 'Proof ≠ Money',        desc: 'On-chain hash is provenance, not settlement' },
    { icon: Coins,    label: 'Token ≠ Profit',        desc: 'Token allocation is not guaranteed revenue' },
    { icon: RefreshCw,label: 'Rebase ≠ Yield',        desc: 'Supply expansion is not passive income'     },
    { icon: Radio,    label: 'Rebate ≠ Return',       desc: 'Capped cashback only if pool is funded'     },
    { icon: Wallet,   label: 'QR ≠ Blind Execution',  desc: 'Scan opens context page, not transaction'   },
  ];
  return (
    <footer className="mt-8 pb-12">
      <div className="neo-glass p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-danger" />
          <p className="text-sm font-bold text-danger">Core Guardrail — Always Disclosed</p>
        </div>
        <p className="text-xs text-text-muted mb-4">
          No guaranteed profit. No infinite passive rewards. Cashback is capped, disclosed, pool-limited, and claimable only if funded.
          Denomination $0.10 is a reference price — not a floor, not a guarantee, not a bank deposit.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="neo-glass-sm p-3">
                <Icon className="w-4 h-4 text-primary-orange mb-1.5" />
                <p className="text-[10px] font-bold text-text-primary mb-0.5">{item.label}</p>
                <p className="text-[10px] text-text-muted leading-tight">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-center text-[10px] text-text-dim">
        MEMBRA QR Gateway · Proof ≠ Money · Token ≠ Profit · Rebase ≠ Yield · github.com/overandor/membra-qr-gateway
      </p>
    </footer>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [rebaseSecs, setRebaseSecs] = useState(5_073);
  const [copied,     setCopied]     = useState(false);

  useEffect(() => {
    const t = setInterval(() => setRebaseSecs((s) => (s > 0 ? s - 1 : 10_800)), 1000);
    return () => clearInterval(t);
  }, []);

  function copyAddr() {
    navigator.clipboard.writeText('membra-qr-gateway').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 px-4 pt-4 pb-3">
        <div className="neo-glass max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#FF8A1F,#9A6A35)', boxShadow: '0 0 16px rgba(255,138,31,0.35)' }}
            >
              <Hash className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-gradient">MEMBRA</span>
              <span className="text-sm font-bold text-text-primary"> · MCHAT IDO</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="neo-glass-sm px-3 py-1 text-[10px] font-bold text-success">
              SALE ACTIVE
            </span>
            <span className="neo-glass-sm px-3 py-1 text-[10px] font-bold text-primary-orange">
              DENOM $0.10
            </span>
            <span className="neo-glass-sm px-3 py-1 font-mono text-[10px] text-primary-gold">
              ⟳ {fmtCountdown(rebaseSecs)}
            </span>
            <button
              onClick={copyAddr}
              className="neo-raised neo-glass-sm px-4 py-1.5 text-xs font-semibold text-text-primary flex items-center gap-1.5"
            >
              <Github className="w-3.5 h-3.5 text-primary-orange" />
              {copied ? 'Copied!' : 'Source'}
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 pt-8">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="mb-10 text-center relative">
          {/* Ambient glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 rounded-full opacity-20"
              style={{ background: 'radial-gradient(ellipse, rgba(255,138,31,0.6) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          </div>

          <div className="relative">
            <p className="text-xs font-bold text-primary-orange uppercase tracking-[0.3em] mb-3">
              Early-Risk Curve · QR Tokenomics · Elastic Rebase
            </p>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-3">
              <span className="text-gradient">MCHAT</span>
              <span className="text-text-primary"> Token IDO</span>
            </h1>
            <p className="text-text-muted text-base max-w-2xl mx-auto mb-8">
              Buy at <strong className="text-primary-orange">$0.10 denomination</strong> · market oscillates $0.10–$1.00 ·
              every 3h a random <strong className="text-primary-gold">3% of holders</strong> get supply rebased ·
              bonus scales with holder count · no guaranteed profit
            </p>

            {/* Hero metric cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {HERO_METRICS.map((m) => (
                <div
                  key={m.label}
                  className={cn('neo-glass p-5 text-center', m.accent && 'neo-glow-orange')}
                >
                  <p className="text-[10px] text-text-muted uppercase tracking-widest mb-2">{m.label}</p>
                  <p className={cn(
                    'text-2xl font-black tracking-tight',
                    m.accent ? 'text-gradient' : 'text-text-primary'
                  )}>{m.value}</p>
                  <p className="text-[10px] text-text-muted mt-1">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Rebase live indicator */}
            <div className="inline-flex items-center gap-3 neo-glass px-6 py-3">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-text-muted">Next rebase in</span>
              <span className="text-lg font-black font-mono text-primary-gold">{fmtCountdown(rebaseSecs)}</span>
              <span className="text-xs text-text-muted">· 3% of {312} holders selected randomly · supply × holder_mult</span>
            </div>
          </div>
        </section>

        {/* ── IDO Workflow ─────────────────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-5 text-center">
            IDO Workflow — 12 Steps
          </h2>
          <div className="neo-glass p-6">
            <div className="flex items-start overflow-x-auto pb-4 scrollbar-thin gap-0">
              {IDO_STEPS.map((step, i) => (
                <StepNode key={step.n} step={step} index={i} total={IDO_STEPS.length} />
              ))}
            </div>

            {/* Status legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
              {[
                { color: 'bg-success',         label: 'Complete' },
                { color: 'bg-primary-orange',  label: 'Active now' },
                { color: 'bg-text-dim',        label: 'Pending' },
                { color: 'bg-background-300',  label: 'Locked until sale finalization' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <span className={cn('w-2 h-2 rounded-full', s.color)} />
                  <span className="text-[10px] text-text-muted">{s.label}</span>
                </div>
              ))}
              <div className="ml-auto">
                <span className="text-[10px] text-text-dim">Step 4 active · Wallet connection required to proceed</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Rebase mechanics explainer ────────────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-5 text-center">
            Elastic Rebase Mechanics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: RefreshCw,
                title: '$0.10 Denomination',
                color: 'text-primary-orange',
                glow: 'neo-glow-orange',
                body: 'The base reference price is 10 cents. Market price floats between $0.10 and $1.00 each epoch. The gap between market and denomination determines the rebase factor.',
                formula: 'factor = market ÷ $0.10',
              },
              {
                icon: Users,
                title: '3% Random Selection',
                color: 'text-primary-gold',
                glow: 'neo-glow-gold',
                body: 'Every 3 hours, 3% of token holders are picked at random. They receive bonus tokens equal to their balance multiplied by (factor − 1) × holder_multiplier.',
                formula: 'bonus = bal × (factor − 1) × hMult',
              },
              {
                icon: BarChart2,
                title: 'Holder Count Amplifier',
                color: 'text-success',
                glow: 'neo-glow-success',
                body: 'More holders = larger epoch bonus for winners. The multiplier grows with the holder count, rewarding community growth before the market absorbs supply.',
                formula: 'hMult = 1 + (n ÷ 5000) × 0.4',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className={cn('neo-glass p-5', card.glow)}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl neo-glass-sm flex items-center justify-center">
                      <Icon className={cn('w-4 h-4', card.color)} />
                    </div>
                    <h3 className={cn('text-sm font-bold', card.color)}>{card.title}</h3>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed mb-3">{card.body}</p>
                  <div className="neo-inset rounded-lg px-3 py-2">
                    <code className={cn('text-xs font-mono', card.color)}>{card.formula}</code>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Interactive: EarlyRiskCurveFlow ──────────────────────────────── */}
        <section className="mb-10">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-5 text-center">
            Live Contribution + Rebase Simulator
          </h2>
          <EarlyRiskCurveFlow />
        </section>

        {/* ── Split ────────────────────────────────────────────────────────── */}
        <SplitSection />

        {/* ── Protocol spec quick reference ────────────────────────────────── */}
        <section className="mb-8">
          <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 text-center">
            Protocol Endpoints
          </h2>
          <div className="neo-glass p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { method: 'POST', path: '/api/token-sale',            desc: 'Create IDO sale'                        },
                { method: 'GET',  path: '/api/token-sale/{id}',       desc: 'Sale state + current curve price'       },
                { method: 'POST', path: '/api/token-sale/calculate',  desc: 'Quote tokens for contribution amount'   },
                { method: 'POST', path: '/api/token-sale/contribute', desc: 'Record contribution + issue receipt'    },
                { method: 'POST', path: '/api/rebase/trigger',        desc: 'Trigger 3h epoch (admin key required)'  },
                { method: 'GET',  path: '/api/rebase/{id}/state',     desc: 'Current market price + countdown'       },
                { method: 'GET',  path: '/api/rebase/{id}/history',   desc: 'All rebase epochs with supply history'  },
                { method: 'GET',  path: '/api/rebase/{id}/wallet/{a}','desc': 'Per-wallet rebase events + balance'   },
              ].map((ep) => (
                <div key={ep.path} className="neo-glass-sm px-4 py-2.5 flex items-center gap-3">
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded font-mono flex-shrink-0',
                    ep.method === 'GET'  ? 'bg-success/15 text-success'           :
                    ep.method === 'POST' ? 'bg-primary-orange/15 text-primary-orange' : ''
                  )}>{ep.method}</span>
                  <code className="text-xs font-mono text-text-primary flex-1 truncate">{ep.path}</code>
                  <span className="text-[10px] text-text-muted flex-shrink-0 hidden md:inline">{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <DoctrineFooter />
      </div>
    </div>
  );
}
