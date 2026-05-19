import React, { useState, useEffect } from 'react';
import { Settings, Server, Globe, Shield, Save, CheckCircle } from 'lucide-react';

export function SettingsPanel() {
  const [apiUrl, setApiUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:7860');
  const [solanaNetwork, setSolanaNetwork] = useState(import.meta.env.VITE_SOLANA_NETWORK || 'devnet');
  const [rpcUrl, setRpcUrl] = useState(import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('membra_api_url', apiUrl);
    localStorage.setItem('membra_solana_network', solanaNetwork);
    localStorage.setItem('membra_rpc_url', rpcUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => {
    setApiUrl(localStorage.getItem('membra_api_url') || apiUrl);
    setSolanaNetwork(localStorage.getItem('membra_solana_network') || solanaNetwork);
    setRpcUrl(localStorage.getItem('membra_rpc_url') || rpcUrl);
  }, []);

  return (
    <div className="neo-card p-6 max-w-2xl">
      <h3 className="text-lg font-semibold mb-5 flex items-center gap-2">
        <Settings className="w-5 h-5 text-[var(--accent-orange)]" />
        Gateway Configuration
      </h3>
      <div className="space-y-4">
        <div>
          <label className="text-[10px] text-[var(--text-muted)] uppercase-tracking mb-1 block flex items-center gap-1">
            <Server className="w-3 h-3" /> API Base URL
          </label>
          <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} className="neo-input w-full px-3 py-2.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase-tracking mb-1 block flex items-center gap-1">
              <Globe className="w-3 h-3" /> Solana Network
            </label>
            <select value={solanaNetwork} onChange={(e) => setSolanaNetwork(e.target.value)} className="neo-input w-full px-3 py-2.5 text-sm appearance-none">
              <option value="devnet">Devnet</option>
              <option value="mainnet-beta">Mainnet</option>
              <option value="testnet">Testnet</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-[var(--text-muted)] uppercase-tracking mb-1 block flex items-center gap-1">
              <Shield className="w-3 h-3" /> RPC URL
            </label>
            <input value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} className="neo-input w-full px-3 py-2.5 text-sm" />
          </div>
        </div>
        <button
          onClick={handleSave}
          className={`neo-btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2 ${saved ? 'bg-[var(--accent-success)]' : ''}`}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
