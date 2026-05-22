import React, { useState, useEffect } from 'react';
import { LandingPage } from './components/landing/LandingPage';
import { EarlyRiskCurveFlow } from './components/tokenomics/EarlyRiskCurveFlow';
import { TokenSaleLive } from './components/tokenomics/TokenSaleLive';
import { LLMInferencePanel } from './components/llm/LLMInferencePanel';
import { Overview } from './components/dashboard/Overview';
import { SettingsPanel } from './components/dashboard/SettingsPanel';
import { InventoryGrid } from './components/artifacts/InventoryGrid';
import { ArtifactCreator } from './components/artifacts/ArtifactCreator';
import { WalletPanel } from './components/wallet/WalletPanel';
import { api } from './services/api';
import {
  LayoutDashboard, 
  Lightbulb, 
  Box, 
  BookOpen, 
  Wallet, 
  DollarSign, 
  BarChart3, 
  Shield, 
  Settings,
  Scan,
  Hash,
  Fingerprint,
  Github,
  Copy,
  ExternalLink,
  Smartphone,
  ChevronRight,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Layers,
  Cpu,
  Network,
  QrCode,
  Zap,
  GitBranch,
  FileText,
  Image as ImageIcon,
  Plus,
  MoreHorizontal,
  Home,
  Package,
  MapPin,
  Users,
  TrendingUp,
  Lock,
  Unlock,
  Wrench,
  Sofa,
  Armchair,
  Refrigerator,
  ShoppingCart,
  Truck,
  Star,
  Target,
  Building,
  Database,
  Workflow,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDown,
  Timer,
  Calendar,
  CreditCard,
  BadgeCheck,
  AlertTriangle,
  Play,
  Pause,
  Eye,
  EyeOff,
  ShieldCheck,
  Vault,
  Key,
  FileLock,
  ToggleLeft,
  ToggleRight,
  Ban,
  ArrowRightCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  Sparkles,
  Radio,
  Receipt,
  Banknote,
  Coins
} from 'lucide-react';
import { cn, truncateHash, formatCurrency } from './utils';

// Doctrine stages - v0 Architecture
const doctrineStages = [
  { icon: Lightbulb, label: 'Human Idea', desc: 'Raw concept or insight' },
  { icon: Lock, label: 'Consent Capture', desc: 'User approval and boundaries' },
  { icon: Layers, label: 'LLM Structuring', desc: 'AI-powered organization' },
  { icon: ShieldCheck, label: 'Redaction', desc: 'Private-alpha protection' },
  { icon: FileText, label: 'Artifact Manifest', desc: 'Structured artifact record' },
  { icon: Hash, label: 'SHA-256 Hash', desc: 'Cryptographic fingerprint' },
  { icon: Sparkles, label: 'LLM Notary Assist', desc: 'Summary, classify, flag risks' },
  { icon: Shield, label: 'Human Notary/KYC', desc: 'Identity verification checkpoint' },
  { icon: Network, label: 'Testnet Receipt', desc: 'On-chain proof (not money)' },
  { icon: Radio, label: 'Public Proof Capsule', desc: 'TikTok/YouTube export' },
  { icon: ShoppingCart, label: 'Market Listing', desc: 'Offer/bounty/license/sponsorship' },
  { icon: CreditCard, label: 'Stripe Settlement', desc: 'Fiat payment = official money' },
  { icon: GitBranch, label: 'Optional Mainnet', desc: 'Post-settlement anchor' },
];

// Navigation items
const navItems = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: Home, label: 'Inventory' },
  { icon: Target, label: 'Intent' },
  { icon: MapPin, label: 'Local Match' },
  { icon: Lightbulb, label: 'Ideas' },
  { icon: Box, label: 'Artifacts' },
  { icon: BookOpen, label: 'Ledger' },
  { icon: Wallet, label: 'Wallet' },
  { icon: DollarSign, label: 'Payouts' },
  { icon: BarChart3, label: 'Analytics' },
  { icon: Cpu, label: 'AI Engine' },
  { icon: Shield, label: 'Trust Center' },
  { icon: Settings, label: 'Settings' },
];

// (static mock data removed — all components now consume live API data)

// OS layers
const osLayers = [
  { name: 'InventoryOS', icon: Database, desc: 'Maps asset graph through household scanning', color: 'from-[var(--accent-orange)] to-[var(--accent-gold)]' },
  { name: 'IntentOS', icon: Target, desc: 'Captures owner constraints and willingness signals', color: 'from-[var(--accent-gold)] to-[var(--accent-bronze)]' },
  { name: 'ListingOS', icon: Package, desc: 'Packages assets into structured SKUs', color: 'from-[var(--accent-orange)] to-[var(--accent-bronze)]' },
  { name: 'RentOS', icon: Timer, desc: 'Manages time blocks and availability windows', color: 'from-[var(--accent-gold)] to-primary-orange' },
  { name: 'BasicNeedsOS', icon: ShoppingCart, desc: 'Commodifies recurring utility patterns', color: 'from-[var(--accent-bronze)] to-primary-orange' },
  { name: 'RiskOS', icon: Shield, desc: 'Classifies safety and trustworthiness', color: 'from-[var(--accent-orange)] to-[var(--accent-gold)]' },
  { name: 'AccessOS', icon: Lock, desc: 'Controls entry rules and permissions', color: 'from-[var(--accent-gold)] to-[var(--accent-bronze)]' },
  { name: 'TrustOS', icon: BadgeCheck, desc: 'Builds reputation from completed transactions', color: 'from-[var(--accent-orange)] to-[var(--accent-bronze)]' },
  { name: 'FulfillmentOS', icon: Truck, desc: 'Handles real-world handoff coordination', color: 'from-[var(--accent-gold)] to-primary-orange' },
  { name: 'SettlementOS', icon: CreditCard, desc: 'Converts micro-usage into settled payments', color: 'from-[var(--accent-bronze)] to-primary-orange' },
];

// (static recentArtifacts and chainNodes removed — now fed from live API)

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
    <div className="neo-card p-8 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gradient mb-2">Join the Human Chain</h2>
          <p className="text-[var(--text-muted)] max-w-2xl">
            Start with consent. Capture only what you approve. Turn your work, inventory, speech, ideas, and artifacts into verified proof streams.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] text-sm font-medium hover:bg-[var(--accent-orange)]/20 transition-colors">
            Configure Consent
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-bronze)] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Create First Proof Capsule
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-4">
        {onboardingSteps.map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-3 min-w-[200px]">
                <div className="neo-card p-4 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[var(--accent-orange)]" />
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      step.status === 'Required' ? "bg-danger/20 text-[var(--accent-danger)]" :
                      step.status === 'Active' ? "bg-success/20 text-[var(--accent-success)]" :
                      step.status === 'Locked' ? "bg-[var(--bg-elevated)] text-[var(--text-muted)]" :
                      "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]"
                    )}>
                      {step.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{step.label}</h3>
                  <p className="text-xs text-[var(--text-muted)]">{step.desc}</p>
                </div>
                {i < onboardingSteps.length - 1 && (
                  <div className="w-8 h-px bg-gradient-to-r from-[var(--accent-orange)]/50 to-transparent flex-shrink-0" />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] text-sm hover:bg-white/10 transition-colors">
          <Github className="w-4 h-4" />
          Connect GitHub / IPFS
        </button>
      </div>
    </div>
  );
}

// ── Split Bar ─────────────────────────────────────────────────────────────────
function SplitSection() {
  return (
    <div className="neo-card p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gradient flex items-center gap-2">
            <Workflow className="w-6 h-6 text-[var(--accent-orange)]" />
            Value State Machine v0
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1">GitHub: overandor/chat-pipeline • Commit: cd348d5</p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {states.map((state, i) => {
          const Icon = state.icon;
          return (
            <React.Fragment key={state.label}>
              <div className={cn(
                "min-w-[140px] p-3 rounded-xl border transition-all relative",
                state.isMoney 
                  ? "bg-gradient-to-br from-[var(--accent-gold)]/20 to-[var(--accent-bronze)]/10 border-[var(--accent-gold)]/30 shadow-glow-amber" 
                  : "bg-[var(--bg-card)] border-[var(--accent-orange)]/20"
              )}>
                {state.boundary && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-danger/20 border border-[var(--accent-danger)]/30 text-xs text-[var(--accent-danger)] font-medium">
                    ≠ Money
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                    state.isMoney 
                      ? "bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-bronze)]" 
                      : "bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/30"
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", state.isMoney ? "text-white" : "text-[var(--accent-orange)]")} />
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    state.isMoney ? "text-[var(--accent-gold)]" : "text-[var(--accent-orange)]"
                  )}>
                    {state.number}
                  </span>
                </div>
                <h4 className={cn("font-semibold text-xs mb-1 leading-tight", state.isMoney ? "text-[var(--accent-gold)]" : "text-[var(--text-primary)]")}>
                  {state.label}
                </h4>
                <p className="text-xs text-[var(--text-muted)] leading-tight">{state.example}</p>
              </div>
              {i < states.length - 1 && (
                <ArrowRight className={cn("w-4 h-4 flex-shrink-0", state.isMoney ? "text-[var(--accent-gold)]/50" : "text-[var(--accent-orange)]/50")} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-danger)]/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Hard Boundaries v0</p>
            <p className="text-xs text-[var(--text-muted)]">
              Proof value ≠ official money • Market signal ≠ official money • Notary review ≠ guaranteed value • Testnet receipt ≠ official money • <span className="text-[var(--accent-gold)] font-medium">Stripe settled payment = official fiat money</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProofOfLifeTimeline = () => {
  const events = [
    { time: '10:12 AM', source: 'Speech Capture', hash: '0x8f3a...', privacy: 'Private', settlement: 'Unsettled' },
    { time: '10:14 AM', source: 'LLM Summary', hash: '0x2b1c...', privacy: 'Redacted', settlement: 'Unsettled' },
    { time: '10:15 AM', source: 'Redaction Engine', hash: '0x7d4e...', privacy: 'Encrypted', settlement: 'Unsettled' },
    { time: '10:16 AM', source: 'Hash Generator', hash: '0x9a2f...', privacy: 'Anchored', settlement: 'Unsettled' },
    { time: '10:17 AM', source: 'GitHub Anchor', hash: '0x1c8b...', privacy: 'Public', settlement: 'Unsettled' },
    { time: '10:20 AM', source: 'TikTok Export', hash: '0x3e7d...', privacy: 'Public', settlement: 'Signal' },
    { time: '10:45 AM', source: 'Viewer Lead', hash: '0x5f2a...', privacy: 'Public', settlement: 'Pending' },
    { time: '11:05 AM', source: 'Settlement Queue', hash: '0x8b4c...', privacy: 'Public', settlement: 'Paid' },
  ];

  return (
    <div className="neo-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-[var(--accent-orange)]" />
        Proof-of-Life Timeline
      </h3>

      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
            <div className="text-xs text-[var(--text-muted)] font-mono w-20 flex-shrink-0">{event.time}</div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">{event.source}</p>
              <p className="text-xs mono text-[var(--accent-orange)]">{event.hash}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                event.privacy === 'Public' ? "bg-success/20 text-[var(--accent-success)]" :
                event.privacy === 'Private' ? "bg-[var(--bg-elevated)] text-[var(--text-muted)]" :
                event.privacy === 'Encrypted' ? "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]" :
                "bg-primary-gold/20 text-[var(--accent-gold)]"
              )}>
                {event.privacy}
              </span>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                event.settlement === 'Paid' ? "bg-success/20 text-[var(--accent-success)]" :
                event.settlement === 'Pending' ? "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]" :
                event.settlement === 'Signal' ? "bg-primary-gold/20 text-[var(--accent-gold)]" :
                "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}>
                {event.settlement}
              </span>
            </div>
          </div>
        ))}
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
    <div className="neo-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-[var(--accent-orange)]" />
        Consent Firewall
      </h3>

      <div className="space-y-3 mb-6">
        {[
          { key: 'captureSpeech', label: 'Capture speech' },
          { key: 'captureScreen', label: 'Capture screen' },
          { key: 'captureGitHub', label: 'Capture GitHub activity' },
          { key: 'captureInventory', label: 'Capture household inventory' },
          { key: 'llmSummarization', label: 'Allow LLM summarization' },
          { key: 'publicProofCapsule', label: 'Allow public proof capsule' },
          { key: 'tiktokExport', label: 'Allow TikTok export' },
          { key: 'walletAddress', label: 'Allow wallet address display' },
          { key: 'paymentLink', label: 'Allow payment link display' },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
            <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
            <button
              onClick={() => setConsentToggles(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                consentToggles[item.key] ? "bg-primary-orange" : "bg-[var(--bg-elevated)]"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                consentToggles[item.key] ? "right-1" : "left-1"
              )} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-danger)]/20 mb-4">
        <p className="text-xs text-[var(--accent-danger)] font-medium mb-3">Hard-Blocked (Never Enabled)</p>
        <div className="space-y-2">
          {hardBlocked.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20">
                <Icon className="w-4 h-4 text-[var(--accent-danger)]" />
                <span className="text-sm text-[var(--text-muted)]">{item.label}</span>
                <Ban className="w-4 h-4 text-[var(--accent-danger)] ml-auto" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <span className="text-[var(--accent-orange)] font-medium">MEMBRA monetizes approved artifacts, not personhood.</span> The human remains the controller.
        </p>
      </div>
    </div>
  );
};

const PrivateAlphaPreservation = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Vault className="w-5 h-5 text-[var(--accent-orange)]" />
      Private Alpha Preservation
    </h3>

    <div className="relative p-6 rounded-xl bg-gradient-to-br from-background-100 to-background-50 border border-[var(--accent-orange)]/20 mb-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-[var(--accent-success)]" />
            <span className="text-xs font-medium text-[var(--accent-success)]">Public</span>
          </div>
          <ul className="space-y-1 text-xs text-[var(--text-muted)]">
            <li>• Hash</li>
            <li>• Timestamp</li>
            <li>• Metadata</li>
            <li>• Proof capsule</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/20">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent-orange)]" />
            <span className="text-xs font-medium text-[var(--accent-orange)]">Protected</span>
          </div>
          <ul className="space-y-1 text-xs text-[var(--text-muted)]">
            <li>• Encrypted payload</li>
            <li>• Redacted transcript</li>
            <li>• Hidden strategy</li>
            <li>• Private dataset</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-[var(--accent-danger)]" />
            <span className="text-xs font-medium text-[var(--accent-danger)]">Never Public</span>
          </div>
          <ul className="space-y-1 text-xs text-[var(--text-muted)]">
            <li>• Private keys</li>
            <li>• Seed phrases</li>
            <li>• Raw KYC</li>
            <li>• Unrevealed alpha</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-3">
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Preservation Score</p>
        <p className="text-lg font-bold text-[var(--accent-success)]">8.7 / 10</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Leakage Risk</p>
        <p className="text-lg font-bold text-[var(--accent-success)]">Low</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Proof Strength</p>
        <p className="text-lg font-bold text-[var(--accent-orange)]">High</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Reveal Status</p>
        <p className="text-lg font-bold text-[var(--accent-gold)]">Delayed</p>
      </div>
    </div>
  </div>
);

  function copyAddr() {
    navigator.clipboard.writeText('membra-qr-gateway').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="neo-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-[var(--accent-orange)]" />
        External Settlement Rails
      </h3>

      <div className="space-y-2 mb-4">
        {rails.map((rail, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
            <span className="text-sm text-[var(--text-primary)]">{rail.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-xs mono text-[var(--text-muted)]">{rail.ref}</span>
              <span className="text-xs text-[var(--text-muted)]">{rail.amount}</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                {rail.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/20">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <span className="text-[var(--accent-orange)] font-medium">Settlement Doctrine:</span> Until one of these rails confirms value, the artifact remains proof/product/signal — not official money.
        </p>
      </div>
    </div>
  );
};

const LiveStudioArchitecture = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Radio className="w-5 h-5 text-[var(--accent-orange)]" />
      MEMBRA Live Proof-of-Chat Studio Architecture
    </h3>

    <div className="grid grid-cols-4 gap-4 mb-4">
      <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/10 to-[var(--accent-bronze)]/5 border border-[var(--accent-orange)]/20">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-5 h-5 text-[var(--accent-orange)]" />
          <h4 className="font-semibold text-sm">Browser Studio</h4>
        </div>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Screen share</li>
          <li>• Webcam</li>
          <li>• Microphone</li>
          <li>• Prompt editor</li>
          <li>• LLM response panel</li>
          <li>• Artifact approval</li>
          <li>• Solana wallet connect</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/10 to-[var(--accent-bronze)]/5 border border-[var(--accent-orange)]/20">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-[var(--accent-orange)]" />
          <h4 className="font-semibold text-sm">Realtime Backend</h4>
        </div>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• WebRTC ingest</li>
          <li>• Transcript capture</li>
          <li>• Prompt/response logger</li>
          <li>• Image frame sampler</li>
          <li>• Artifact builder</li>
          <li>• LLM appraisal engine</li>
          <li>• Risk/privacy filter</li>
          <li>• Payout eligibility</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/10 to-[var(--accent-bronze)]/5 border border-[var(--accent-orange)]/20">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-5 h-5 text-[var(--accent-orange)]" />
          <h4 className="font-semibold text-sm">Provenance Layer</h4>
        </div>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• SHA-256 hashes</li>
          <li>• GitHub artifact ledger</li>
          <li>• IPFS metadata</li>
          <li>• Solana receipt program</li>
          <li>• Support-payment contract</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--accent-gold)]/10 to-[var(--accent-bronze)]/5 border border-[var(--accent-gold)]/30">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-[var(--accent-gold)]" />
          <h4 className="font-semibold text-sm">Payment Layer</h4>
        </div>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Prefunded SOL/USDC pool</li>
          <li>• Creator payout wallet</li>
          <li>• Support receipt account</li>
          <li>• Payout tx hash</li>
          <li>• Withdrawal ledger</li>
        </ul>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-danger)]/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Hard Boundaries</p>
          <p className="text-xs text-[var(--text-muted)]">
            LLM appraisal ≠ money • Chat artifact ≠ payment • Solana wallet ≠ funding source • Immediate withdrawal requires existing funded pool, buyer, sponsor, bounty, donor, grant, or escrow
          </p>
        </div>
      </nav>

  return (
    <div className="neo-card p-6 mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Workflow className="w-5 h-5 text-[var(--accent-orange)]" />
        User Experience Flow
      </h3>

      <div className="grid grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <div key={i} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[var(--accent-orange)]">{step.number}</span>
              <div className="w-2 h-2 rounded-full bg-success" />
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-tight">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ArtifactSchema = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <FileText className="w-5 h-5 text-[var(--accent-orange)]" />
      Artifact Schema
    </h3>

    <div className="bg-[var(--bg-card)] rounded-xl p-4 font-mono text-xs overflow-x-auto">
      <pre className="text-[var(--text-muted)]">{`{
  "artifact_id": "MEMBRA-LIVE-CHAT-000001",
  "creator_wallet": "SOLANA_PUBLIC_WALLET",
  "session_id": "LIVE-SESSION-UUID",
  "artifact_type": "prompt_response_pair",
  "prompt_hash": "sha256...",
  "response_hash": "sha256...",
  "screen_frame_hashes": ["sha256..."],
  "webcam_frame_hashes": ["sha256..."],
  "transcript_hash": "sha256...",
  "llm_appraisal_usd": 12.50,
  "privacy_status": "approved_redacted",
  "funding_source": "prefunded_pool | donor | buyer",
  "payment_status": "unfunded | eligible | paid",
  "payout_token": "USDC",
  "payout_tx": "SOLANA_TX_SIGNATURE",
  "github_anchor": "commit_sha",
  "ipfs_cid": "cid",
  "created_at": "timestamp"
}`}</pre>
    </div>
  </div>
);

const ScreenLayout = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <LayoutDashboard className="w-5 h-5 text-[var(--accent-orange)]" />
      Screen Layout
    </h3>

    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <h4 className="font-semibold text-sm mb-2 text-[var(--accent-orange)]">Top Bar</h4>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Connected wallet</li>
          <li>• Live session timer</li>
          <li>• Current appraisal total</li>
          <li>• Withdrawable balance</li>
          <li>• Privacy mode</li>
          <li>• Recording status</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <h4 className="font-semibold text-sm mb-2 text-[var(--accent-orange)]">Left Panel</h4>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Screen share preview</li>
          <li>• Webcam preview</li>
          <li>• Audio/transcript status</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <h4 className="font-semibold text-sm mb-2 text-[var(--accent-orange)]">Center Panel</h4>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Prompt input</li>
          <li>• LLM response</li>
          <li>• &ldquo;Convert to Artifact&rdquo; button</li>
          <li>• Approve / Redact / Reject</li>
        </ul>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <h4 className="font-semibold text-sm mb-2 text-[var(--accent-orange)]">Right Panel</h4>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Live appraisal feed</li>
          <li>• Artifact score</li>
          <li>• Funding eligibility</li>
          <li>• Payout status</li>
          <li>• Solana tx hash</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <h4 className="font-semibold text-sm mb-2 text-[var(--accent-orange)]">Bottom Panel</h4>
        <ul className="space-y-1 text-xs text-[var(--text-muted)]">
          <li>• Session ledger</li>
          <li>• GitHub commits</li>
          <li>• IPFS CIDs</li>
          <li>• Solana receipts</li>
        </ul>
      </div>
    </div>
  </div>
);

const AppraisalFormula = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <TrendingUp className="w-5 h-5 text-[var(--accent-orange)]" />
      Real-Time Appraisal Formula
    </h3>

    <div className="bg-[var(--bg-card)] rounded-xl p-4 mb-4">
      <pre className="text-sm text-[var(--text-primary)] font-mono">{`artifact_value =
  base_text_value
  + originality_score
  + implementation_score
  + proof_strength
  + usefulness_score
  + live_build_context_bonus
  + commercial_relevance_bonus
  - privacy_risk_penalty
  - duplicate_content_penalty`}</pre>
    </div>

    <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
      <p className="text-xs text-[var(--text-muted)]">
        <span className="text-[var(--accent-orange)] font-medium">Payment Rule:</span> If artifact approved AND artifact hashed AND artifact funding available AND wallet verified AND risk checks passed → send USDC/SOL payout to creator wallet, else create unpaid proof artifact.
      </p>
    </div>
  </div>
);

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

  return (
    <div className="neo-card p-6 mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Timer className="w-5 h-5 text-[var(--accent-orange)]" />
        Devnet MVP Phases
      </h3>

      <div className="space-y-3">
        {phases.map((phase, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 flex items-center justify-center">
              <span className="text-xs font-bold text-[var(--accent-orange)]">{phase.phase}</span>
            </div>
            <span className="text-sm text-[var(--text-primary)] flex-1">{phase.name}</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-muted)]">
              {phase.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TreasurySupportPool = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Wallet className="w-5 h-5 text-[var(--accent-orange)]" />
      MEMBRA Treasury / Support Pool
    </h3>

    <p className="text-sm text-[var(--text-muted)] mb-4">
      For immediate withdrawable money, the treasury must be funded by:
    </p>

    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Donations</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Subscriptions</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Sponsors</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Grants</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Bounties</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Buyers</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Licensing customers</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)]">Initial treasury</p>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-gradient-to-br from-[var(--accent-gold)]/10 to-[var(--accent-bronze)]/5 border border-[var(--accent-gold)]/30">
      <p className="text-sm font-medium text-[var(--accent-gold)] mb-1">Honest Equation</p>
      <p className="text-xs text-[var(--text-muted)]">
        Live chat + appraisal + proof = payable claim
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        Payable claim + funded Solana treasury = immediate wallet payout
      </p>
    </div>
  </div>
);

const QRWorkflowFlow = () => {
  const steps = [
    { number: 1, label: 'QR scan opens web page', desc: 'Not direct execution' },
    { number: 2, label: 'User reviews artifact terms', desc: 'Consent required' },
    { number: 3, label: 'User accepts terms', desc: 'Hash verification' },
    { number: 4, label: 'Wallet prompts transaction', desc: 'User signature required' },
    { number: 5, label: 'User signs locally', desc: 'No private key exposure' },
    { number: 6, label: 'SOL support payment sent', desc: 'To artifact vault' },
    { number: 7, label: 'Disclosed rebate returned', desc: 'To supporter wallet' },
    { number: 8, label: 'Creator allocation sent', desc: 'To creator wallet' },
    { number: 9, label: 'Support receipt created', desc: 'PDA account' },
    { number: 10, label: 'Proof event emitted', desc: 'On-chain record' },
  ];

  return (
    <div className="neo-card p-6 mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-[var(--accent-orange)]" />
        QR Gateway Workflow
      </h3>

      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className="flex items-center gap-3 min-w-[180px]">
              <div className="neo-card p-3 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-[var(--accent-orange)]">{step.number}</span>
                  <div className="w-2 h-2 rounded-full bg-success" />
                </div>
                <p className="text-xs font-medium mb-1">{step.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{step.desc}</p>
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-[var(--accent-orange)]/50 flex-shrink-0" />}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--accent-danger)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">QR ≠ Blind Execution</p>
            <p className="text-xs text-[var(--text-muted)]">
              QR opens context page • Wallet signs intent • Program records proof • Rebate is disclosed • Receipt is provenance • Support is not investment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SolanaWalletSignature = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Wallet className="w-5 h-5 text-[var(--accent-orange)]" />
      Solana Wallet Signature Flow
    </h3>

    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-sm font-medium text-[var(--accent-orange)] mb-2">MEMBRA App Prepares Transaction</p>
        <div className="bg-[var(--bg-dark)] rounded-lg p-3 font-mono text-xs text-[var(--text-muted)]">
          <pre>{`Transaction {
  supporter: SUPPORTER_PUBKEY
  creator: CREATOR_PUBKEY
  artifact: ARTIFACT_PDA
  artifactVault: VAULT_PDA
  amountLamports: 1000000
  acceptedTermsHash: [0x...]
  clientReferenceHash: [0x...]
}`}</pre>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <ArrowDown className="w-6 h-6 text-[var(--accent-orange)]" />
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-sm font-medium text-[var(--accent-orange)] mb-2">Wallet Shows Transaction</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-bronze)] flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-primary)]">Solana Wallet Popup</p>
            <p className="text-xs text-[var(--text-muted)]">Review transaction details</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <ArrowDown className="w-6 h-6 text-[var(--accent-orange)]" />
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-sm font-medium text-[var(--accent-orange)] mb-2">User Signs</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-bronze)] flex items-center justify-center">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-[var(--text-primary)]">Local signature</p>
            <p className="text-xs text-[var(--text-muted)]">No private key exposure</p>
          </div>
          <CheckCircle className="w-6 h-6 text-[var(--accent-success)]" />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <ArrowDown className="w-6 h-6 text-[var(--accent-orange)]" />
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-sm font-medium text-[var(--accent-orange)] mb-2">Program Records Receipt</p>
        <div className="bg-[var(--bg-dark)] rounded-lg p-3 font-mono text-xs text-[var(--text-muted)]">
          <pre>{`SupportRecorded Event {
  artifact: ARTIFACT_PDA
  supporter: SUPPORTER_PUBKEY
  creator: CREATOR_PUBKEY
  amountLamports: 1000000
  rebateLamports: 50000
  creatorLamports: 950000
  receipt: RECEIPT_PDA
  txSignature: 0x...
}`}</pre>
        </div>
      </div>
    </div>
  </div>
);

const ChatTokenization = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Coins className="w-5 h-5 text-[var(--accent-orange)]" />
      MCHAT Token Launch
    </h3>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Token Name</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">Membra Chat Proof</p>
      </div>
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Symbol</p>
        <p className="text-lg font-bold text-[var(--accent-orange)]">MCHAT</p>
      </div>
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Chain</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">Solana Mainnet</p>
      </div>
      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Standard</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">SPL / Token-2022</p>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 mb-4">
      <p className="text-sm font-medium text-[var(--accent-orange)] mb-2">Token Purpose</p>
      <ul className="space-y-1 text-xs text-[var(--text-muted)]">
        <li>• Access to public artifact dashboards</li>
        <li>• Support/membership status</li>
        <li>• Service credits</li>
        <li>• Proof-capsule participation</li>
        <li>• Contribution badges</li>
        <li>• Community voting</li>
        <li>• Bounty coordination</li>
        <li>• Notary-review credit accounting</li>
      </ul>
    </div>

    <div className="p-4 rounded-xl bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20">
      <p className="text-xs text-[var(--accent-danger)] font-medium mb-2">What It Is Not</p>
      <ul className="space-y-1 text-xs text-[var(--text-muted)]">
        <li>• Ownership of a person</li>
        <li>• Guaranteed profit</li>
        <li>• Claim on future income</li>
        <li>• Official OpenAI money</li>
        <li>• Security or investment product without legal structure</li>
      </ul>
    </div>
  </div>
);

const DeterministicProfitCapture = () => {
  const states = [
    { number: 1, label: 'COMPUTE_ALLOCATED', desc: 'GPU/LLM budget assigned to job', status: 'Active', proof: 'Job spec + cost basis estimate' },
    { number: 2, label: 'VALUE_DENSITY_GENERATED', desc: 'LLM produces artifact; scored for value density', status: 'Complete', proof: 'Artifact hash + density score' },
    { number: 3, label: 'ARTIFACT_PROVEN', desc: 'SHA-256 hash + model provenance recorded', status: 'Complete', proof: 'Proof packet on-chain' },
    { number: 4, label: 'MARKET_ROUTED', desc: 'Artifact routed to best-fit market by score', status: 'Complete', proof: 'Route decision record' },
    { number: 5, label: 'PAYMENT_REQUESTED', desc: 'Invoice created with artifact hash anchor', status: 'Active', proof: 'Invoice ID + amount USD' },
    { number: 6, label: 'SETTLEMENT_WATCHING', desc: 'Polling/webhook waiting for external settlement', status: 'Watching', proof: 'Watcher heartbeat' },
    { number: 7, label: 'PAYMENT_RECEIVED / NO_PAYMENT', desc: 'Counterparty pays or does not pay', status: 'Pending', proof: 'Settlement receipt or timeout' },
    { number: 8, label: 'COST_BASIS_CALCULATED', desc: 'Input + output token costs summed', status: 'Auto', proof: 'Cost basis USD' },
    { number: 9, label: 'PROFIT_CAPTURED / LOSS_RECORDED', desc: 'Net = Revenue - Cost Basis. Only settled profit is real.', status: 'Locked', proof: 'Net profit/loss USD' },
    { number: 10, label: 'CONSENSUS_FINALIZED', desc: 'Multi-attestor consensus finalizes on-chain state', status: 'Requires attestations', proof: 'Attestation count ≥ threshold' },
  ];

  const outcomeBadges = [
    { label: 'Deterministic Workflow', value: 'Active', color: 'text-[var(--accent-success)]' },
    { label: 'Profit Generation Claim', value: 'DISABLED', color: 'text-[var(--accent-danger)]' },
    { label: 'Value Density Generated', value: 'Yes', color: 'text-[var(--accent-success)]' },
    { label: 'Payment Requested', value: 'Yes', color: 'text-[var(--accent-success)]' },
    { label: 'Settlement Received', value: 'No', color: 'text-[var(--text-muted)]' },
    { label: 'Captured Profit', value: '$0.00 until settled', color: 'text-[var(--text-muted)]' },
    { label: 'Consensus Status', value: 'Pending', color: 'text-[var(--accent-gold)]' },
  ];

  return (
    <div className="neo-card p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--accent-orange)]" />
          Deterministic Profit Capture v0
        </h3>
        <div className="px-3 py-1 rounded-full bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 text-[var(--accent-danger)] text-xs font-bold">
          PROFIT GENERATION CLAIM: DISABLED
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)] mb-4">
        MEMBRA deterministically transforms compute into value-density artifacts, routes them toward markets, and captures verified profit events by consensus when external settlement occurs.
      </p>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {outcomeBadges.map((badge) => (
          <div key={badge.label} className="p-2 rounded-lg bg-[var(--bg-card)] border border-white/5 text-center">
            <p className="text-[10px] text-[var(--text-muted)] leading-tight">{badge.label}</p>
            <p className={`text-xs font-bold ${badge.color}`}>{badge.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4">
        {states.map((state, i) => (
          <React.Fragment key={state.label}>
            <div className={cn(
              "flex-shrink-0 w-48 p-3 rounded-xl border transition-all",
              state.status === 'Active' ? 'bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30' :
              state.status === 'Complete' ? 'bg-[var(--accent-success)]/10 border-[var(--accent-success)]/30' :
              state.status === 'Watching' ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)]/30' :
              state.status === 'Pending' ? 'bg-[var(--bg-card)] border-white/5' :
              'bg-[var(--bg-card)] border-white/5'
            )}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                  state.status === 'Active' ? 'bg-primary-orange text-white' :
                  state.status === 'Complete' ? 'bg-success text-white' :
                  state.status === 'Watching' ? 'bg-primary-gold text-black' :
                  'bg-white/10 text-[var(--text-muted)]'
                )}>
                  {state.number}
                </span>
                <span className="text-xs font-semibold">{state.label}</span>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mb-1">{state.desc}</p>
              <p className="text-[10px] text-[var(--accent-gold)]">{state.proof}</p>
            </div>
            {i < states.length - 1 && (
              <ArrowRight className="w-5 h-5 text-[var(--accent-orange)]/30 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-[var(--accent-danger)]/5 border border-[var(--accent-danger)]/20">
        <p className="text-xs text-[var(--accent-danger)] font-semibold mb-1">Doctrinal Truth</p>
        <p className="text-xs text-[var(--text-muted)]">
          Expected Profit = P(Settlement) × Expected Revenue − Cost Basis. Captured Profit = Settled Revenue − Cost Basis. Only captured profit is real. A MEMBRA smart contract never contains <code>generate_profit</code>. It contains <code>submit_revenue_attempt</code>, <code>capture_profit</code>, and <code>record_loss</code>.
        </p>
      </div>
    </div>
  );
};

const TokenLaunchStateMachine = () => {
  const states = [
    { 
      number: 1, 
      label: 'Draft Manifest', 
      desc: 'Launch thesis, token purpose, safety boundaries, utility terms',
      status: 'Complete',
      proof: 'GitHub manifest committed'
    },
    { 
      number: 2, 
      label: 'Metadata Prepared', 
      desc: 'Token name, symbol, description, image URI, external URL, attributes',
      status: 'Pending',
      proof: 'Metadata JSON + SHA-256'
    },
    { 
      number: 3, 
      label: 'Legal / Compliance Review', 
      desc: 'Securities, consumer protection, tax, sanctions, KYC/AML, advertising claims',
      status: 'Required',
      proof: 'Review memo or counsel checkpoint'
    },
    { 
      number: 4, 
      label: 'Testnet Dry Run', 
      desc: 'Devnet mint, metadata, transfer, proof capsule, mock Stripe bridge',
      status: 'Required',
      proof: 'Testnet tx hash'
    },
    { 
      number: 5, 
      label: 'Mainnet Mint Created', 
      desc: 'SPL Token or Token-2022 mint created by signed Solana mainnet transaction',
      status: 'Locked until signed',
      proof: 'Mainnet mint address + explorer link',
      decisive: true
    },
    { 
      number: 6, 
      label: 'Metadata Finalized', 
      desc: 'IPFS/Arweave metadata attached and verified',
      status: 'Locked',
      proof: 'Metadata URI + metadata hash'
    },
    { 
      number: 7, 
      label: 'Authority Policy Set', 
      desc: 'Mint authority, freeze authority, metadata update authority, multisig policy',
      status: 'Required before public launch',
      proof: 'Authority transaction signatures'
    },
    { 
      number: 8, 
      label: 'Public Proof Capsule Posted', 
      desc: 'GitHub issue/file containing mint address, tx hash, metadata hash, boundaries',
      status: 'Pending',
      proof: 'GitHub anchor'
    },
    { 
      number: 9, 
      label: 'Liquidity / Distribution Decision', 
      desc: 'No initial liquidity, manual distribution, access credits, or controlled pool',
      status: 'Governance decision',
      proof: 'Published distribution terms'
    },
    { 
      number: 10, 
      label: 'Support Economy Active', 
      desc: 'Token used for access, proof participation, service credits, notary credits, or support',
      status: 'Only after launch',
      proof: 'Public dashboard + receipts'
    },
    { 
      number: 11, 
      label: 'External Settlement Recorded', 
      desc: 'Stripe payment, invoice, contract, license, bounty, grant, or sponsorship settles',
      status: 'Separate from token',
      proof: 'Settlement receipt hash'
    },
  ];

  const checklistItems = [
    'Owner wallet selected',
    'Wallet funded with SOL',
    'SPL Token or Token-2022 selected',
    'Supply and decimals defined',
    'Metadata JSON prepared',
    'Metadata hash generated',
    'Legal/compliance review completed',
    'Testnet dry run completed',
    'Mainnet mint created',
    'Mint authority policy set',
    'Freeze authority policy set',
    'Treasury/public wallet declared',
    'GitHub proof capsule posted',
    'Risk disclosures published',
    'Utility terms published',
  ];

  return (
    <div className="neo-card p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[var(--accent-orange)]" />
          Solana Mainnet Token Launch State Machine
        </h3>
        <div className="px-3 py-1 rounded-full bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] text-xs font-bold">
          MCHAT STATUS: MANIFESTED, NOT MINTED
        </div>
      </div>
      
      <p className="text-xs text-[var(--text-muted)] mb-6">
        MCHAT exists only after a signed mainnet mint transaction creates a public mint address.
      </p>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        {states.map((state, i) => (
          <React.Fragment key={state.label}>
            <div className={cn(
              "min-w-[160px] p-3 rounded-xl border transition-all relative",
              state.decisive 
                ? "bg-gradient-to-br from-danger/20 to-[var(--accent-bronze)]/10 border-[var(--accent-danger)]/30 shadow-glow-red" 
                : state.status === 'Complete' 
                  ? "bg-[var(--accent-success)]/10 border-[var(--accent-success)]/30" 
                  : "bg-[var(--bg-card)] border-white/5"
            )}>
              {state.decisive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-danger/20 border border-[var(--accent-danger)]/30 text-xs text-[var(--accent-danger)] font-bold">
                  NO MINT = NO TOKEN
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-[var(--accent-orange)]">{state.number}</span>
                {state.status === 'Complete' ? (
                  <CheckCircle className="w-3 h-3 text-[var(--accent-success)]" />
                ) : state.decisive ? (
                  <Ban className="w-3 h-3 text-[var(--accent-danger)]" />
                ) : (
                  <HelpCircle className="w-3 h-3 text-[var(--text-muted)]" />
                )}
              </div>
              <p className="text-xs font-medium mb-1 leading-tight">{state.label}</p>
              <p className="text-xs text-[var(--text-muted)] leading-tight mb-2">{state.desc}</p>
              <p className="text-xs text-[var(--accent-orange)] font-medium">Proof: {state.proof}</p>
            </div>
            {i < states.length - 1 && <ArrowRight className="w-4 h-4 text-[var(--accent-orange)]/50 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20 mb-6">
        <p className="text-xs text-[var(--accent-danger)] font-medium mb-2">
          MCHAT is not equity, not person ownership, not guaranteed profit, not OpenAI money, and not official fiat settlement.
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          Proof ≠ Money • Token ≠ Profit • Testnet ≠ Settlement • Mint Address = Token Exists • Stripe Settlement = Official Fiat Money
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
          <p className="text-xs text-[var(--text-muted)] mb-3">Token Identity</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Name</span>
              <span className="text-xs font-medium text-[var(--text-primary)]">Membra Chat Proof</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Symbol</span>
              <span className="text-xs font-bold text-[var(--accent-orange)]">MCHAT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Chain</span>
              <span className="text-xs font-medium text-[var(--text-primary)]">Solana mainnet-beta</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Standard</span>
              <span className="text-xs font-medium text-[var(--text-primary)]">SPL / Token-2022</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Mint Address</span>
              <span className="text-xs font-medium text-[var(--accent-danger)]">Not created yet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[var(--text-muted)]">Official Money</span>
              <span className="text-xs font-bold text-[var(--accent-gold)]">$0.00 until external settlement</span>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-3 leading-tight">
            Purpose: Proof, access, support, artifact participation, and service-credit coordination.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
          <p className="text-xs text-[var(--text-muted)] mb-3">Mainnet Launch Requirements</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-[var(--accent-orange)]/30 flex items-center justify-center">
                  <CheckCircle className="w-2.5 h-2.5 text-[var(--accent-orange)]" />
                </div>
                <span className="text-xs text-[var(--text-muted)]">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 mb-6">
        <p className="text-xs text-[var(--text-muted)] mb-3">Settlement Separation</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/20">
            <p className="text-xs font-bold text-[var(--accent-orange)] mb-2">MCHAT Layer</p>
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              <li>• Proof coordination</li>
              <li>• Access</li>
              <li>• Support</li>
              <li>• Artifact participation</li>
              <li>• Notary credits</li>
              <li>• Service credits</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-[var(--accent-gold)]/10 border border-[var(--accent-gold)]/20">
            <p className="text-xs font-bold text-[var(--accent-gold)] mb-2">Stripe / Fiat Layer</p>
            <ul className="space-y-1 text-xs text-[var(--text-muted)]">
              <li>• Checkout completed</li>
              <li>• Invoice paid</li>
              <li>• Payment intent succeeded</li>
              <li>• Refund/dispute handling</li>
              <li>• Settled money receipt</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-3 text-center">
          Token utility and fiat settlement are linked by receipts, not by profit promises.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
          A chat can birth a token thesis, manifest, proof economy, and public narrative. The token exists only after a signed Solana mainnet mint transaction creates a real mint address.
        </p>
      </div>
    </div>
  );
};

const ProductionDoctrine = () => (
  <div className="neo-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Shield className="w-5 h-5 text-[var(--accent-orange)]" />
      Production-Safe Doctrine
    </h3>

    <div className="space-y-3 mb-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
        <CheckCircle className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-muted)]">Screen share proves work context</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
        <CheckCircle className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-muted)]">Webcam proves human presence only if user consents</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
        <CheckCircle className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-muted)]">Prompt/response logs prove chat labor</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
        <CheckCircle className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-muted)]">LLM appraisal prices the artifact</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
        <CheckCircle className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-muted)]">Solana settles only funded claims</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5">
        <CheckCircle className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-muted)]">Wallet receives money only from real treasury, buyer, donor, bounty, sponsor, or license</p>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/20">
      <p className="text-xs text-[var(--accent-danger)] font-medium mb-2">What Not To Do</p>
      <ul className="space-y-1 text-xs text-[var(--text-muted)]">
        <li>• Do not stream raw private life by default</li>
        <li>• Do not put webcam video onchain</li>
        <li>• Do not put raw prompts onchain if they contain secrets</li>
        <li>• Do not expose private keys</li>
        <li>• Do not promise automatic income</li>
        <li>• Do not call rebates &ldquo;yield&rdquo;</li>
        <li>• Do not make every response payable without a funding source</li>
      </ul>
    </div>
  </div>
);

const SprintBuildOrder = () => {
  const sprints = [
    {
      number: 1,
      name: 'Sprint 1',
      modules: [
        'Idea intake form',
        'LLM structuring endpoint',
        'Artifact hash generator',
        'SQLite/Postgres schema',
        'Public proof capsule page',
        'GitHub anchor writer',
      ],
      status: 'In Progress',
    },
    {
      number: 2,
      name: 'Sprint 2',
      modules: [
        'Notary queue',
        'Human reviewer panel',
        'KYC provider placeholder adapter',
        'Attestation hash',
        'Solana devnet memo or EVM testnet transaction',
      ],
      status: 'Pending',
    },
    {
      number: 3,
      name: 'Sprint 3',
      modules: [
        'Stripe checkout',
        'Stripe webhook',
        'Settlement receipt hash',
        'Dashboard separation of proof/product/signal/money',
      ],
      status: 'Pending',
    },
    {
      number: 4,
      name: 'Sprint 4',
      modules: [
        'Public marketplace/listing page',
        'Support/license/bounty routes',
        'User wallet identity',
        'Admin risk console',
      ],
      status: 'Pending',
    },
  ];

  return (
    <div className="neo-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Timer className="w-5 h-5 text-[var(--accent-orange)]" />
        MVP Build Order v0
      </h3>

      <div className="grid grid-cols-4 gap-4">
        {sprints.map((sprint, i) => (
          <div key={i} className={cn(
            "p-4 rounded-xl border",
            sprint.status === 'In Progress' 
              ? "bg-[var(--accent-orange)]/10 border-[var(--accent-orange)]/30" 
              : "bg-[var(--bg-card)] border-white/5"
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[var(--accent-orange)]">Sprint {sprint.number}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                sprint.status === 'In Progress' ? "bg-success/20 text-[var(--accent-success)]" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}>
                {sprint.status}
              </span>
            </div>
            <ul className="space-y-2">
              {sprint.modules.map((module, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-[var(--text-muted)]">
                  <CheckCircle className="w-3 h-3 text-[var(--accent-orange)] flex-shrink-0 mt-0.5" />
                  <span>{module}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <span className="text-[var(--accent-orange)] font-medium">Architecture Decision:</span> LLM-based notary/KYC is assistive, not final authority. Use human reviewer, regulated KYC/KYB provider, notary node, auditable attestation hash, Stripe receipt, and testnet/onchain proof where identity verification, payments, compliance, or legal attestation matter.
        </p>
      </div>
    </div>
  );
};

const HumanValueDashboardSummary = ({ artifacts = [], events = [], sales = [] }) => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <BarChart3 className="w-5 h-5 text-[var(--accent-orange)]" />
      Human Value Dashboard
    </h3>

    <div className="grid grid-cols-5 gap-4">
      <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Proof Value</p>
        <p className="text-xl font-bold text-[var(--text-primary)]">{artifacts.length} anchors</p>
      </div>
      <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Product Value</p>
        <p className="text-xl font-bold text-[var(--text-primary)]">{artifacts.length} artifacts</p>
      </div>
      <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Market Signal</p>
        <p className="text-xl font-bold text-[var(--accent-orange)]">{events.length} events</p>
        <p className="text-xs text-[var(--text-muted)]">{sales.length} sales</p>
      </div>
      <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Appraised Potential</p>
        <p className="text-xl font-bold text-[var(--text-muted)]">Unpriced</p>
      </div>
      <div className="p-4 rounded-lg bg-gradient-to-br from-[var(--accent-gold)]/10 to-[var(--accent-bronze)]/5 border border-[var(--accent-gold)]/30">
        <p className="text-xs text-[var(--text-muted)] mb-1">Settled Money</p>
        <p className="text-xl font-bold text-[var(--accent-gold)]">$0.00</p>
      </div>
    </div>

    <div className="mt-4 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
      <p className="text-xs text-[var(--text-muted)]">
        MEMBRA shows potential without fabricating payout.
      </p>
    </div>
  </div>
);

// Physical-Liquidity Layer Components
const HouseholdInventoryCard = ({ artifacts = [] }) => (
  <div className="neo-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Home className="w-5 h-5 text-[var(--accent-orange)]" />
        Artifact Inventory
      </h3>
      <span className="text-xs text-[var(--text-muted)]">{artifacts.length} items</span>
    </div>

    <div className="space-y-3">
      {artifacts.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No artifacts yet. Create one to populate inventory.</p>
      ) : artifacts.slice(0, 6).map((item, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-white/5 hover:border-[var(--accent-orange)]/20 transition-colors">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/30 flex items-center justify-center flex-shrink-0">
            <Box className="w-5 h-5 text-[var(--accent-orange)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm truncate">{item.artifact_title || item.name || 'Untitled'}</p>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-orange)]/10 text-[var(--accent-orange)]">
                {item.artifact_type || 'Artifact'}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
              <span>{truncateHash(item.artifact_hash || item.hash || '—')}</span>
              <span>•</span>
              <span className={item.status === 'active' ? 'text-[var(--accent-success)]' : 'text-[var(--accent-orange)]'}>
                {item.status || 'unknown'}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-[var(--text-muted)] mb-1">Created</p>
            <p className="text-sm font-bold text-[var(--accent-orange)]">{item.created_at ? item.created_at.slice(0, 10) : '—'}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const IntentMappingCard = ({ events = [] }) => (
  <div className="neo-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Target className="w-5 h-5 text-[var(--accent-orange)]" />
        Recent Events
      </h3>
      <span className="text-xs text-[var(--text-muted)]">{events.length} events</span>
    </div>

    <div className="space-y-3">
      {events.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No events yet. Activity will appear here.</p>
      ) : events.slice(0, 5).map((ev, i) => (
        <div key={i} className="p-4 rounded-lg bg-[var(--bg-card)] border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-1 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 text-xs font-medium text-[var(--accent-orange)]">
              {ev.event_type || 'Event'}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--accent-success)]/20 text-[var(--accent-success)]">
              {ev.status || 'Logged'}
            </span>
          </div>
          <p className="text-sm text-[var(--text-primary)] mb-2">{ev.description || ev.message || 'Event recorded'}</p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {ev.created_at ? ev.created_at.slice(0, 16) : 'Recently'}
            </div>
            {ev.wallet && (
              <div className="flex items-center gap-1">
                <Wallet className="w-3 h-3" />
                {truncateHash(ev.wallet)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LocalMatchesCard = ({ artifacts = [] }) => (
  <div className="neo-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[var(--accent-orange)]" />
        Artifact Pipeline
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">{artifacts.length} artifacts</span>
        <span className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse" />
      </div>
    </div>

    <div className="space-y-3">
      {artifacts.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No artifacts in pipeline. Create one to see flow.</p>
      ) : artifacts.slice(0, 5).map((a, i) => (
        <div key={i} className="p-4 rounded-lg bg-[var(--bg-card)] border border-white/5 hover:border-[var(--accent-orange)]/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="font-medium text-sm mb-1">{a.artifact_title || a.name || 'Untitled'}</p>
              <p className="text-xs text-[var(--text-muted)]">{a.artifact_type || 'Artifact'} • {truncateHash(a.artifact_hash || a.hash || '—')}</p>
            </div>
            <div className="text-right ml-4">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-medium",
                a.status === 'active' ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)]" :
                a.status === 'pending' ? "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]" :
                "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
              )}>
                {a.status || 'Draft'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {a.created_at ? a.created_at.slice(0, 10) : 'Pending'}
              </div>
              {a.public_wallet && (
                <div className="flex items-center gap-1">
                  <Wallet className="w-3 h-3" />
                  {truncateHash(a.public_wallet)}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const OSLayersVisualization = () => (
  <div className="neo-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Layers className="w-5 h-5 text-[var(--accent-orange)]" />
        MEMBRA Operating System Stack
      </h3>
    </div>
    
    <div className="space-y-2">
      {osLayers.map((layer, i) => {
        const Icon = layer.icon;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-background-100 to-background-50 border border-white/5 hover:border-[var(--accent-orange)]/20 transition-colors">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${layer.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{layer.name}</p>
              <p className="text-xs text-[var(--text-muted)]">{layer.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ApartmentWarehouseCard = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Building className="w-5 h-5 text-[var(--accent-orange)]" />
      Your Apartment: The Nearest Warehouse
    </h3>
    
    <div className="relative aspect-video bg-gradient-to-br from-background-100 to-background-200 rounded-xl border border-[var(--accent-orange)]/20 mb-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[length:20px_20px] opacity-30" />
      
      {/* Apartment layout visualization */}
      <div className="absolute inset-4">
        <div className="relative h-full">
          {/* Rooms */}
          <div className="absolute top-0 left-0 w-1/2 h-1/2 border-2 border-[var(--accent-orange)]/30 rounded-lg bg-[var(--accent-orange)]/5 flex items-center justify-center">
            <div className="text-center">
              <Sofa className="w-8 h-8 text-[var(--accent-orange)]/50 mx-auto mb-1" />
              <p className="text-xs text-[var(--text-muted)]">Living</p>
              <p className="text-xs text-[var(--accent-orange)]">3 SKUs</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-1/2 border-2 border-[var(--accent-orange)]/30 rounded-lg bg-[var(--accent-orange)]/5 flex items-center justify-center">
            <div className="text-center">
              <Refrigerator className="w-8 h-8 text-[var(--accent-orange)]/50 mx-auto mb-1" />
              <p className="text-xs text-[var(--text-muted)]">Kitchen</p>
              <p className="text-xs text-[var(--accent-orange)]">2 SKUs</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-1/3 h-1/2 border-2 border-[var(--accent-orange)]/30 rounded-lg bg-[var(--accent-orange)]/5 flex items-center justify-center">
            <div className="text-center">
              <Armchair className="w-8 h-8 text-[var(--accent-orange)]/50 mx-auto mb-1" />
              <p className="text-xs text-[var(--text-muted)]">Bedroom</p>
              <p className="text-xs text-[var(--accent-orange)]">4 SKUs</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-2/3 h-1/2 border-2 border-[var(--accent-orange)]/30 rounded-lg bg-[var(--accent-orange)]/5 flex items-center justify-center">
            <div className="text-center">
              <Package className="w-8 h-8 text-[var(--accent-orange)]/50 mx-auto mb-1" />
              <p className="text-xs text-[var(--text-muted)]">Storage</p>
              <p className="text-xs text-[var(--accent-orange)]">8 SKUs</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fulfillment indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-success/20 border border-[var(--accent-success)]/30">
        <p className="text-xs text-[var(--accent-success)] font-medium">Fulfillment Active</p>
      </div>
    </div>
    
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Total SKUs</p>
        <p className="text-lg font-bold text-[var(--accent-orange)]">17</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Active Listings</p>
        <p className="text-lg font-bold text-[var(--accent-gold)]">12</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10 text-center">
        <p className="text-xs text-[var(--text-muted)] mb-1">Monthly Revenue</p>
        <p className="text-lg font-bold text-[var(--accent-success)]">$847</p>
      </div>
    </div>
  </div>
);

const MicroTransactionFlow = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Workflow className="w-5 h-5 text-[var(--accent-orange)]" />
      Micro-Transaction Flow
    </h3>
    
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        {[
          { label: 'Need Detected', icon: Target, desc: 'Local demand identified' },
          { label: 'Intent Matched', icon: Users, desc: 'Your willingness confirmed' },
          { label: 'Risk Checked', icon: Shield, desc: 'Safety score evaluated' },
          { label: 'Handoff Coordinated', icon: Truck, desc: 'Real-world fulfillment' },
          { label: 'Payment Settled', icon: CreditCard, desc: 'Micro-payment complete' },
        ].map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <div className="text-center flex-1">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/30 flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-6 h-6 text-[var(--accent-orange)]" />
                </div>
                <p className="text-xs font-medium mb-1">{step.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{step.desc}</p>
              </div>
              {i < 4 && <ArrowRight className="w-4 h-4 text-[var(--accent-orange)]/50 flex-shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="p-4 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Example: $40 Neighborhood Need</span>
          <span className="text-xs text-[var(--text-muted)]">Revenue Distribution</span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'Skill Hero (Your labor)', amount: '$15.00', percent: 37.5 },
            { label: 'Tool Hero (Your drill)', amount: '$5.00', percent: 12.5 },
            { label: 'Delivery Hero (Neighbor)', amount: '$8.00', percent: 20.0 },
            { label: 'MEMBRA Platform', amount: '$8.00', percent: 20.0 },
            { label: 'Alpha Hub', amount: '$2.00', percent: 5.0 },
            { label: 'User Cashback', amount: '$2.00', percent: 5.0 },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-gold)] rounded-full" style={{ width: `${item.percent}%` }} />
                </div>
                <span className="text-xs font-medium text-[var(--accent-orange)] w-12 text-right">{item.amount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Original Components
const DoctrineStage = ({ stage, index, isLast }) => {
  const Icon = stage.icon;
  return (
    <div className="flex items-center gap-3">
      <div className="neo-card p-4 min-w-[180px]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-bronze)] flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs text-[var(--text-muted)] uppercase-tracking">0{index + 1}</span>
        </div>
        <h3 className="font-semibold text-sm mb-1">{stage.label}</h3>
        <p className="text-xs text-[var(--text-muted)]">{stage.desc}</p>
      </div>
      {!isLast && (
        <div className="w-12 h-px bg-gradient-to-r from-[var(--accent-orange)]/50 to-transparent" />
      )}
    </div>
  );
};

const NavItem = ({ item, isActive }) => {
  const Icon = item.icon;
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      isActive ? "bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30" : "hover:bg-white/5 border border-transparent"
    )}>
      <Icon className={cn("w-5 h-5", isActive ? "text-[var(--accent-orange)]" : "text-[var(--text-muted)]")} />
      <span className={cn("text-sm font-medium", isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]")}>{item.label}</span>
    </button>
  );
};

const KPICard = ({ kpi }) => (
  <div className="neo-card p-5">
    <p className="text-xs text-[var(--text-muted)] uppercase-tracking mb-2">{kpi.label}</p>
    <div className="flex items-baseline gap-3">
      <p className="text-2xl font-bold text-gradient">{kpi.value}</p>
      <span className={cn("text-xs font-medium", kpi.positive ? "text-[var(--accent-success)]" : "text-[var(--accent-danger)]")}>
        {kpi.trend}
      </span>
    </div>
    <div className="mt-3 h-8">
      <svg viewBox="0 0 100 30" className="w-full h-full">
        <path
          d={kpi.positive 
            ? "M0,25 Q25,20 50,15 T100,5" 
            : "M0,5 Q25,10 50,15 T100,25"}
          fill="none"
          stroke={kpi.positive ? "#49D17D" : "#D84A32"}
          strokeWidth="2"
          opacity="0.6"
        />
      </svg>
    </div>
  </div>
);

const QRPlaceholder = ({ size = 120 }) => (
  <div className={cn("border-2 border-[var(--accent-orange)]/30 rounded-lg p-3", size === 'large' ? "w-32 h-32" : "w-24 h-24")}>
    <div className="w-full h-full bg-gradient-to-br from-[var(--accent-orange)]/10 to-[var(--accent-bronze)]/5 rounded flex items-center justify-center">
      <QrCode className="w-12 h-12 text-[var(--accent-orange)]/50" />
    </div>
  </div>
);

const PublicWalletCard = () => (
  <div className="neo-card p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-bronze)] flex items-center justify-center">
        <Wallet className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold">PUBLIC SUPPORT WALLET</h3>
        <p className="text-xs text-[var(--text-muted)]">Receive donations and payouts</p>
      </div>
    </div>
    
    <div className="flex items-center gap-6 mb-4">
      <QRPlaceholder />
      <div className="flex-1">
        <div className="neo-card p-3 mb-3">
          <p className="text-xs text-[var(--text-muted)] mb-1">Public Address</p>
          <p className="mono text-sm text-[var(--accent-orange)] break-all">YOUR_PUBLIC_WALLET_HERE</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] text-sm font-medium hover:bg-[var(--accent-orange)]/20 transition-colors">
            <Copy className="w-4 h-4" />
            Copy Address
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] text-sm font-medium hover:bg-white/10 transition-colors">
            <ExternalLink className="w-4 h-4" />
            Open Ledger
          </button>
        </div>
      </div>
    </div>
    
    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        <span className="text-[var(--accent-orange)] font-medium">⚠ Safety:</span> Public address only. Generate keys locally. Never publish a private key.
      </p>
    </div>
  </div>
);

const OmniArtifactGateway = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <QrCode className="w-5 h-5 text-[var(--accent-orange)]" />
      OMNI-ARTIFACT GATEWAY
    </h3>
    
    <div className="flex items-center justify-center mb-6">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-orange)]/20 via-primary-gold/10 to-[var(--accent-bronze)]/20 rounded-2xl blur-xl" />
        <div className="relative neo-card p-6 rounded-2xl">
          <QRPlaceholder size="large" />
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Wallet Address</p>
        <p className="text-sm text-[var(--text-primary)]">Immediate donation and transaction interface.</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">System Diagram</p>
        <p className="text-sm text-[var(--text-primary)]">Embeds the architecture in scannable form.</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Investor Pitch</p>
        <p className="text-sm text-[var(--text-primary)]">Links to the public system narrative.</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Execution Trigger</p>
        <p className="text-sm text-[var(--text-primary)]">Starts an approved smart-contract or ledger action.</p>
      </div>
    </div>
  </div>
);

const PersonalChain = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-6 text-center uppercase-tracking text-sm">PERSONAL CHAIN PER HUMAN</h3>
    
    <div className="relative flex items-center justify-center mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--accent-orange)]/10 via-primary-gold/5 to-[var(--accent-bronze)]/10 rounded-full blur-2xl" />
      <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border-2 border-[var(--accent-orange)]/30 flex items-center justify-center">
        <Fingerprint className="w-16 h-16 text-[var(--accent-orange)]" />
      </div>
      
      {['Identity', 'Inventory', 'Intent', 'Value', 'Proof', 'Liquidity'].map((node, i) => {
        const angle = (i * 60 - 90) * (Math.PI / 180);
        const radius = 100;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <div
            key={node}
            className="absolute"
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-16 h-16 rounded-full neo-card flex items-center justify-center border border-[var(--accent-orange)]/20">
              <p className="text-xs font-medium text-center">{node}</p>
            </div>
            <div className="absolute top-1/2 left-1/2 w-8 h-px bg-gradient-to-r from-[var(--accent-orange)]/50 to-transparent origin-left" style={{ transform: `rotate(${angle * (180/Math.PI) + 90}deg)` }} />
          </div>
        );
      })}
    </div>
    
    <p className="text-center text-sm text-[var(--text-muted)]">
      Your personal chain. Your data. Your liquidity. Backed by public anchors and cross-chain receipts.
    </p>
  </div>
);

const ProvenanceModule = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Shield className="w-5 h-5 text-[var(--accent-orange)]" />
      Public Proof Layer
    </h3>
    
    <ul className="space-y-2 mb-4">
      {[
        'GitHub commit anchors',
        'IPFS metadata',
        'Artifact ledger',
        'Onchain hash receipt',
        'Notary/KYC verification status',
        'Revocation and dispute pointer'
      ].map((item, i) => (
        <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <CheckCircle2 className="w-4 h-4 text-[var(--accent-success)] flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
    
    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/20">
      <p className="text-xs text-[var(--text-muted)] mb-1">Artifact Hash</p>
      <p className="mono text-sm text-[var(--accent-orange)]">0x...F3A9E7</p>
    </div>
  </div>
);

const ReproducidescribeLoop = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <RefreshCw className="w-5 h-5 text-[var(--accent-orange)]" />
      Reproducidescribe Loop
    </h3>
    
    <div className="flex items-center justify-between mb-4">
      {['Image', 'Hash', 'Text', 'Style', 'UI', 'New UI'].map((item, i) => (
        <React.Fragment key={item}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/30 flex items-center justify-center mb-2">
              <span className="text-xs font-medium">{item}</span>
            </div>
          </div>
          {i < 5 && <ArrowRight className="w-4 h-4 text-[var(--accent-orange)]/50" />}
        </React.Fragment>
      ))}
    </div>
    
    <p className="text-center text-sm text-[var(--text-muted)] italic">
      &ldquo;Every change is hashed. Every version is anchored. Every UI is continuously reproducible.&rdquo;
    </p>
  </div>
);

const RewardCurve = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Activity className="w-5 h-5 text-[var(--accent-orange)]" />
      Conceptual Scan Reward Curve
    </h3>
    
    <div className="relative h-32 mb-4">
      <svg viewBox="0 0 300 100" className="w-full h-full">
        <defs>
          <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF8A1F" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#9A6A35" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M0,20 Q50,15 100,30 T200,60 T300,80"
          fill="none"
          stroke="url(#curveGradient)"
          strokeWidth="3"
        />
        <path
          d="M0,20 Q50,15 100,30 T200,60 T300,80 L300,100 L0,100 Z"
          fill="url(#curveGradient)"
          opacity="0.1"
        />
        <text x="10" y="15" fill="#FF8A1F" fontSize="10" fontFamily="monospace">50%</text>
        <text x="250" y="95" fill="#9B9489" fontSize="10" fontFamily="monospace">Floor</text>
      </svg>
    </div>
    
    <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-danger)]/20">
      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
        <span className="text-[var(--accent-danger)] font-medium">⚠ Disclaimer:</span> Conceptual model. Not a guarantee. Subject to legal and contract terms.
      </p>
    </div>
  </div>
);

const LiveArtifactEngine = ({ events = [], artifacts = [] }) => {
  const [activeTab, setActiveTab] = useState('alpha');

  const allLogs = [
    ...artifacts.slice(0, 3).map((a, i) => ({
      time: a.created_at ? a.created_at.slice(11, 19) : '--:--:--',
      type: a.status === 'active' ? 'success' : 'info',
      message: `Artifact: ${a.artifact_title || a.name || 'Untitled'} (${a.artifact_type || 'unknown'})`,
    })),
    ...events.slice(0, 5).map((e, i) => ({
      time: e.created_at ? e.created_at.slice(11, 19) : '--:--:--',
      type: e.status === 'error' ? 'warning' : 'info',
      message: e.description || e.message || `Event: ${e.event_type || 'system'}`,
    })),
  ];

  return (
    <div className="neo-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-[var(--accent-orange)]" />
          Live Artifact Engine
        </h3>
        <span className="text-xs text-[var(--text-muted)]">{allLogs.length} entries</span>
      </div>

      <div className="flex gap-2 mb-4">
        {['Alpha Feed', 'Ledger Stream', 'System Logs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '_'))}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeTab === tab.toLowerCase().replace(' ', '_')
                ? "bg-[var(--accent-orange)]/20 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)]"
                : "bg-[var(--bg-card)] border border-transparent text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-card)] rounded-lg p-4 font-mono text-xs space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
        {allLogs.length === 0 ? (
          <div className="text-[var(--text-muted)]">No live activity. Create artifacts or trigger events to populate.</div>
        ) : allLogs.map((log, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-[var(--text-muted)]">{log.time}</span>
            <span className={cn(
              log.type === 'success' ? 'text-[var(--accent-success)]' :
              log.type === 'warning' ? 'text-[var(--accent-orange)]' : 'text-[var(--text-muted)]'
            )}>
              [{log.type === 'success' ? '+' : log.type === 'warning' ? '!' : '~'}]
            </span>
            <span className="text-[var(--text-primary)]">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentArtifactsTable = ({ artifacts }) => (
  <div className="neo-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold">Recent Artifacts</h3>
      <span className="text-xs text-[var(--text-muted)]">{artifacts.length} total</span>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-[var(--text-muted)] uppercase-tracking border-b border-white/5">
            <th className="text-left py-3 px-2">Artifact</th>
            <th className="text-left py-3 px-2">Type</th>
            <th className="text-left py-3 px-2">Status</th>
            <th className="text-left py-3 px-2">Hash</th>
            <th className="text-left py-3 px-2">Wallet</th>
            <th className="text-left py-3 px-2">Created</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {artifacts.length === 0 ? (
            <tr><td colSpan={6} className="py-8 text-center text-[var(--text-muted)] text-xs">No artifacts yet. Create one to see it here.</td></tr>
          ) : artifacts.map((a, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-3 px-2 font-medium">{a.artifact_title || a.name || 'Untitled'}</td>
              <td className="py-3 px-2 text-[var(--text-muted)]">{a.artifact_type || '—'}</td>
              <td className="py-3 px-2">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  a.status === 'active' ? "bg-[var(--accent-success)]/20 text-[var(--accent-success)]" :
                  a.status === 'pending' ? "bg-[var(--accent-orange)]/20 text-[var(--accent-orange)]" :
                  "bg-[var(--bg-elevated)] text-[var(--text-muted)]"
                )}>
                  {a.status || 'unknown'}
                </span>
              </td>
              <td className="py-3 px-2 mono text-xs text-[var(--accent-orange)]">{truncateHash(a.artifact_hash || a.hash || '—')}</td>
              <td className="py-3 px-2 text-[var(--text-muted)]">{truncateHash(a.public_wallet || '—')}</td>
              <td className="py-3 px-2 text-[var(--text-muted)]">{a.created_at ? a.created_at.slice(0, 16) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MobilePreview = () => (
  <div className="neo-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Smartphone className="w-5 h-5 text-[var(--accent-orange)]" />
      Mobile UI Preview
    </h3>
    
    <div className="flex justify-center">
      <div className="w-48 h-96 rounded-3xl bg-gradient-to-b from-background-100 to-background-50 border-4 border-[var(--accent-orange)]/30 p-4 flex flex-col">
        <div className="text-center mb-4">
          <p className="text-xs text-[var(--text-muted)] uppercase-tracking mb-1">Current Epoch</p>
          <p className="text-2xl font-bold text-gradient">012</p>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-[var(--text-muted)]">Your Ideas.</p>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-[var(--text-muted)]">Your Chain.</p>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-[var(--text-muted)]">Your Earnings.</p>
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 mb-4">
          <p className="text-xs text-[var(--text-muted)] mb-1">Wallet Balance</p>
          <p className="text-lg font-bold text-[var(--accent-orange)]">$248.72</p>
        </div>
        
        <div className="mt-auto space-y-2">
          <button className="w-full p-2 rounded-lg bg-[var(--accent-orange)]/20 border border-[var(--accent-orange)]/30 text-xs font-medium text-[var(--accent-orange)]">
            New Idea
          </button>
          <button className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-[var(--text-muted)]">
            Scan & Add
          </button>
          <div className="flex gap-2">
            <button className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-[var(--text-muted)]">
              Anchor
            </button>
            <button className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-[var(--text-muted)]">
              Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LiveArtifactScan = () => (
  <div className="neo-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Scan className="w-5 h-5 text-[var(--accent-orange)]" />
        Live Artifact Scan
      </h3>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] text-xs font-medium hover:bg-[var(--accent-orange)]/20 transition-colors">
        <Plus className="w-4 h-4" />
        New Scan
      </button>
    </div>
    
    <div className="relative aspect-video bg-gradient-to-br from-background-100 to-background-200 rounded-xl border border-[var(--accent-orange)]/20 mb-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[length:20px_20px] opacity-30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-[var(--accent-orange)]/30 mx-auto mb-2" />
          <p className="text-sm text-[var(--text-muted)]">Room/Asset Scan Visualization</p>
        </div>
      </div>
      
      {/* Simulated object labels */}
      <div className="absolute top-4 left-4 px-2 py-1 rounded bg-[var(--bg-card)]/90 border border-[var(--accent-orange)]/30 text-xs mono">
        Desk
      </div>
      <div className="absolute top-1/3 right-8 px-2 py-1 rounded bg-[var(--bg-card)]/90 border border-[var(--accent-orange)]/30 text-xs mono">
        Shelf
      </div>
      <div className="absolute bottom-8 left-1/4 px-2 py-1 rounded bg-[var(--bg-card)]/90 border border-[var(--accent-orange)]/30 text-xs mono">
        Chair
      </div>
    </div>
    
    <div className="grid grid-cols-4 gap-4">
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Objects Detected</p>
        <p className="text-lg font-bold text-[var(--text-primary)]">32</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Estimated Value</p>
        <p className="text-lg font-bold text-[var(--accent-orange)]">$18,420</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Confidence</p>
        <p className="text-lg font-bold text-[var(--accent-success)]">98.4%</p>
      </div>
      <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--accent-orange)]/10">
        <p className="text-xs text-[var(--text-muted)] mb-1">Verification</p>
        <p className="text-lg font-bold text-[var(--accent-gold)]">Anchored</p>
      </div>
    </div>
  </div>
);

const FooterCard = ({ card }) => {
  const Icon = card.icon;
  return (
    <div className="neo-card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[var(--accent-orange)]" />
        </div>
        <h4 className="font-semibold text-sm">{card.title}</h4>
      </div>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed">{card.desc}</p>
    </div>
  );
};

function App() {
  const [showLanding, setShowLanding] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');
  const [health, setHealth] = useState(null);
  const [liveArtifacts, setLiveArtifacts] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveSales, setLiveSales] = useState([]);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [h, arts, evs] = await Promise.all([
          api.health().catch(() => null),
          api.getArtifacts().catch(() => []),
          api.getEvents().catch(() => ({ events: [] })),
        ]);
        if (cancelled) return;
        setHealth(h);
        setLiveArtifacts(Array.isArray(arts) ? arts : arts.artifacts || []);
        setLiveEvents((evs.events || evs || []).slice(0, 10));
        setApiError('');
      } catch (e) {
        if (!cancelled) setApiError('Backend unavailable. Start app.py on port 7860.');
      }
    }
    load();
    const t = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (showLanding) {
    return (
      <LandingPage
        onEnterApp={() => setShowLanding(false)}
        health={health}
        artifacts={liveArtifacts}
        events={liveEvents}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-dark)]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[var(--bg-dark)]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-bronze)] flex items-center justify-center">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient tracking-tight">MEMBRA HUMAN CHAIN</h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Idea Monetization Layer v0 • GitHub: overandor/chat-pipeline • Commit: cd348d5
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLanding(true)}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[var(--text-muted)] text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Landing
              </button>
              <button
                onClick={() => setActiveNav('Artifacts')}
                className="px-4 py-2 rounded-lg bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] text-sm font-medium hover:bg-[var(--accent-orange)]/20 transition-colors"
              >
                Create Artifact
              </button>
            </div>
          </div>
          
          {/* Doctrine Line */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {doctrineStages.map((stage, i) => (
              <DoctrineStage 
                key={stage.label} 
                stage={stage} 
                index={i} 
                isLast={i === doctrineStages.length - 1} 
              />
            ))}
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen border-r border-white/5 bg-[var(--bg-card)]/50 backdrop-blur-sm p-4 sticky top-[140px] h-[calc(100vh-140px)]">
          <nav className="space-y-1 mb-8">
            {navItems.map((item) => (
              <NavItem 
                key={item.label} 
                item={item} 
                isActive={activeNav === item.label}
                onClick={() => setActiveNav(item.label)}
              />
            ))}
          </nav>
          
          <div className="border-t border-white/5 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Network Status</span>
              <span className={`flex items-center gap-1 text-xs ${health ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${health ? 'bg-[var(--accent-success)]' : 'bg-[var(--accent-danger)]'}`} />
                {health ? 'Healthy' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Artifacts</span>
              <span className="text-xs text-[var(--accent-orange)] font-bold">{liveArtifacts.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">Events</span>
              <span className="text-xs text-[var(--accent-gold)] font-bold">{liveEvents.length}</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Dashboard Title */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold text-gradient">MEMBRA Idea Monetization Layer v0</h2>
              <div className="px-4 py-2 rounded-full bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/30 text-[var(--accent-orange)] text-sm font-bold">
                MCHAT STATUS: MANIFESTED, NOT MINTED
              </div>
            </div>
            <p className="text-[var(--text-muted)] mb-4">MEMBRA does not pretend a chat is money. MEMBRA turns a chat into a proof capsule, a token thesis, a public launch manifest, and a disciplined path to settlement.</p>
            
            {apiError && (
              <div className="mb-4 p-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 text-[var(--accent-danger)] text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> {apiError}
              </div>
            )}
            <div className="grid grid-cols-4 gap-3">
              <div className="neo-card-pressed p-3 text-center">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Backend</p>
                <p className={`text-sm font-bold ${health ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'}`}>{health ? 'Online' : 'Offline'}</p>
              </div>
              <div className="neo-card-pressed p-3 text-center">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Artifacts</p>
                <p className="text-sm font-bold text-[var(--accent-gold)]">{liveArtifacts.length}</p>
              </div>
              <div className="neo-card-pressed p-3 text-center">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Events</p>
                <p className="text-sm font-bold text-[var(--accent-orange)]">{liveEvents.length}</p>
              </div>
              <div className="neo-card-pressed p-3 text-center">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">DB Status</p>
          </div>
        </div>
        <p className="text-[var(--text-muted)] mb-4">MEMBRA does not pretend a chat is money. MEMBRA turns a chat into a proof capsule, a token thesis, a public launch manifest, and a disciplined path to settlement.</p>
        
        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)]/30 text-[var(--accent-danger)] text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {apiError}
          </div>
        )}
        <div className="grid grid-cols-4 gap-3">
          <div className="neo-card-pressed p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Backend</p>
            <p className={`text-sm font-bold ${health ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]'}`}>{health ? 'Online' : 'Offline'}</p>
          </div>
          <div className="neo-card-pressed p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Artifacts</p>
            <p className="text-sm font-bold text-[var(--accent-gold)]">{liveArtifacts.length}</p>
          </div>
          <div className="neo-card-pressed p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Events</p>
            <p className="text-sm font-bold text-[var(--accent-orange)]">{liveEvents.length}</p>
          </div>
          <div className="neo-card-pressed p-3 text-center">
            <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">DB Status</p>
            <p className="text-sm font-bold text-[var(--text-muted)]">{health?.db || '—'}</p>
          </div>
        </div>
      </div>

      {activeNav === 'Overview' && <Overview />}
      {activeNav === 'AI Engine' && (
        <div className="h-full">
          <h2 className="text-3xl font-bold text-gradient mb-6 flex items-center gap-3">
            <Cpu className="w-8 h-8 text-[var(--accent-orange)]" />
            MEMBRA AI Engine
          </h2>
          <LLMInferencePanel liveArtifacts={liveArtifacts} liveEvents={liveEvents} liveSales={liveSales} health={health} />
        </div>
      )}
      {activeNav === 'Inventory' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Artifact Inventory</h2>
          <InventoryGrid />
        </div>
      )}
      {activeNav === 'Intent' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Intent Mapping</h2>
          <IntentMappingCard events={liveEvents} />
        </div>
      )}
      {activeNav === 'Local Match' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Local Commerce Matches</h2>
          <LocalMatchesCard artifacts={liveArtifacts} />
        </div>
      )}
      {activeNav === 'Ideas' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Ideas &amp; Proposals</h2>
          <ApartmentWarehouseCard />
          <SprintBuildOrder />
        </div>
      )}
      {activeNav === 'Artifacts' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Create Artifact</h2>
          <ArtifactCreator />
        </div>
      )}
      {activeNav === 'Ledger' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Live Ledger Engine</h2>
          <LiveArtifactEngine events={liveEvents} artifacts={liveArtifacts} />
          <RecentArtifactsTable artifacts={liveArtifacts} />
        </div>
      )}
      {activeNav === 'Wallet' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Wallet</h2>
          <WalletPanel />
          <SolanaWalletSignature />
        </div>
      )}
      {activeNav === 'Payouts' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Token Sales &amp; Payouts</h2>
          <TokenSaleLive />
        </div>
      )}
      {activeNav === 'Analytics' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Analytics</h2>
          <HumanValueDashboardSummary artifacts={liveArtifacts} events={liveEvents} sales={liveSales} />
          <RewardCurve />
        </div>
      )}
      {activeNav === 'Trust Center' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Trust Center</h2>
          <EarlyRiskCurveFlow />
          <ValueStateMachine />
        </div>
      )}
      {activeNav === 'Settings' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gradient">Settings</h2>
          <SettingsPanel />
        </div>
      )}
    </main>
  </div>
</div>
  );
}
