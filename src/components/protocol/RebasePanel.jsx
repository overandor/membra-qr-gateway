import React from 'react';
import { RefreshCw, Clock, TrendingUp, Activity } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { cn, formatNumber } from '../../utils';
import { StatusPill } from '../ui/StatusPill.jsx';

function formatTime(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card p-2 text-xs">
        <p className="text-text-muted">{label}</p>
        <p className="text-primary-orange font-bold">Index: {payload[0]?.value?.toFixed(8)}</p>
      </div>
    );
  }
  return null;
};

export function RebasePanel({ rebaseState, loading, className }) {
  const {
    index = 1,
    lastRebaseTime,
    nextRebaseETA,
    oraclePrice,
    history = [],
  } = rebaseState || {};

  // Build chart data from history or mock a flat line
  const chartData = history.length > 0
    ? history.map((h) => ({ time: formatTime(h.timestamp), index: h.index }))
    : [{ time: '—', index }];

  return (
    <div className={cn('glass-card p-6', className)}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary-orange" />
          <h3 className="font-semibold">Rebase Protocol</h3>
        </div>
        <StatusPill status={loading ? 'pending' : 'active'} label={loading ? 'Loading' : 'Live'} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-orange/30 border-t-primary-orange rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-center">
              <p className="text-xs text-text-muted mb-1">Rebase Index</p>
              <p className="text-base font-bold text-primary-gold">{index?.toFixed(6) ?? '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-center">
              <p className="text-xs text-text-muted mb-1">Oracle Price</p>
              <p className="text-base font-bold text-primary-orange">
                {oraclePrice ? `$${oraclePrice}` : '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-background-100 border border-white/5 text-center">
              <p className="text-xs text-text-muted mb-1">Last Rebase</p>
              <p className="text-sm font-bold text-text-primary">{formatRelative(lastRebaseTime)}</p>
            </div>
          </div>

          {/* Next rebase */}
          {nextRebaseETA && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary-orange/10 border border-primary-orange/20">
              <Clock className="w-4 h-4 text-primary-orange flex-shrink-0" />
              <div>
                <p className="text-xs text-text-muted">Next Rebase ETA</p>
                <p className="text-sm font-semibold text-primary-orange">{formatTime(nextRebaseETA)}</p>
              </div>
            </div>
          )}

          {/* Mini chart */}
          {chartData.length > 1 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-text-muted" />
                <p className="text-xs text-text-muted">Rebase Index History</p>
              </div>
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="rebaseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF8A1F" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF8A1F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9B9489' }} tickLine={false} axisLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="index"
                      stroke="#FF8A1F"
                      strokeWidth={2}
                      fill="url(#rebaseGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {!rebaseState && (
            <p className="text-sm text-text-muted text-center py-4">Rebase state unavailable.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default RebasePanel;
