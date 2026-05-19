import React, { useState, useEffect } from 'react';
import { Package, ExternalLink, Clock, Search, Filter, AlertTriangle } from 'lucide-react';
import { api } from '../../services/api';

export function InventoryGrid() {
  const [artifacts, setArtifacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const data = await api.getArtifacts();
        if (!cancelled) setArtifacts(Array.isArray(data) ? data : data.artifacts || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = artifacts.filter((a) => {
    const matchText = !filter || JSON.stringify(a).toLowerCase().includes(filter.toLowerCase());
    const matchType = typeFilter === 'all' || a.artifact_type === typeFilter;
    return matchText && matchType;
  });

  const types = [...new Set(artifacts.map((a) => a.artifact_type).filter(Boolean))];

  if (loading) {
    return (
      <div className="neo-card p-12 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-orange)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)] mt-3">Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="neo-card p-6 flex items-center gap-2 text-[var(--accent-danger)]">
        <AlertTriangle className="w-5 h-5" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="neo-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search artifacts..."
            className="neo-input w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="neo-input px-3 py-2 text-sm appearance-none"
          >
            <option value="all">All Types</option>
            {types.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div className="neo-card-pressed px-3 py-2 rounded-lg text-sm text-[var(--text-muted)]">
          {filtered.length} of {artifacts.length}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="neo-card p-12 text-center">
          <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">No artifacts found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <div key={a.artifact_id} className="neo-card p-5 animate-fade-in-up">
              <div className="flex items-start justify-between mb-3">
                <div className="neo-elevated w-10 h-10 rounded-lg flex items-center justify-center">
                  <Package className="w-5 h-5 text-[var(--accent-orange)]" />
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  a.status === 'active' ? 'bg-[var(--accent-success)]/10 text-[var(--accent-success)]' :
                  a.status === 'pending' ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)]' :
                  'bg-white/5 text-[var(--text-muted)]'
                }`}>
                  {a.status}
                </span>
              </div>
              <h4 className="font-semibold text-sm mb-1 truncate">{a.artifact_title}</h4>
              <p className="text-[11px] text-[var(--text-muted)] mb-3 truncate">{a.artifact_type}</p>
              <div className="space-y-1.5 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span className="truncate">{a.created_at?.slice(0, 16) || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-[10px] opacity-60 truncate">{a.artifact_id}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                <a
                  href={a.qr_url || `/g/${a.artifact_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="neo-btn flex-1 py-1.5 text-center text-xs flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> QR
                </a>
                <a
                  href={a.destination_url}
                  target="_blank"
                  rel="noreferrer"
                  className="neo-btn flex-1 py-1.5 text-center text-xs flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Link
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
