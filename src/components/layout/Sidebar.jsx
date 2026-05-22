import React from 'react';
import {
  LayoutDashboard, Box, Cpu, Wallet, ShoppingCart, Image, Settings, Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'artifacts', label: 'Artifacts', icon: Image },
  { id: 'inventory', label: 'Inventory', icon: Box },
  { id: 'tokensale', label: 'Token Sale', icon: ShoppingCart },
  { id: 'llm', label: 'LLM Engine', icon: Cpu },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }) {
  return (
    <aside className="neo-card w-64 h-screen sticky top-0 flex flex-col p-5 mr-4">
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-10 h-10 rounded-xl neo-btn-primary flex items-center justify-center">
          <Zap className="w-5 h-5 text-black" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gradient">MEMBRA</h1>
          <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">QR Gateway</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'neo-btn-primary text-black'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:neo-card'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-black' : ''}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t border-white/5">
        <div className="neo-card-pressed p-3 rounded-xl">
          <div className="flex items-center gap-2 mb-1">
            <div className="status-dot online" />
            <span className="text-xs font-medium text-[var(--accent-success)]">Live</span>
          </div>
          <p className="text-[10px] text-[var(--text-muted)]">Devnet • v1.2.0</p>
        </div>
      </div>
    </aside>
  );
}
