import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Lightbulb, 
  Box, 
  BookOpen, 
  Wallet, 
  Bridge, 
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
  Layers,
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
  { icon: Shield, label: 'Trust Center' },
  { icon: Settings, label: 'Settings' },
];

// KPI data
const kpiData = [
  { label: 'Household Assets', value: 47, trend: '+8%', positive: true },
  { label: 'Active Intent', value: 12, trend: '+15%', positive: true },
  { label: 'Local Matches', value: 23, trend: '+32%', positive: true },
  { label: 'Micro-Revenue', value: '$847.32', trend: '+67%', positive: true },
];

// Household inventory data
const householdInventory = [
  { name: 'Cordless Drill', icon: Wrench, category: 'Tool', status: 'Available', price: '$5/hr', risk: 'Low', utilization: 0.23 },
  { name: 'Vacuum Cleaner', icon: ShoppingCart, category: 'Appliance', status: 'Available', price: '$3/hr', risk: 'Low', utilization: 0.45 },
  { name: 'Extra Desk', icon: Armchair, category: 'Furniture', status: 'In Use', price: '$8/hr', risk: 'Low', utilization: 0.67 },
  { name: 'Closet Space', icon: Package, category: 'Storage', status: 'Available', price: '$20/mo', risk: 'Medium', utilization: 0.34 },
  { name: 'Wi-Fi + Desk', icon: Home, category: 'Workspace', status: 'Available', price: '$15/hr', risk: 'Medium', utilization: 0.12 },
  { name: 'Package Holding', icon: Box, category: 'Service', status: 'Active', price: '$2/delivery', risk: 'Low', utilization: 0.89 },
];

// Intent data
const intentData = [
  { type: 'Tool Sharing', intent: 'Willing to lend drill to trusted neighbors', boundary: 'Same building, verified users only', timeWindow: 'Weekends 9AM-6PM', status: 'Active' },
  { type: 'Storage Rental', intent: 'Closet space available for seasonal items', boundary: 'Non-perishable, boxed items', timeWindow: 'Ongoing', status: 'Active' },
  { type: 'Delivery Reception', intent: 'Can receive packages for neighbors', boundary: 'Small packages only, 24hr pickup', timeWindow: 'Mon-Fri 9AM-7PM', status: 'Active' },
  { type: 'Workspace Rental', intent: 'Desk + Wi-Fi available for remote work', boundary: 'Quiet hours, max 4hr sessions', timeWindow: 'Weekdays 10AM-4PM', status: 'Pending' },
];

// Local commerce matches
const localMatches = [
  { need: 'Need drill for 1 hour', match: 'Your cordless drill', distance: '2 floors up', price: '$5.00', riskScore: 92, status: 'Ready' },
  { need: 'Package hold until 8PM', match: 'Your service available', distance: 'Same floor', price: '$2.00', riskScore: 95, status: 'Ready' },
  { need: 'Desk for meeting', match: 'Your extra desk', distance: 'Building next door', price: '$12.00', riskScore: 88, status: 'Pending' },
  { need: 'Closet storage', match: 'Your closet space', distance: '3 blocks away', price: '$25.00/mo', riskScore: 85, status: 'Reviewing' },
];

// OS layers
const osLayers = [
  { name: 'InventoryOS', icon: Database, desc: 'Maps asset graph through household scanning', color: 'from-primary-orange to-primary-gold' },
  { name: 'IntentOS', icon: Target, desc: 'Captures owner constraints and willingness signals', color: 'from-primary-gold to-primary-bronze' },
  { name: 'ListingOS', icon: Package, desc: 'Packages assets into structured SKUs', color: 'from-primary-orange to-primary-bronze' },
  { name: 'RentOS', icon: Timer, desc: 'Manages time blocks and availability windows', color: 'from-primary-gold to-primary-orange' },
  { name: 'BasicNeedsOS', icon: ShoppingCart, desc: 'Commodifies recurring utility patterns', color: 'from-primary-bronze to-primary-orange' },
  { name: 'RiskOS', icon: Shield, desc: 'Classifies safety and trustworthiness', color: 'from-primary-orange to-primary-gold' },
  { name: 'AccessOS', icon: Lock, desc: 'Controls entry rules and permissions', color: 'from-primary-gold to-primary-bronze' },
  { name: 'TrustOS', icon: BadgeCheck, desc: 'Builds reputation from completed transactions', color: 'from-primary-orange to-primary-bronze' },
  { name: 'FulfillmentOS', icon: Truck, desc: 'Handles real-world handoff coordination', color: 'from-primary-gold to-primary-orange' },
  { name: 'SettlementOS', icon: CreditCard, desc: 'Converts micro-usage into settled payments', color: 'from-primary-bronze to-primary-orange' },
];

// Recent artifacts data
const recentArtifacts = [
  { name: 'Smart Shelf Layout', type: 'Design', status: 'Anchored', hash: 'a1b2...9f8e', chain: 'Personal', created: '2h ago', value: '$240', payment: 'Unfunded' },
  { name: 'Vacuum Rental Model', type: 'Business', status: 'Anchored', hash: 'c5d4...7ab6', chain: 'Personal', created: '1d ago', value: '$120', payment: 'Tip Open' },
  { name: 'Neighborhood Storage DAO', type: 'Protocol', status: 'Pending', hash: 'e9f6...1c2d', chain: 'Polygon', created: '2d ago', value: '$2,500', payment: 'License Pending' },
];

// Chain nodes
const chainNodes = [
  'Bitcoin', 'Ethereum', 'Solana', 'Base', 'Polygon', 'Arbitrum'
];

// Footer cards
const footerCards = [
  { icon: Wallet, title: 'Public Wallet', desc: 'User-generated wallets for donations, deposits, and payouts.' },
  { icon: Github, title: 'GitHub Ledger', desc: 'Open-source anchors, commits, and artifact provenance.' },
  { icon: Shield, title: 'Notary Bridge', desc: 'Human verification, attestation, and identity trust.' },
  { icon: DollarSign, title: 'Artifact Pricing', desc: 'Donation, license, bounty, subscription, or buyer-funded pricing.' },
  { icon: Network, title: 'Cross-Chain Payout', desc: 'Distribution across chains and payout rails.' },
];

// New Components for Value State Machine Doctrine Layer

const JoinMembraOnboarding = () => {
  const onboardingSteps = [
    { icon: Lock, label: 'Set Consent Boundaries', desc: 'Define what you capture and share', status: 'Required' },
    { icon: Github, label: 'Connect Sources', desc: 'Link GitHub, IPFS, or local storage', status: 'Optional' },
    { icon: Plus, label: 'Create First Artifact', desc: 'Capture work, inventory, or idea', status: 'Active' },
    { icon: Hash, label: 'Hash + Anchor', desc: 'Generate SHA-256 and post to ledger', status: 'Optional' },
    { icon: Radio, label: 'Publish Proof Capsule', desc: 'Export TikTok/YouTube proof package', status: 'Optional' },
    { icon: ArrowRightCircle, label: 'Route to Market', desc: 'Connect to customers, sponsors, bounties', status: 'Optional' },
    { icon: Receipt, label: 'Record Settlement', desc: 'Track only confirmed external payments', status: 'Optional' },
  ];

  return (
    <div className="glass-card p-8 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gradient mb-2">Join the Human Chain</h2>
          <p className="text-text-muted max-w-2xl">
            Start with consent. Capture only what you approve. Turn your work, inventory, speech, ideas, and artifacts into verified proof streams.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 rounded-xl bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-sm font-medium hover:bg-primary-orange/20 transition-colors">
            Configure Consent
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-orange to-primary-bronze text-white text-sm font-medium hover:opacity-90 transition-opacity">
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
                <div className="glass-card p-4 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-orange/20 to-primary-bronze/10 border border-primary-orange/30 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-orange" />
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      step.status === 'Required' ? "bg-danger/20 text-danger" :
                      step.status === 'Active' ? "bg-success/20 text-success" :
                      step.status === 'Locked' ? "bg-background-200 text-text-muted" :
                      "bg-primary-orange/20 text-primary-orange"
                    )}>
                      {step.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{step.label}</h3>
                  <p className="text-xs text-text-muted">{step.desc}</p>
                </div>
                {i < onboardingSteps.length - 1 && (
                  <div className="w-8 h-px bg-gradient-to-r from-primary-orange/50 to-transparent flex-shrink-0" />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex gap-3 mt-4 pt-4 border-t border-white/5">
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text-muted text-sm hover:bg-white/10 transition-colors">
          <Github className="w-4 h-4" />
          Connect GitHub / IPFS
        </button>
      </div>
    </div>
  );
};

const ValueStateMachine = () => {
  const states = [
    { number: 1, icon: Lightbulb, label: 'Human Idea', example: 'raw concept, insight', proves: 'human creativity', isMoney: false, boundary: 'proof value ≠ official money' },
    { number: 2, icon: Lock, label: 'Consent Capture', example: 'user approval', proves: 'permission granted', isMoney: false },
    { number: 3, icon: Layers, label: 'LLM Structuring', example: 'summarize, classify', proves: 'artifact organized', isMoney: false },
    { number: 4, icon: ShieldCheck, label: 'Redaction', example: 'private-alpha protection', proves: 'safety enforced', isMoney: false },
    { number: 5, icon: Hash, label: 'SHA-256 Hash', example: 'cryptographic fingerprint', proves: 'content exists at time', isMoney: false },
    { number: 6, icon: Sparkles, label: 'LLM Notary Assist', example: 'flag risks, prepare packet', proves: 'notary packet ready', isMoney: false, boundary: 'notary review ≠ guaranteed value' },
    { number: 7, icon: Shield, label: 'Human Notary/KYC', example: 'identity verification', proves: 'attestation issued', isMoney: false },
    { number: 8, icon: Network, label: 'Testnet Receipt', example: 'Solana devnet/EVM testnet', proves: 'on-chain proof', isMoney: false, boundary: 'testnet receipt ≠ official money' },
    { number: 9, icon: Radio, label: 'Public Proof Capsule', example: 'TikTok/YouTube export', proves: 'market visibility', isMoney: false, boundary: 'market signal ≠ official money' },
    { number: 10, icon: ShoppingCart, label: 'Market Listing', example: 'offer/bounty/license', proves: 'transaction opportunity', isMoney: false },
    { number: 11, icon: CreditCard, label: 'Stripe Settlement', example: 'fiat payment confirmed', proves: 'value settled', isMoney: true },
    { number: 12, icon: GitBranch, label: 'Optional Mainnet', example: 'post-settlement anchor', proves: 'permanent record', isMoney: false },
  ];

  return (
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gradient flex items-center gap-2">
            <Workflow className="w-6 h-6 text-primary-orange" />
            Value State Machine v0
          </h3>
          <p className="text-xs text-text-muted mt-1">GitHub: overandor/chat-pipeline • Commit: cd348d5</p>
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
                  ? "bg-gradient-to-br from-primary-gold/20 to-primary-bronze/10 border-primary-gold/30 shadow-glow-amber" 
                  : "bg-background-100 border-primary-orange/20"
              )}>
                {state.boundary && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-danger/20 border border-danger/30 text-xs text-danger font-medium">
                    ≠ Money
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                    state.isMoney 
                      ? "bg-gradient-to-br from-primary-gold to-primary-bronze" 
                      : "bg-gradient-to-br from-primary-orange/20 to-primary-bronze/10 border border-primary-orange/30"
                  )}>
                    <Icon className={cn("w-3.5 h-3.5", state.isMoney ? "text-white" : "text-primary-orange")} />
                  </div>
                  <span className={cn(
                    "text-xs font-bold",
                    state.isMoney ? "text-primary-gold" : "text-primary-orange"
                  )}>
                    {state.number}
                  </span>
                </div>
                <h4 className={cn("font-semibold text-xs mb-1 leading-tight", state.isMoney ? "text-primary-gold" : "text-text-primary")}>
                  {state.label}
                </h4>
                <p className="text-xs text-text-muted leading-tight">{state.example}</p>
              </div>
              {i < states.length - 1 && (
                <ArrowRight className={cn("w-4 h-4 flex-shrink-0", state.isMoney ? "text-primary-gold/50" : "text-primary-orange/50")} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-danger/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">Hard Boundaries v0</p>
            <p className="text-xs text-text-muted">
              Proof value ≠ official money • Market signal ≠ official money • Notary review ≠ guaranteed value • Testnet receipt ≠ official money • <span className="text-primary-gold font-medium">Stripe settled payment = official fiat money</span>
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
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary-orange" />
        Proof-of-Life Timeline
      </h3>

      <div className="space-y-3">
        {events.map((event, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background-100 border border-white/5">
            <div className="text-xs text-text-muted font-mono w-20 flex-shrink-0">{event.time}</div>
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">{event.source}</p>
              <p className="text-xs mono text-primary-orange">{event.hash}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                event.privacy === 'Public' ? "bg-success/20 text-success" :
                event.privacy === 'Private' ? "bg-background-200 text-text-muted" :
                event.privacy === 'Encrypted' ? "bg-primary-orange/20 text-primary-orange" :
                "bg-primary-gold/20 text-primary-gold"
              )}>
                {event.privacy}
              </span>
              <span className={cn(
                "px-2 py-1 rounded-full text-xs font-medium",
                event.settlement === 'Paid' ? "bg-success/20 text-success" :
                event.settlement === 'Pending' ? "bg-primary-orange/20 text-primary-orange" :
                event.settlement === 'Signal' ? "bg-primary-gold/20 text-primary-gold" :
                "bg-background-200 text-text-muted"
              )}>
                {event.settlement}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ConsentControlCenter = () => {
  const [consentToggles, setConsentToggles] = useState({
    captureSpeech: true,
    captureScreen: false,
    captureGitHub: true,
    captureInventory: true,
    llmSummarization: true,
    publicProofCapsule: false,
    tiktokExport: false,
    walletAddress: true,
    paymentLink: true,
  });

  const hardBlocked = [
    { label: 'Share private keys', icon: Key },
    { label: 'Share seed phrase', icon: FileLock },
    { label: 'Share raw KYC', icon: ShieldCheck },
    { label: 'Share unredacted private chats', icon: EyeOff },
    { label: 'Share wallet halves', icon: Ban },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-primary-orange" />
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
          <div key={item.key} className="flex items-center justify-between p-3 rounded-lg bg-background-100 border border-white/5">
            <span className="text-sm text-text-primary">{item.label}</span>
            <button
              onClick={() => setConsentToggles(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                consentToggles[item.key] ? "bg-primary-orange" : "bg-background-200"
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

      <div className="p-4 rounded-xl bg-background-100 border border-danger/20 mb-4">
        <p className="text-xs text-danger font-medium mb-3">Hard-Blocked (Never Enabled)</p>
        <div className="space-y-2">
          {hardBlocked.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-danger/10 border border-danger/20">
                <Icon className="w-4 h-4 text-danger" />
                <span className="text-sm text-text-muted">{item.label}</span>
                <Ban className="w-4 h-4 text-danger ml-auto" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="text-primary-orange font-medium">MEMBRA monetizes approved artifacts, not personhood.</span> The human remains the controller.
        </p>
      </div>
    </div>
  );
};

const PrivateAlphaPreservation = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Vault className="w-5 h-5 text-primary-orange" />
      Private Alpha Preservation
    </h3>

    <div className="relative p-6 rounded-xl bg-gradient-to-br from-background-100 to-background-50 border border-primary-orange/20 mb-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-success" />
            <span className="text-xs font-medium text-success">Public</span>
          </div>
          <ul className="space-y-1 text-xs text-text-muted">
            <li>• Hash</li>
            <li>• Timestamp</li>
            <li>• Metadata</li>
            <li>• Proof capsule</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-primary-orange/10 border border-primary-orange/20">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-primary-orange" />
            <span className="text-xs font-medium text-primary-orange">Protected</span>
          </div>
          <ul className="space-y-1 text-xs text-text-muted">
            <li>• Encrypted payload</li>
            <li>• Redacted transcript</li>
            <li>• Hidden strategy</li>
            <li>• Private dataset</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-danger/10 border border-danger/20">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-danger" />
            <span className="text-xs font-medium text-danger">Never Public</span>
          </div>
          <ul className="space-y-1 text-xs text-text-muted">
            <li>• Private keys</li>
            <li>• Seed phrases</li>
            <li>• Raw KYC</li>
            <li>• Unrevealed alpha</li>
          </ul>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-4 gap-3">
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted mb-1">Preservation Score</p>
        <p className="text-lg font-bold text-success">8.7 / 10</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted mb-1">Leakage Risk</p>
        <p className="text-lg font-bold text-success">Low</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted mb-1">Proof Strength</p>
        <p className="text-lg font-bold text-primary-orange">High</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted mb-1">Reveal Status</p>
        <p className="text-lg font-bold text-primary-gold">Delayed</p>
      </div>
    </div>
  </div>
);

const SettlementRailSelector = () => {
  const rails = [
    { name: 'Stripe payment', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'Invoice accepted', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'Contract signed', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'Bounty paid', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'Grant awarded', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'License sold', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'Sponsorship settled', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'Escrow released', status: 'Not settled', amount: '-', ref: '-' },
    { name: 'Crypto payment', status: 'Not settled', amount: '-', ref: '-' },
  ];

  return (
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Receipt className="w-5 h-5 text-primary-orange" />
        External Settlement Rails
      </h3>

      <div className="space-y-2 mb-4">
        {rails.map((rail, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background-100 border border-white/5">
            <span className="text-sm text-text-primary">{rail.name}</span>
            <div className="flex items-center gap-4">
              <span className="text-xs mono text-text-muted">{rail.ref}</span>
              <span className="text-xs text-text-muted">{rail.amount}</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-200 text-text-muted">
                {rail.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/20">
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="text-primary-orange font-medium">Settlement Doctrine:</span> Until one of these rails confirms value, the artifact remains proof/product/signal — not official money.
        </p>
      </div>
    </div>
  );
};

const LiveStudioArchitecture = () => (
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Radio className="w-5 h-5 text-primary-orange" />
      MEMBRA Live Proof-of-Chat Studio Architecture
    </h3>

    <div className="grid grid-cols-4 gap-4 mb-4">
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary-orange/10 to-primary-bronze/5 border border-primary-orange/20">
        <div className="flex items-center gap-2 mb-2">
          <Smartphone className="w-5 h-5 text-primary-orange" />
          <h4 className="font-semibold text-sm">Browser Studio</h4>
        </div>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• Screen share</li>
          <li>• Webcam</li>
          <li>• Microphone</li>
          <li>• Prompt editor</li>
          <li>• LLM response panel</li>
          <li>• Artifact approval</li>
          <li>• Solana wallet connect</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary-orange/10 to-primary-bronze/5 border border-primary-orange/20">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5 text-primary-orange" />
          <h4 className="font-semibold text-sm">Realtime Backend</h4>
        </div>
        <ul className="space-y-1 text-xs text-text-muted">
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
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary-orange/10 to-primary-bronze/5 border border-primary-orange/20">
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-5 h-5 text-primary-orange" />
          <h4 className="font-semibold text-sm">Provenance Layer</h4>
        </div>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• SHA-256 hashes</li>
          <li>• GitHub artifact ledger</li>
          <li>• IPFS metadata</li>
          <li>• Solana receipt program</li>
          <li>• Support-payment contract</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary-gold/10 to-primary-bronze/5 border border-primary-gold/30">
        <div className="flex items-center gap-2 mb-2">
          <Wallet className="w-5 h-5 text-primary-gold" />
          <h4 className="font-semibold text-sm">Payment Layer</h4>
        </div>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• Prefunded SOL/USDC pool</li>
          <li>• Creator payout wallet</li>
          <li>• Support receipt account</li>
          <li>• Payout tx hash</li>
          <li>• Withdrawal ledger</li>
        </ul>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-background-100 border border-danger/20">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-text-primary mb-1">Hard Boundaries</p>
          <p className="text-xs text-text-muted">
            LLM appraisal ≠ money • Chat artifact ≠ payment • Solana wallet ≠ funding source • Immediate withdrawal requires existing funded pool, buyer, sponsor, bounty, donor, grant, or escrow
          </p>
        </div>
      </div>
    </div>
  </div>
);

const LiveStudioUserFlow = () => {
  const steps = [
    { number: 1, label: 'Connect Solana wallet' },
    { number: 2, label: 'Start MEMBRA Live Studio' },
    { number: 3, label: 'Share screen and/or webcam' },
    { number: 4, label: 'Chat with LLM' },
    { number: 5, label: 'Prompt/response becomes artifact' },
    { number: 6, label: 'MEMBRA appraises artifact' },
    { number: 7, label: 'User approves monetization' },
    { number: 8, label: 'System hashes approved artifact' },
    { number: 9, label: 'System anchors proof' },
    { number: 10, label: 'If funded, payout sent' },
    { number: 11, label: 'User withdraws from wallet' },
  ];

  return (
    <div className="glass-card p-6 mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Workflow className="w-5 h-5 text-primary-orange" />
        User Experience Flow
      </h3>

      <div className="grid grid-cols-4 gap-3">
        {steps.map((step, i) => (
          <div key={i} className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary-orange">{step.number}</span>
              <div className="w-2 h-2 rounded-full bg-success" />
            </div>
            <p className="text-xs text-text-muted leading-tight">{step.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ArtifactSchema = () => (
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <FileText className="w-5 h-5 text-primary-orange" />
      Artifact Schema
    </h3>

    <div className="bg-background-100 rounded-xl p-4 font-mono text-xs overflow-x-auto">
      <pre className="text-text-muted">{`{
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
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <LayoutDashboard className="w-5 h-5 text-primary-orange" />
      Screen Layout
    </h3>

    <div className="grid grid-cols-3 gap-4 mb-4">
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <h4 className="font-semibold text-sm mb-2 text-primary-orange">Top Bar</h4>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• Connected wallet</li>
          <li>• Live session timer</li>
          <li>• Current appraisal total</li>
          <li>• Withdrawable balance</li>
          <li>• Privacy mode</li>
          <li>• Recording status</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <h4 className="font-semibold text-sm mb-2 text-primary-orange">Left Panel</h4>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• Screen share preview</li>
          <li>• Webcam preview</li>
          <li>• Audio/transcript status</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <h4 className="font-semibold text-sm mb-2 text-primary-orange">Center Panel</h4>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• Prompt input</li>
          <li>• LLM response</li>
          <li>• "Convert to Artifact" button</li>
          <li>• Approve / Redact / Reject</li>
        </ul>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <h4 className="font-semibold text-sm mb-2 text-primary-orange">Right Panel</h4>
        <ul className="space-y-1 text-xs text-text-muted">
          <li>• Live appraisal feed</li>
          <li>• Artifact score</li>
          <li>• Funding eligibility</li>
          <li>• Payout status</li>
          <li>• Solana tx hash</li>
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <h4 className="font-semibold text-sm mb-2 text-primary-orange">Bottom Panel</h4>
        <ul className="space-y-1 text-xs text-text-muted">
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
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <TrendingUp className="w-5 h-5 text-primary-orange" />
      Real-Time Appraisal Formula
    </h3>

    <div className="bg-background-100 rounded-xl p-4 mb-4">
      <pre className="text-sm text-text-primary font-mono">{`artifact_value =
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

    <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
      <p className="text-xs text-text-muted">
        <span className="text-primary-orange font-medium">Payment Rule:</span> If artifact approved AND artifact hashed AND artifact funding available AND wallet verified AND risk checks passed → send USDC/SOL payout to creator wallet, else create unpaid proof artifact.
      </p>
    </div>
  </div>
);

const DevnetMVPPhases = () => {
  const phases = [
    { phase: 1, name: 'Local capture + artifact logging', status: 'Pending' },
    { phase: 2, name: 'GitHub/IPFS anchoring', status: 'Pending' },
    { phase: 3, name: 'Solana devnet receipt program', status: 'Pending' },
    { phase: 4, name: 'Devnet USDC/SOL payout simulation', status: 'Pending' },
    { phase: 5, name: 'Mainnet support pool (legal/security)', status: 'Pending' },
  ];

  return (
    <div className="glass-card p-6 mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Timer className="w-5 h-5 text-primary-orange" />
        Devnet MVP Phases
      </h3>

      <div className="space-y-3">
        {phases.map((phase, i) => (
          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-background-100 border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-primary-orange/10 border border-primary-orange/30 flex items-center justify-center">
              <span className="text-xs font-bold text-primary-orange">{phase.phase}</span>
            </div>
            <span className="text-sm text-text-primary flex-1">{phase.name}</span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-background-200 text-text-muted">
              {phase.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TreasurySupportPool = () => (
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Wallet className="w-5 h-5 text-primary-orange" />
      MEMBRA Treasury / Support Pool
    </h3>

    <p className="text-sm text-text-muted mb-4">
      For immediate withdrawable money, the treasury must be funded by:
    </p>

    <div className="grid grid-cols-4 gap-3 mb-4">
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Donations</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Subscriptions</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Sponsors</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Grants</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Bounties</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Buyers</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Licensing customers</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted">Initial treasury</p>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-gradient-to-br from-primary-gold/10 to-primary-bronze/5 border border-primary-gold/30">
      <p className="text-sm font-medium text-primary-gold mb-1">Honest Equation</p>
      <p className="text-xs text-text-muted">
        Live chat + appraisal + proof = payable claim
      </p>
      <p className="text-xs text-text-muted">
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
    <div className="glass-card p-6 mb-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <QrCode className="w-5 h-5 text-primary-orange" />
        QR Gateway Workflow
      </h3>

      <div className="flex items-center gap-2 overflow-x-auto pb-4">
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className="flex items-center gap-3 min-w-[180px]">
              <div className="glass-card p-3 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-primary-orange">{step.number}</span>
                  <div className="w-2 h-2 rounded-full bg-success" />
                </div>
                <p className="text-xs font-medium mb-1">{step.label}</p>
                <p className="text-xs text-text-muted">{step.desc}</p>
              </div>
              {i < steps.length - 1 && <ArrowRight className="w-4 h-4 text-primary-orange/50 flex-shrink-0" />}
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-danger/10 border border-danger/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-text-primary mb-1">QR ≠ Blind Execution</p>
            <p className="text-xs text-text-muted">
              QR opens context page • Wallet signs intent • Program records proof • Rebate is disclosed • Receipt is provenance • Support is not investment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SolanaWalletSignature = () => (
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Wallet className="w-5 h-5 text-primary-orange" />
      Solana Wallet Signature Flow
    </h3>

    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-sm font-medium text-primary-orange mb-2">MEMBRA App Prepares Transaction</p>
        <div className="bg-background-50 rounded-lg p-3 font-mono text-xs text-text-muted">
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
        <ArrowDown className="w-6 h-6 text-primary-orange" />
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-sm font-medium text-primary-orange mb-2">Wallet Shows Transaction</p>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-orange to-primary-bronze flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-text-primary">Solana Wallet Popup</p>
            <p className="text-xs text-text-muted">Review transaction details</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <ArrowDown className="w-6 h-6 text-primary-orange" />
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-sm font-medium text-primary-orange mb-2">User Signs</p>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-gold to-primary-bronze flex items-center justify-center">
            <Key className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-text-primary">Local signature</p>
            <p className="text-xs text-text-muted">No private key exposure</p>
          </div>
          <CheckCircle className="w-6 h-6 text-success" />
        </div>
      </div>

      <div className="flex items-center justify-center">
        <ArrowDown className="w-6 h-6 text-primary-orange" />
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-sm font-medium text-primary-orange mb-2">Program Records Receipt</p>
        <div className="bg-background-50 rounded-lg p-3 font-mono text-xs text-text-muted">
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
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Coins className="w-5 h-5 text-primary-orange" />
      MCHAT Token Launch
    </h3>

    <div className="grid grid-cols-2 gap-4 mb-4">
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Token Name</p>
        <p className="text-lg font-bold text-text-primary">Membra Chat Proof</p>
      </div>
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Symbol</p>
        <p className="text-lg font-bold text-primary-orange">MCHAT</p>
      </div>
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Chain</p>
        <p className="text-lg font-bold text-text-primary">Solana Mainnet</p>
      </div>
      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Standard</p>
        <p className="text-lg font-bold text-text-primary">SPL / Token-2022</p>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10 mb-4">
      <p className="text-sm font-medium text-primary-orange mb-2">Token Purpose</p>
      <ul className="space-y-1 text-xs text-text-muted">
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

    <div className="p-4 rounded-xl bg-danger/10 border border-danger/20">
      <p className="text-xs text-danger font-medium mb-2">What It Is Not</p>
      <ul className="space-y-1 text-xs text-text-muted">
        <li>• Ownership of a person</li>
        <li>• Guaranteed profit</li>
        <li>• Claim on future income</li>
        <li>• Official OpenAI money</li>
        <li>• Security or investment product without legal structure</li>
      </ul>
    </div>
  </div>
);

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
    <div className="glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary-orange" />
          Solana Mainnet Token Launch State Machine
        </h3>
        <div className="px-3 py-1 rounded-full bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-xs font-bold">
          MCHAT STATUS: MANIFESTED, NOT MINTED
        </div>
      </div>
      
      <p className="text-xs text-text-muted mb-6">
        MCHAT exists only after a signed mainnet mint transaction creates a public mint address.
      </p>

      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6">
        {states.map((state, i) => (
          <React.Fragment key={state.label}>
            <div className={cn(
              "min-w-[160px] p-3 rounded-xl border transition-all relative",
              state.decisive 
                ? "bg-gradient-to-br from-danger/20 to-primary-bronze/10 border-danger/30 shadow-glow-red" 
                : state.status === 'Complete' 
                  ? "bg-success/10 border-success/30" 
                  : "bg-background-100 border-white/5"
            )}>
              {state.decisive && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-danger/20 border border-danger/30 text-xs text-danger font-bold">
                  NO MINT = NO TOKEN
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-primary-orange">{state.number}</span>
                {state.status === 'Complete' ? (
                  <CheckCircle className="w-3 h-3 text-success" />
                ) : state.decisive ? (
                  <Ban className="w-3 h-3 text-danger" />
                ) : (
                  <HelpCircle className="w-3 h-3 text-text-muted" />
                )}
              </div>
              <p className="text-xs font-medium mb-1 leading-tight">{state.label}</p>
              <p className="text-xs text-text-muted leading-tight mb-2">{state.desc}</p>
              <p className="text-xs text-primary-orange font-medium">Proof: {state.proof}</p>
            </div>
            {i < states.length - 1 && <ArrowRight className="w-4 h-4 text-primary-orange/50 flex-shrink-0" />}
          </React.Fragment>
        ))}
      </div>

      <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 mb-6">
        <p className="text-xs text-danger font-medium mb-2">
          MCHAT is not equity, not person ownership, not guaranteed profit, not OpenAI money, and not official fiat settlement.
        </p>
        <p className="text-xs text-text-muted">
          Proof ≠ Money • Token ≠ Profit • Testnet ≠ Settlement • Mint Address = Token Exists • Stripe Settlement = Official Fiat Money
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
          <p className="text-xs text-text-muted mb-3">Token Identity</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Name</span>
              <span className="text-xs font-medium text-text-primary">Membra Chat Proof</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Symbol</span>
              <span className="text-xs font-bold text-primary-orange">MCHAT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Chain</span>
              <span className="text-xs font-medium text-text-primary">Solana mainnet-beta</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Standard</span>
              <span className="text-xs font-medium text-text-primary">SPL / Token-2022</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Mint Address</span>
              <span className="text-xs font-medium text-danger">Not created yet</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-text-muted">Official Money</span>
              <span className="text-xs font-bold text-primary-gold">$0.00 until external settlement</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3 leading-tight">
            Purpose: Proof, access, support, artifact participation, and service-credit coordination.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
          <p className="text-xs text-text-muted mb-3">Mainnet Launch Requirements</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {checklistItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-primary-orange/30 flex items-center justify-center">
                  <CheckCircle className="w-2.5 h-2.5 text-primary-orange" />
                </div>
                <span className="text-xs text-text-muted">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10 mb-6">
        <p className="text-xs text-text-muted mb-3">Settlement Separation</p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-primary-orange/10 border border-primary-orange/20">
            <p className="text-xs font-bold text-primary-orange mb-2">MCHAT Layer</p>
            <ul className="space-y-1 text-xs text-text-muted">
              <li>• Proof coordination</li>
              <li>• Access</li>
              <li>• Support</li>
              <li>• Artifact participation</li>
              <li>• Notary credits</li>
              <li>• Service credits</li>
            </ul>
          </div>
          <div className="p-3 rounded-lg bg-primary-gold/10 border border-primary-gold/20">
            <p className="text-xs font-bold text-primary-gold mb-2">Stripe / Fiat Layer</p>
            <ul className="space-y-1 text-xs text-text-muted">
              <li>• Checkout completed</li>
              <li>• Invoice paid</li>
              <li>• Payment intent succeeded</li>
              <li>• Refund/dispute handling</li>
              <li>• Settled money receipt</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3 text-center">
          Token utility and fiat settlement are linked by receipts, not by profit promises.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted text-center leading-relaxed">
          A chat can birth a token thesis, manifest, proof economy, and public narrative. The token exists only after a signed Solana mainnet mint transaction creates a real mint address.
        </p>
      </div>
    </div>
  );
};

const ProductionDoctrine = () => (
  <div className="glass-card p-6 mb-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Shield className="w-5 h-5 text-primary-orange" />
      Production-Safe Doctrine
    </h3>

    <div className="space-y-3 mb-4">
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted">Screen share proves work context</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted">Webcam proves human presence only if user consents</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted">Prompt/response logs prove chat labor</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted">LLM appraisal prices the artifact</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted">Solana settles only funded claims</p>
      </div>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-background-100 border border-white/5">
        <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
        <p className="text-sm text-text-muted">Wallet receives money only from real treasury, buyer, donor, bounty, sponsor, or license</p>
      </div>
    </div>

    <div className="p-4 rounded-xl bg-danger/10 border border-danger/20">
      <p className="text-xs text-danger font-medium mb-2">What Not To Do</p>
      <ul className="space-y-1 text-xs text-text-muted">
        <li>• Do not stream raw private life by default</li>
        <li>• Do not put webcam video onchain</li>
        <li>• Do not put raw prompts onchain if they contain secrets</li>
        <li>• Do not expose private keys</li>
        <li>• Do not promise automatic income</li>
        <li>• Do not call rebates "yield"</li>
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
    <div className="glass-card p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Timer className="w-5 h-5 text-primary-orange" />
        MVP Build Order v0
      </h3>

      <div className="grid grid-cols-4 gap-4">
        {sprints.map((sprint, i) => (
          <div key={i} className={cn(
            "p-4 rounded-xl border",
            sprint.status === 'In Progress' 
              ? "bg-primary-orange/10 border-primary-orange/30" 
              : "bg-background-100 border-white/5"
          )}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-primary-orange">Sprint {sprint.number}</span>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium",
                sprint.status === 'In Progress' ? "bg-success/20 text-success" : "bg-background-200 text-text-muted"
              )}>
                {sprint.status}
              </span>
            </div>
            <ul className="space-y-2">
              {sprint.modules.map((module, j) => (
                <li key={j} className="flex items-start gap-2 text-xs text-text-muted">
                  <CheckCircle className="w-3 h-3 text-primary-orange flex-shrink-0 mt-0.5" />
                  <span>{module}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 rounded-xl bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted leading-relaxed">
          <span className="text-primary-orange font-medium">Architecture Decision:</span> LLM-based notary/KYC is assistive, not final authority. Use human reviewer, regulated KYC/KYB provider, notary node, auditable attestation hash, Stripe receipt, and testnet/onchain proof where identity verification, payments, compliance, or legal attestation matter.
        </p>
      </div>
    </div>
  );
};

const HumanValueDashboardSummary = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <BarChart3 className="w-5 h-5 text-primary-orange" />
      Human Value Dashboard
    </h3>

    <div className="grid grid-cols-5 gap-4">
      <div className="p-4 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Proof Value</p>
        <p className="text-xl font-bold text-text-primary">47 anchors</p>
      </div>
      <div className="p-4 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Product Value</p>
        <p className="text-xl font-bold text-text-primary">12 artifacts</p>
      </div>
      <div className="p-4 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Market Signal</p>
        <p className="text-xl font-bold text-primary-orange">8 leads</p>
        <p className="text-xs text-text-muted">14.2k views</p>
      </div>
      <div className="p-4 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Appraised Potential</p>
        <p className="text-xl font-bold text-text-muted">Unpriced</p>
      </div>
      <div className="p-4 rounded-lg bg-gradient-to-br from-primary-gold/10 to-primary-bronze/5 border border-primary-gold/30">
        <p className="text-xs text-text-muted mb-1">Settled Money</p>
        <p className="text-xl font-bold text-primary-gold">$0.00</p>
      </div>
    </div>

    <div className="mt-4 p-3 rounded-lg bg-background-100 border border-primary-orange/10">
      <p className="text-xs text-text-muted">
        MEMBRA shows potential without fabricating payout.
      </p>
    </div>
  </div>
);

// Physical-Liquidity Layer Components
const HouseholdInventoryCard = () => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Home className="w-5 h-5 text-primary-orange" />
        Household Inventory
      </h3>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-xs font-medium hover:bg-primary-orange/20 transition-colors">
        <Scan className="w-4 h-4" />
        Scan Room
      </button>
    </div>
    
    <div className="space-y-3">
      {householdInventory.map((item, i) => {
        const Icon = item.icon;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-background-100 border border-white/5 hover:border-primary-orange/20 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-orange/20 to-primary-bronze/10 border border-primary-orange/30 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary-orange" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary-orange/10 text-primary-orange">
                  {item.category}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>{item.price}</span>
                <span>•</span>
                <span className={item.status === 'Available' ? 'text-success' : item.status === 'In Use' ? 'text-primary-gold' : 'text-primary-orange'}>
                  {item.status}
                </span>
                <span>•</span>
                <span>Risk: {item.risk}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-text-muted mb-1">Utilization</p>
              <p className="text-sm font-bold text-primary-orange">{(item.utilization * 100).toFixed(0)}%</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const IntentMappingCard = () => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Target className="w-5 h-5 text-primary-orange" />
        Intent-to-Inventory Mapping
      </h3>
      <span className="text-xs text-text-muted">Intent is Inventory</span>
    </div>
    
    <div className="space-y-3">
      {intentData.map((intent, i) => (
        <div key={i} className="p-4 rounded-lg bg-background-100 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <span className="px-2 py-1 rounded-lg bg-primary-orange/10 border border-primary-orange/30 text-xs font-medium text-primary-orange">
              {intent.type}
            </span>
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              intent.status === 'Active' ? "bg-success/20 text-success" : "bg-primary-orange/20 text-primary-orange"
            )}>
              {intent.status}
            </span>
          </div>
          <p className="text-sm text-text-primary mb-2">{intent.intent}</p>
          <div className="flex items-center gap-4 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {intent.boundary}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {intent.timeWindow}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const LocalMatchesCard = () => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary-orange" />
        Local Commerce Matches
      </h3>
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Alpha Hub: 0.2mi</span>
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
      </div>
    </div>
    
    <div className="space-y-3">
      {localMatches.map((match, i) => (
        <div key={i} className="p-4 rounded-lg bg-background-100 border border-white/5 hover:border-primary-orange/20 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <p className="font-medium text-sm mb-1">{match.need}</p>
              <p className="text-xs text-text-muted">{match.match}</p>
            </div>
            <div className="text-right ml-4">
              <p className="font-bold text-primary-orange">{match.price}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {match.distance}
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Risk Score: {match.riskScore}
              </div>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              match.status === 'Ready' ? "bg-success/20 text-success" : 
              match.status === 'Pending' ? "bg-primary-orange/20 text-primary-orange" :
              "bg-background-200 text-text-muted"
            )}>
              {match.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const OSLayersVisualization = () => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Layers className="w-5 h-5 text-primary-orange" />
        MEMBRA Operating System Stack
      </h3>
    </div>
    
    <div className="space-y-2">
      {osLayers.map((layer, i) => {
        const Icon = layer.icon;
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-background-100 to-background-50 border border-white/5 hover:border-primary-orange/20 transition-colors">
            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${layer.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{layer.name}</p>
              <p className="text-xs text-text-muted">{layer.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ApartmentWarehouseCard = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Building className="w-5 h-5 text-primary-orange" />
      Your Apartment: The Nearest Warehouse
    </h3>
    
    <div className="relative aspect-video bg-gradient-to-br from-background-100 to-background-200 rounded-xl border border-primary-orange/20 mb-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[length:20px_20px] opacity-30" />
      
      {/* Apartment layout visualization */}
      <div className="absolute inset-4">
        <div className="relative h-full">
          {/* Rooms */}
          <div className="absolute top-0 left-0 w-1/2 h-1/2 border-2 border-primary-orange/30 rounded-lg bg-primary-orange/5 flex items-center justify-center">
            <div className="text-center">
              <Sofa className="w-8 h-8 text-primary-orange/50 mx-auto mb-1" />
              <p className="text-xs text-text-muted">Living</p>
              <p className="text-xs text-primary-orange">3 SKUs</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-1/2 border-2 border-primary-orange/30 rounded-lg bg-primary-orange/5 flex items-center justify-center">
            <div className="text-center">
              <Refrigerator className="w-8 h-8 text-primary-orange/50 mx-auto mb-1" />
              <p className="text-xs text-text-muted">Kitchen</p>
              <p className="text-xs text-primary-orange">2 SKUs</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 w-1/3 h-1/2 border-2 border-primary-orange/30 rounded-lg bg-primary-orange/5 flex items-center justify-center">
            <div className="text-center">
              <Armchair className="w-8 h-8 text-primary-orange/50 mx-auto mb-1" />
              <p className="text-xs text-text-muted">Bedroom</p>
              <p className="text-xs text-primary-orange">4 SKUs</p>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 w-2/3 h-1/2 border-2 border-primary-orange/30 rounded-lg bg-primary-orange/5 flex items-center justify-center">
            <div className="text-center">
              <Package className="w-8 h-8 text-primary-orange/50 mx-auto mb-1" />
              <p className="text-xs text-text-muted">Storage</p>
              <p className="text-xs text-primary-orange">8 SKUs</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Fulfillment indicator */}
      <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-success/20 border border-success/30">
        <p className="text-xs text-success font-medium">Fulfillment Active</p>
      </div>
    </div>
    
    <div className="grid grid-cols-3 gap-3">
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted mb-1">Total SKUs</p>
        <p className="text-lg font-bold text-primary-orange">17</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted mb-1">Active Listings</p>
        <p className="text-lg font-bold text-primary-gold">12</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
        <p className="text-xs text-text-muted mb-1">Monthly Revenue</p>
        <p className="text-lg font-bold text-success">$847</p>
      </div>
    </div>
  </div>
);

const MicroTransactionFlow = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Workflow className="w-5 h-5 text-primary-orange" />
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
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-orange/20 to-primary-bronze/10 border border-primary-orange/30 flex items-center justify-center mx-auto mb-2">
                  <Icon className="w-6 h-6 text-primary-orange" />
                </div>
                <p className="text-xs font-medium mb-1">{step.label}</p>
                <p className="text-xs text-text-muted">{step.desc}</p>
              </div>
              {i < 4 && <ArrowRight className="w-4 h-4 text-primary-orange/50 flex-shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="p-4 rounded-lg bg-background-100 border border-primary-orange/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Example: $40 Neighborhood Need</span>
          <span className="text-xs text-text-muted">Revenue Distribution</span>
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
              <span className="text-xs text-text-muted">{item.label}</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-background-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-orange to-primary-gold rounded-full" style={{ width: `${item.percent}%` }} />
                </div>
                <span className="text-xs font-medium text-primary-orange w-12 text-right">{item.amount}</span>
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
      <div className="glass-card p-4 min-w-[180px]">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-orange to-primary-bronze flex items-center justify-center">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="text-xs text-text-muted uppercase-tracking">0{index + 1}</span>
        </div>
        <h3 className="font-semibold text-sm mb-1">{stage.label}</h3>
        <p className="text-xs text-text-muted">{stage.desc}</p>
      </div>
      {!isLast && (
        <div className="w-12 h-px bg-gradient-to-r from-primary-orange/50 to-transparent" />
      )}
    </div>
  );
};

const NavItem = ({ item, isActive }) => {
  const Icon = item.icon;
  return (
    <button className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      isActive ? "bg-primary-orange/10 border border-primary-orange/30" : "hover:bg-white/5 border border-transparent"
    )}>
      <Icon className={cn("w-5 h-5", isActive ? "text-primary-orange" : "text-text-muted")} />
      <span className={cn("text-sm font-medium", isActive ? "text-text-primary" : "text-text-muted")}>{item.label}</span>
    </button>
  );
};

const KPICard = ({ kpi }) => (
  <div className="glass-card p-5">
    <p className="text-xs text-text-muted uppercase-tracking mb-2">{kpi.label}</p>
    <div className="flex items-baseline gap-3">
      <p className="text-2xl font-bold text-gradient">{kpi.value}</p>
      <span className={cn("text-xs font-medium", kpi.positive ? "text-success" : "text-danger")}>
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
  <div className={cn("border-2 border-primary-orange/30 rounded-lg p-3", size === 'large' ? "w-32 h-32" : "w-24 h-24")}>
    <div className="w-full h-full bg-gradient-to-br from-primary-orange/10 to-primary-bronze/5 rounded flex items-center justify-center">
      <QrCode className="w-12 h-12 text-primary-orange/50" />
    </div>
  </div>
);

const PublicWalletCard = () => (
  <div className="glass-card p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-orange to-primary-bronze flex items-center justify-center">
        <Wallet className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold">PUBLIC SUPPORT WALLET</h3>
        <p className="text-xs text-text-muted">Receive donations and payouts</p>
      </div>
    </div>
    
    <div className="flex items-center gap-6 mb-4">
      <QRPlaceholder />
      <div className="flex-1">
        <div className="glass-card p-3 mb-3">
          <p className="text-xs text-text-muted mb-1">Public Address</p>
          <p className="mono text-sm text-primary-orange break-all">YOUR_PUBLIC_WALLET_HERE</p>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-sm font-medium hover:bg-primary-orange/20 transition-colors">
            <Copy className="w-4 h-4" />
            Copy Address
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text-muted text-sm font-medium hover:bg-white/10 transition-colors">
            <ExternalLink className="w-4 h-4" />
            Open Ledger
          </button>
        </div>
      </div>
    </div>
    
    <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
      <p className="text-xs text-text-muted leading-relaxed">
        <span className="text-primary-orange font-medium">⚠ Safety:</span> Public address only. Generate keys locally. Never publish a private key.
      </p>
    </div>
  </div>
);

const OmniArtifactGateway = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <QrCode className="w-5 h-5 text-primary-orange" />
      OMNI-ARTIFACT GATEWAY
    </h3>
    
    <div className="flex items-center justify-center mb-6">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-orange/20 via-primary-gold/10 to-primary-bronze/20 rounded-2xl blur-xl" />
        <div className="relative glass-card p-6 rounded-2xl">
          <QRPlaceholder size="large" />
        </div>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Wallet Address</p>
        <p className="text-sm text-text-primary">Immediate donation and transaction interface.</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">System Diagram</p>
        <p className="text-sm text-text-primary">Embeds the architecture in scannable form.</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Investor Pitch</p>
        <p className="text-sm text-text-primary">Links to the public system narrative.</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Execution Trigger</p>
        <p className="text-sm text-text-primary">Starts an approved smart-contract or ledger action.</p>
      </div>
    </div>
  </div>
);

const PersonalChain = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-6 text-center uppercase-tracking text-sm">PERSONAL CHAIN PER HUMAN</h3>
    
    <div className="relative flex items-center justify-center mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-primary-orange/10 via-primary-gold/5 to-primary-bronze/10 rounded-full blur-2xl" />
      <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-primary-orange/20 to-primary-bronze/10 border-2 border-primary-orange/30 flex items-center justify-center">
        <Fingerprint className="w-16 h-16 text-primary-orange" />
      </div>
      
      {chainNodes.map((node, i) => {
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
            <div className="w-16 h-16 rounded-full glass-card flex items-center justify-center border border-primary-orange/20">
              <p className="text-xs font-medium text-center">{node}</p>
            </div>
            <div className="absolute top-1/2 left-1/2 w-8 h-px bg-gradient-to-r from-primary-orange/50 to-transparent origin-left" style={{ transform: `rotate(${angle * (180/Math.PI) + 90}deg)` }} />
          </div>
        );
      })}
    </div>
    
    <p className="text-center text-sm text-text-muted">
      Your personal chain. Your data. Your liquidity. Backed by public anchors and cross-chain receipts.
    </p>
  </div>
);

const ProvenanceModule = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Shield className="w-5 h-5 text-primary-orange" />
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
        <li key={i} className="flex items-center gap-2 text-sm text-text-muted">
          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
          {item}
        </li>
      ))}
    </ul>
    
    <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/20">
      <p className="text-xs text-text-muted mb-1">Artifact Hash</p>
      <p className="mono text-sm text-primary-orange">0x...F3A9E7</p>
    </div>
  </div>
);

const ReproducidescribeLoop = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <RefreshCw className="w-5 h-5 text-primary-orange" />
      Reproducidescribe Loop
    </h3>
    
    <div className="flex items-center justify-between mb-4">
      {['Image', 'Hash', 'Text', 'Style', 'UI', 'New UI'].map((item, i) => (
        <React.Fragment key={item}>
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-orange/20 to-primary-bronze/10 border border-primary-orange/30 flex items-center justify-center mb-2">
              <span className="text-xs font-medium">{item}</span>
            </div>
          </div>
          {i < 5 && <ArrowRight className="w-4 h-4 text-primary-orange/50" />}
        </React.Fragment>
      ))}
    </div>
    
    <p className="text-center text-sm text-text-muted italic">
      "Every change is hashed. Every version is anchored. Every UI is continuously reproducible."
    </p>
  </div>
);

const RewardCurve = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Activity className="w-5 h-5 text-primary-orange" />
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
    
    <div className="p-3 rounded-lg bg-background-100 border border-danger/20">
      <p className="text-xs text-text-muted leading-relaxed">
        <span className="text-danger font-medium">⚠ Disclaimer:</span> Conceptual model. Not a guarantee. Subject to legal and contract terms.
      </p>
    </div>
  </div>
);

const LiveArtifactEngine = () => {
  const [activeTab, setActiveTab] = useState('alpha');
  
  const logs = [
    { time: '12:45:23', type: 'success', message: 'New artifact: Room Scan #1021' },
    { time: '12:45:24', type: 'info', message: 'Artifact hash created' },
    { time: '12:45:25', type: 'info', message: 'IPFS metadata pinned' },
    { time: '12:45:26', type: 'info', message: 'GitHub ledger updated' },
    { time: '12:45:27', type: 'warning', message: 'Notary verification pending' },
    { time: '12:45:28', type: 'success', message: 'Payout event queued' },
  ];
  
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary-orange" />
          Live Artifact Engine
        </h3>
      </div>
      
      <div className="flex gap-2 mb-4">
        {['Alpha Feed', 'Ledger Stream', 'System Logs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '_'))}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              activeTab === tab.toLowerCase().replace(' ', '_')
                ? "bg-primary-orange/20 border border-primary-orange/30 text-primary-orange"
                : "bg-background-100 border border-transparent text-text-muted hover:bg-background-200"
            )}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="bg-background-100 rounded-lg p-4 font-mono text-xs space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
        {logs.map((log, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-text-muted">{log.time}</span>
            <span className={cn(
              log.type === 'success' ? 'text-success' : 
              log.type === 'warning' ? 'text-primary-orange' : 'text-text-muted'
            )}>
              [{log.type === 'success' ? '+' : log.type === 'warning' ? '!' : '~'}]
            </span>
            <span className="text-text-primary">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentArtifactsTable = () => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold">Recent Artifacts</h3>
      <button className="text-xs text-primary-orange hover:text-primary-gold transition-colors">
        View All
      </button>
    </div>
    
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-text-muted uppercase-tracking border-b border-white/5">
            <th className="text-left py-3 px-2">Artifact</th>
            <th className="text-left py-3 px-2">Type</th>
            <th className="text-left py-3 px-2">Status</th>
            <th className="text-left py-3 px-2">Hash</th>
            <th className="text-left py-3 px-2">Chain</th>
            <th className="text-left py-3 px-2">Created</th>
            <th className="text-left py-3 px-2">Value</th>
            <th className="text-left py-3 px-2">Payment</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {recentArtifacts.map((artifact, i) => (
            <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="py-3 px-2 font-medium">{artifact.name}</td>
              <td className="py-3 px-2 text-text-muted">{artifact.type}</td>
              <td className="py-3 px-2">
                <span className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  artifact.status === 'Anchored' ? "bg-success/20 text-success" :
                  artifact.status === 'Pending' ? "bg-primary-orange/20 text-primary-orange" :
                  "bg-background-200 text-text-muted"
                )}>
                  {artifact.status}
                </span>
              </td>
              <td className="py-3 px-2 mono text-xs text-primary-orange">{artifact.hash}</td>
              <td className="py-3 px-2 text-text-muted">{artifact.chain}</td>
              <td className="py-3 px-2 text-text-muted">{artifact.created}</td>
              <td className="py-3 px-2 font-medium">{artifact.value}</td>
              <td className="py-3 px-2 text-text-muted">{artifact.payment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MobilePreview = () => (
  <div className="glass-card p-6">
    <h3 className="font-semibold mb-4 flex items-center gap-2">
      <Smartphone className="w-5 h-5 text-primary-orange" />
      Mobile UI Preview
    </h3>
    
    <div className="flex justify-center">
      <div className="w-48 h-96 rounded-3xl bg-gradient-to-b from-background-100 to-background-50 border-4 border-primary-orange/30 p-4 flex flex-col">
        <div className="text-center mb-4">
          <p className="text-xs text-text-muted uppercase-tracking mb-1">Current Epoch</p>
          <p className="text-2xl font-bold text-gradient">012</p>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-text-muted">Your Ideas.</p>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-text-muted">Your Chain.</p>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-xs text-text-muted">Your Earnings.</p>
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-primary-orange/10 border border-primary-orange/30 mb-4">
          <p className="text-xs text-text-muted mb-1">Wallet Balance</p>
          <p className="text-lg font-bold text-primary-orange">$248.72</p>
        </div>
        
        <div className="mt-auto space-y-2">
          <button className="w-full p-2 rounded-lg bg-primary-orange/20 border border-primary-orange/30 text-xs font-medium text-primary-orange">
            New Idea
          </button>
          <button className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-text-muted">
            Scan & Add
          </button>
          <div className="flex gap-2">
            <button className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-text-muted">
              Anchor
            </button>
            <button className="flex-1 p-2 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-text-muted">
              Ledger
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LiveArtifactScan = () => (
  <div className="glass-card p-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold flex items-center gap-2">
        <Scan className="w-5 h-5 text-primary-orange" />
        Live Artifact Scan
      </h3>
      <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-xs font-medium hover:bg-primary-orange/20 transition-colors">
        <Plus className="w-4 h-4" />
        New Scan
      </button>
    </div>
    
    <div className="relative aspect-video bg-gradient-to-br from-background-100 to-background-200 rounded-xl border border-primary-orange/20 mb-4 overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[length:20px_20px] opacity-30" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-primary-orange/30 mx-auto mb-2" />
          <p className="text-sm text-text-muted">Room/Asset Scan Visualization</p>
        </div>
      </div>
      
      {/* Simulated object labels */}
      <div className="absolute top-4 left-4 px-2 py-1 rounded bg-background-100/90 border border-primary-orange/30 text-xs mono">
        Desk
      </div>
      <div className="absolute top-1/3 right-8 px-2 py-1 rounded bg-background-100/90 border border-primary-orange/30 text-xs mono">
        Shelf
      </div>
      <div className="absolute bottom-8 left-1/4 px-2 py-1 rounded bg-background-100/90 border border-primary-orange/30 text-xs mono">
        Chair
      </div>
    </div>
    
    <div className="grid grid-cols-4 gap-4">
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Objects Detected</p>
        <p className="text-lg font-bold text-text-primary">32</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Estimated Value</p>
        <p className="text-lg font-bold text-primary-orange">$18,420</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Confidence</p>
        <p className="text-lg font-bold text-success">98.4%</p>
      </div>
      <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10">
        <p className="text-xs text-text-muted mb-1">Verification</p>
        <p className="text-lg font-bold text-primary-gold">Anchored</p>
      </div>
    </div>
  </div>
);

const FooterCard = ({ card }) => {
  const Icon = card.icon;
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-orange/20 to-primary-bronze/10 border border-primary-orange/30 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary-orange" />
        </div>
        <h4 className="font-semibold text-sm">{card.title}</h4>
      </div>
      <p className="text-xs text-text-muted leading-relaxed">{card.desc}</p>
    </div>
  );
};

function App() {
  const [activeNav, setActiveNav] = useState('Overview');

  return (
    <div className="min-h-screen bg-background-50">
      {/* Header */}
      <header className="border-b border-white/5 bg-background-50/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="px-6 py-4">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-orange to-primary-bronze flex items-center justify-center">
                <Hash className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient tracking-tight">MEMBRA HUMAN CHAIN</h1>
                <p className="text-sm text-text-muted mt-1">
                  Idea Monetization Layer v0 • GitHub: overandor/chat-pipeline • Commit: cd348d5
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 rounded-lg bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-sm font-medium hover:bg-primary-orange/20 transition-colors">
                Create Artifact
              </button>
              <button className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-text-muted text-sm font-medium hover:bg-white/10 transition-colors">
                Hash & Anchor
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
        <aside className="w-64 min-h-screen border-r border-white/5 bg-background-100/50 backdrop-blur-sm p-4 sticky top-[140px] h-[calc(100vh-140px)]">
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
              <span className="text-xs text-text-muted">Network Status</span>
              <span className="flex items-center gap-1 text-xs text-success">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Alpha Net</span>
              <span className="text-xs text-primary-orange">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-muted">Trust Score</span>
              <span className="text-xs text-primary-gold font-bold">93.7</span>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Dashboard Title */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-3xl font-bold text-gradient">MEMBRA Idea Monetization Layer v0</h2>
              <div className="px-4 py-2 rounded-full bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-sm font-bold">
                MCHAT STATUS: MANIFESTED, NOT MINTED
              </div>
            </div>
            <p className="text-text-muted mb-4">MEMBRA does not pretend a chat is money. MEMBRA turns a chat into a proof capsule, a token thesis, a public launch manifest, and a disciplined path to settlement.</p>
            
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
                <p className="text-xs text-text-muted">Mint Address</p>
                <p className="text-sm font-bold text-danger">Not Created</p>
              </div>
              <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
                <p className="text-xs text-text-muted">Official Money</p>
                <p className="text-sm font-bold text-primary-gold">$0.00 Until External Settlement</p>
              </div>
              <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
                <p className="text-xs text-text-muted">Execution Requires</p>
                <p className="text-sm font-bold text-primary-orange">User Signature: True</p>
              </div>
              <div className="p-3 rounded-lg bg-background-100 border border-primary-orange/10 text-center">
                <p className="text-xs text-text-muted">Settlement Status</p>
                <p className="text-sm font-bold text-text-muted">Unsettled</p>
              </div>
            </div>
          </div>

          {/* Three State Machines */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gradient mb-4 flex items-center gap-2">
              <Workflow className="w-6 h-6 text-primary-orange" />
              MEMBRA Doctrine Stack
            </h3>

            <ValueStateMachine />
            <QRWorkflowFlow />
            <TokenLaunchStateMachine />
          </div>

          {/* Clean Product Architecture */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gradient mb-4 flex items-center gap-2">
              <Building className="w-6 h-6 text-primary-orange" />
              Clean Product Architecture
            </h3>

            <div className="glass-card p-6">
              <div className="flex items-center gap-3 overflow-x-auto pb-4">
                <div className="p-4 rounded-xl bg-primary-orange/10 border border-primary-orange/20">
                  <p className="text-sm font-bold text-primary-orange">Idea Monetization Layer v0</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-orange/50 flex-shrink-0" />
                <div className="p-4 rounded-xl bg-primary-orange/10 border border-primary-orange/20">
                  <p className="text-sm font-bold text-primary-orange">QR Gateway</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-orange/50 flex-shrink-0" />
                <div className="p-4 rounded-xl bg-primary-orange/10 border border-primary-orange/20">
                  <p className="text-sm font-bold text-primary-orange">Solana Wallet Signature</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-orange/50 flex-shrink-0" />
                <div className="p-4 rounded-xl bg-primary-orange/10 border border-primary-orange/20">
                  <p className="text-sm font-bold text-primary-orange">MCHAT Launch Discipline</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-orange/50 flex-shrink-0" />
                <div className="p-4 rounded-xl bg-primary-orange/10 border border-primary-orange/20">
                  <p className="text-sm font-bold text-primary-orange">Public Proof Capsule</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary-orange/50 flex-shrink-0" />
                <div className="p-4 rounded-xl bg-primary-gold/10 border border-primary-gold/30">
                  <p className="text-sm font-bold text-primary-gold">External Settlement</p>
                </div>
              </div>
            </div>
          </div>

          {/* Solana Wallet Signature Detail */}
          <div className="mb-8">
            <SolanaWalletSignature />
          </div>

          {/* Sprint Build Order */}
          <div className="mb-8">
            <SprintBuildOrder />
          </div>

          {/* Physical-Liquidity Layer */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gradient mb-4 flex items-center gap-2">
              <Building className="w-6 h-6 text-primary-orange" />
              Physical-Liquidity Layer
            </h3>
            
            {/* First Row: Apartment Warehouse + OS Stack */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="col-span-2">
                <ApartmentWarehouseCard />
              </div>
              <div className="col-span-1">
                <OSLayersVisualization />
              </div>
            </div>

            {/* Second Row: Household Inventory + Intent Mapping */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <HouseholdInventoryCard />
              <IntentMappingCard />
            </div>

            {/* Third Row: Local Matches + Micro Transaction Flow */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <LocalMatchesCard />
              <MicroTransactionFlow />
            </div>
          </div>

          {/* Original MEMBRA Components */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gradient mb-4 flex items-center gap-2">
              <Hash className="w-6 h-6 text-primary-orange" />
              Human Value Infrastructure
            </h3>

            {/* Main Grid */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              {/* Live Artifact Scan */}
              <div className="col-span-2">
                <LiveArtifactScan />
              </div>
              
              {/* Public Wallet */}
              <div>
                <PublicWalletCard />
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Omni Artifact Gateway */}
            <div className="col-span-1">
              <OmniArtifactGateway />
            </div>
            
            {/* Personal Chain */}
            <div className="col-span-1">
              <PersonalChain />
            </div>
            
            {/* Provenance Module */}
            <div className="col-span-1">
              <ProvenanceModule />
            </div>
          </div>

          {/* Third Row */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Reproducidescribe Loop */}
            <div className="col-span-1">
              <ReproducidescribeLoop />
            </div>
            
            {/* Reward Curve */}
            <div className="col-span-1">
              <RewardCurve />
            </div>
            
            {/* Live Artifact Engine */}
            <div className="col-span-1">
              <LiveArtifactEngine />
            </div>
          </div>

          {/* Recent Artifacts Table */}
          <div className="mb-6">
            <RecentArtifactsTable />
          </div>

          {/* Mobile Preview */}
          <div className="mb-6">
            <MobilePreview />
          </div>
          </div>

          {/* Footer Cards */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            {footerCards.map((card, i) => (
              <FooterCard key={i} card={card} />
            ))}
          </div>

          {/* Footer Line */}
          <div className="text-center py-6 border-t border-white/5">
            <p className="text-gradient font-semibold mb-2">A chat can birth a token thesis, manifest, proof economy, and public narrative.</p>
            <p className="text-gradient font-semibold mb-2">The token exists only after a signed Solana mainnet mint transaction creates a real mint address.</p>
            <p className="text-gradient font-semibold mb-4">Official money exists only after external settlement clears.</p>
            <p className="text-xs text-text-muted">Proof ≠ Money • Token ≠ Profit • Testnet ≠ Settlement • Mint Address = Token Exists • Stripe Settlement = Official Fiat Money</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
