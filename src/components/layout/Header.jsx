import React from 'react';
import { Radio, Wallet } from 'lucide-react';
import { StatusBadge } from '../ui/GlassCard';

export default function Header() {
  return (
    <header className="border-b border-primary-orange/10 bg-background-50/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-orange to-primary-gold flex items-center justify-center">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient">MEMBRA</h1>
            <p className="text-xs text-text-muted">Chat-to-Chain Human Value Infrastructure</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status="pending">MCHAT: MANIFESTED, NOT MINTED</StatusBadge>
          <StatusBadge status="locked">MAINNET: APPROVAL REQUIRED</StatusBadge>
          <button className="px-4 py-2 rounded-lg bg-primary-orange/10 border border-primary-orange/30 text-primary-orange text-sm font-medium">
            <Wallet className="w-4 h-4 inline mr-2" />Connect Wallet
          </button>
        </div>
      </div>
    </header>
  );
}
