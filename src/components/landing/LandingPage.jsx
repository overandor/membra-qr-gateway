import React, { useEffect, useState } from 'react';
import {
  Hash, ArrowRight, Zap, Box, TrendingUp, Shield, Cpu,
  Wallet, Globe, Activity, ChevronDown, Sparkles, Lock,
  BarChart3, Layers, Fingerprint, QrCode, Target,
} from 'lucide-react';

function AnimatedGradient() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] opacity-20"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(255,138,31,0.15) 0%, transparent 50%)',
          animation: 'pulse-glow 8s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -top-1/2 -right-1/2 w-[200%] h-[200%] opacity-10"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(214,166,79,0.12) 0%, transparent 50%)',
          animation: 'pulse-glow 12s ease-in-out infinite reverse',
        }}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, delay }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`neo-card p-5 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      </div>
      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc, delay }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`neo-card p-6 group cursor-pointer transition-all duration-700 hover:border-[var(--accent-orange)]/25 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/20 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
        <Icon className="w-6 h-6 text-[var(--accent-orange)]" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
    </div>
  );
}

export function LandingPage({ onEnterApp, health, artifacts, events }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const stats = [
    { label: 'Backend Status', value: health ? 'Online' : 'Offline', icon: Activity, color: health ? 'text-[var(--accent-success)]' : 'text-[var(--accent-danger)]' },
    { label: 'Artifacts Anchored', value: artifacts.length, icon: Box, color: 'text-[var(--accent-orange)]' },
    { label: 'Events Tracked', value: events.length, icon: TrendingUp, color: 'text-[var(--accent-gold)]' },
    { label: 'LLM Engine', value: 'Ready', icon: Cpu, color: 'text-[var(--accent-success)]' },
  ];

  const features = [
    { icon: Box, title: 'Artifact Creation', desc: 'Photo, metadata, QR code, on-chain hash. Turn any idea into a provable digital asset.' },
    { icon: QrCode, title: 'QR Gateway', desc: 'Scan-to-claim, scan-to-verify. Every artifact has a scannable public proof capsule.' },
    { icon: Wallet, title: 'Solana Wallet', desc: 'Connect Phantom or Solflare. Sign transactions, mint tokens, anchor proofs on devnet.' },
    { icon: TrendingUp, title: 'Token Sales', desc: 'Launch bonding-curve IDOs with early-bonus logic, live rebase engine, and epoch history.' },
    { icon: Cpu, title: 'AI Engine', desc: 'Free LLM inference via Pollinations proxy. No API key needed. Chat with your artifacts.' },
    { icon: Shield, title: 'Trust Center', desc: 'Rebase auditing, contribution receipts, claim verification. Every action is traceable.' },
    { icon: Fingerprint, title: 'Provenance', desc: 'Merkle-tree anchoring, git-hash notary, Stripe settlement receipts. Full audit trail.' },
    { icon: Globe, title: 'Devnet Ready', desc: 'Anchor programs for governance, IDO, and LLM assets. Deployed on Solana devnet.' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-dark)] relative">
      <AnimatedGradient />

      {/* Navbar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[var(--bg-dark)]/90 backdrop-blur-xl border-b border-white/5' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-orange)] to-[var(--accent-bronze)] flex items-center justify-center">
              <Hash className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">MEMBRA</span>
          </div>
          <button
            onClick={onEnterApp}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-bronze)] text-white text-sm font-semibold hover:shadow-lg hover:shadow-[var(--accent-orange)]/20 transition-all flex items-center gap-2"
          >
            Launch App <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--accent-orange)]/10 border border-[var(--accent-orange)]/20 text-[var(--accent-orange)] text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Idea Monetization Layer v0</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
            <span className="text-gradient">Turn Ideas</span>
            <br />
            <span className="text-[var(--text-primary)]">Into Assets</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
            MEMBRA is a human-chain protocol. Create artifacts, anchor proof, launch tokens,
            and settle value — all from a single dashboard.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onEnterApp}
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-bronze)] text-white font-semibold hover:shadow-xl hover:shadow-[var(--accent-orange)]/20 transition-all flex items-center gap-2 text-lg"
            >
              <Zap className="w-5 h-5" />
              Enter Dashboard
            </button>
            <a
              href="https://github.com/overandor/membra-qr-gateway"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] font-medium hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Layers className="w-5 h-5" />
              View Docs
            </a>
          </div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} delay={i * 150} />
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gradient mb-3">Platform Capabilities</h2>
            <p className="text-[var(--text-muted)] max-w-xl mx-auto">
              Everything you need to go from idea to on-chain asset — in one place.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <FeatureCard key={f.title} {...f} delay={200 + i * 100} />
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline Visual */}
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="neo-card p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--accent-orange)]/10 to-transparent rounded-full blur-3xl" />

            <h2 className="text-2xl font-bold text-gradient mb-8 relative z-10">The MEMBRA Pipeline</h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
              {[
                { icon: Target, label: 'Intent', desc: 'Define what you want to prove' },
                { icon: Box, label: 'Artifact', desc: 'Create the proof capsule' },
                { icon: Lock, label: 'Anchor', desc: 'Hash + sign on-chain' },
                { icon: TrendingUp, label: 'Token', desc: 'Launch IDO or sale' },
                { icon: Shield, label: 'Settle', desc: 'Stripe or on-chain payout' },
              ].map((step, i) => (
                <div key={step.label} className="text-center">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--accent-orange)]/20 to-[var(--accent-bronze)]/10 border border-[var(--accent-orange)]/20 flex items-center justify-center mx-auto mb-3">
                    <step.icon className="w-6 h-6 text-[var(--accent-orange)]" />
                  </div>
                  <p className="font-semibold text-sm mb-1">{step.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{step.desc}</p>
                  {i < 4 && (
                    <div className="hidden md:block absolute top-8 left-0 right-0">
                      <ArrowRight className="w-4 h-4 text-[var(--accent-orange)]/30 mx-auto" style={{ marginLeft: `${(i + 0.5) * 20}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-20">
        <div className="max-w-3xl mx-auto text-center">
          <div className="neo-card p-10 md:p-14">
            <h2 className="text-3xl font-bold text-gradient mb-4">Ready to monetize your ideas?</h2>
            <p className="text-[var(--text-muted)] mb-8 max-w-lg mx-auto">
              Start with a photo, a prompt, or a concept. MEMBRA turns it into a provable, tradable, on-chain asset.
            </p>
            <button
              onClick={onEnterApp}
              className="px-10 py-4 rounded-xl bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-bronze)] text-white font-semibold text-lg hover:shadow-xl hover:shadow-[var(--accent-orange)]/30 transition-all inline-flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              Launch Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-[var(--accent-orange)]" />
            <span className="text-sm font-semibold">MEMBRA HUMAN CHAIN</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Proof &ne; Money &bull; Token &ne; Profit &bull; Testnet &ne; Settlement
          </p>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
            <a href="https://github.com/overandor/membra-qr-gateway" target="_blank" rel="noreferrer" className="hover:text-[var(--accent-orange)] transition-colors">GitHub</a>
            <span>v0.1.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
