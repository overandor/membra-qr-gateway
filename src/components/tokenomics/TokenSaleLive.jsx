import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Coins, Zap, RefreshCw, AlertTriangle, CheckCircle,
  Loader2, Users, Clock, BarChart3, ArrowRight, DollarSign
} from 'lucide-react';
import { api } from '../../services/api';

const DENOMINATION = 0.10;
const SOL_USD_RATE = 150;

function curvePrice(totalSold, maxSupply) {
  const s = maxSupply > 0 ? totalSold / maxSupply : 0;
  return DENOMINATION * (1 + s);
}

function earlyBonusPct(totalSold, maxSupply, maxBonusPct, decayLambda) {
  const s = maxSupply > 0 ? totalSold / maxSupply : 0;
  return maxBonusPct * Math.exp(-decayLambda * s);
}

export function TokenSaleLive() {
  const [sales, setSales] = useState([]);
  const [activeSale, setActiveSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [amount, setAmount] = useState('10');
  const [currency, setCurrency] = useState('USDC');
  const [contribResult, setContribResult] = useState(null);
  const [rebaseHistory, setRebaseHistory] = useState([]);
  const [rebaseState, setRebaseState] = useState(null);

  useEffect(() => {
    loadSales();
    const t = setInterval(loadSales, 30000);
    return () => clearInterval(t);
  }, []);

  async function loadSales() {
    try {
      setLoading(true);
      setError('');
      const events = await api.getEvents();
      const saleEvents = (events.events || events || []).filter((e) => e.event_type?.includes('sale') || e.subject_type === 'token_sale');
      if (saleEvents.length > 0) {
        setSales(saleEvents);
        if (!activeSale && saleEvents[0]) {
          selectSale(saleEvents[0].subject_id || saleEvents[0].artifact_id);
        }
      }
    } catch (e) {
      setError('Backend not connected. Start app.py on port 7860.');
    } finally {
      setLoading(false);
    }
  }

  const selectSale = async (saleId) => {
    try {
      const sale = await api.getTokenSale(saleId);
      setActiveSale(sale);
      const [state, history] = await Promise.all([
        api.getRebaseState(saleId).catch(() => null),
        api.getRebaseHistory(saleId, 10).catch(() => ({ epochs: [] })),
      ]);
      setRebaseState(state);
      setRebaseHistory(history.epochs || []);
      setContribResult(null);
    } catch (e) {
      setActiveSale(null);
    }
  };

  const handleContribute = async () => {
    if (!activeSale || !amount) return;
    setActionLoading(true);
    setError('');
    try {
      const amtNum = Math.max(parseFloat(amount) || 0, 0);
      const result = await api.recordContribution({
        sale_id: activeSale.sale_id,
        buyer_wallet: '',
        amount: amtNum,
        currency,
      });
      setContribResult(result);
      const updated = await api.getTokenSale(activeSale.sale_id);
      setActiveSale(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRebase = async () => {
    if (!activeSale) return;
    setActionLoading(true);
    setError('');
    try {
      await api.triggerRebase({ sale_id: activeSale.sale_id });
      const [state, history] = await Promise.all([
        api.getRebaseState(activeSale.sale_id),
        api.getRebaseHistory(activeSale.sale_id, 10),
      ]);
      setRebaseState(state);
      setRebaseHistory(history.epochs || []);
      const updated = await api.getTokenSale(activeSale.sale_id);
      setActiveSale(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const maxSupply = activeSale?.max_supply || 10_000_000;
  const totalSold = activeSale?.total_sold || 0;
  const totalRaised = activeSale?.total_raised || 0;
  const currentPrice = curvePrice(totalSold, maxSupply);
  const bonusPct = earlyBonusPct(totalSold, maxSupply, activeSale?.max_bonus_pct || 0.5, activeSale?.decay_lambda || 3);
  const supplyFraction = maxSupply > 0 ? totalSold / maxSupply : 0;

  if (loading) {
    return (
      <div className="neo-card p-12 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-orange)]" />
        <p className="text-sm text-[var(--text-muted)] mt-3">Loading token sales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Sales', value: sales.length, icon: BarChart3, color: 'text-[var(--accent-orange)]' },
          { label: 'Total Raised', value: `$${totalRaised.toFixed(2)}`, icon: DollarSign, color: 'text-[var(--accent-success)]' },
          { label: 'Tokens Sold', value: totalSold.toLocaleString(), icon: Coins, color: 'text-[var(--accent-gold)]' },
          { label: 'Current Price', value: `$${currentPrice.toFixed(3)}`, icon: TrendingUp, color: 'text-[var(--accent-orange)]' },
        ].map((stat) => (
          <div key={stat.label} className="neo-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-[var(--text-muted)] uppercase-tracking">{stat.label}</span>
            </div>
            <p className="text-xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Sale Selector */}
      {sales.length > 0 && (
        <div className="neo-card p-4">
          <label className="text-[10px] text-[var(--text-muted)] uppercase-tracking mb-2 block">Select Token Sale</label>
          <div className="flex gap-2 flex-wrap">
            {sales.map((s) => (
              <button
                key={s.subject_id || s.artifact_id}
                onClick={() => selectSale(s.subject_id || s.artifact_id)}
                className={`neo-btn px-3 py-1.5 text-xs ${
                  activeSale?.sale_id === (s.subject_id || s.artifact_id) ? 'neo-btn-primary text-black' : ''
                }`}
              >
                {s.name || s.subject_id?.slice(0, 8) || 'Sale'}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeSale && (
        <>
          {/* Sale Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="neo-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--accent-orange)]" />
                {activeSale.name || 'Token Sale'}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Symbol</span>
                  <span className="font-medium">{activeSale.symbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Max Supply</span>
                  <span className="font-medium">{(activeSale.max_supply || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Sold</span>
                  <span className="font-medium">{totalSold.toLocaleString()} ({(supplyFraction * 100).toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Bonus</span>
                  <span className="font-medium text-[var(--accent-success)]">+{(bonusPct * 100).toFixed(1)}%</span>
                </div>
                <div className="neo-card-pressed p-3 rounded-lg mt-4">
                  <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-gold)] transition-all duration-500"
                      style={{ width: `${Math.min(supplyFraction * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contribute */}
            <div className="neo-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Coins className="w-5 h-5 text-[var(--accent-gold)]" />
                Contribute
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="neo-input flex-1 px-3 py-2.5 text-sm"
                    placeholder="Amount"
                  />
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="neo-input px-3 py-2.5 text-sm appearance-none"
                  >
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>
                <div className="neo-card-pressed p-3 rounded-lg text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Price</span><span>${currentPrice.toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Base</span><span>{(parseFloat(amount || 0) / currentPrice).toFixed(0)} tokens</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-muted)]">Bonus</span><span className="text-[var(--accent-success)]">+{((parseFloat(amount || 0) / currentPrice) * bonusPct).toFixed(0)}</span></div>
                </div>
                <button
                  onClick={handleContribute}
                  disabled={actionLoading}
                  className="neo-btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Contribute
                </button>
              </div>
              {contribResult && (
                <div className="mt-3 neo-card-pressed p-3 rounded-lg animate-fade-in-up">
                  <div className="flex items-center gap-2 text-[var(--accent-success)] mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-xs font-medium">Contribution recorded</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mono">{contribResult.receipt_hash || contribResult.position}</p>
                </div>
              )}
            </div>
          </div>

          {/* Rebase Engine */}
          <div className="neo-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-[var(--accent-gold)]" />
                Rebase Engine
              </h3>
              <button
                onClick={handleRebase}
                disabled={actionLoading}
                className="neo-btn px-3 py-1.5 text-xs flex items-center gap-1 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Trigger Rebase
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="neo-card-pressed p-3 rounded-lg">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Epoch</p>
                <p className="text-lg font-bold">{rebaseState?.epoch || 0}</p>
              </div>
              <div className="neo-card-pressed p-3 rounded-lg">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Market Price</p>
                <p className="text-lg font-bold">${(rebaseState?.market_price || DENOMINATION).toFixed(3)}</p>
              </div>
              <div className="neo-card-pressed p-3 rounded-lg">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Holders</p>
                <p className="text-lg font-bold">{rebaseState?.holder_count || 0}</p>
              </div>
              <div className="neo-card-pressed p-3 rounded-lg">
                <p className="text-[10px] text-[var(--text-muted)] uppercase-tracking">Total Supply</p>
                <p className="text-lg font-bold">{(rebaseState?.total_supply || 0).toLocaleString()}</p>
              </div>
            </div>
            {rebaseHistory.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                {rebaseHistory.map((epoch, i) => (
                  <div key={i} className="neo-card-pressed p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-[var(--text-muted)]" />
                      <span className="font-medium">Epoch {epoch.epoch}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[var(--text-muted)]">
                      <span>${epoch.market_price?.toFixed(3)}</span>
                      <span>{epoch.holders} holders</span>
                      <span className="text-[var(--accent-success)]">+{epoch.bonus_issued?.toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {error && (
        <div className="neo-card p-4 flex items-center gap-2 text-[var(--accent-danger)]">
          <AlertTriangle className="w-4 h-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
