import React from 'react';
import { RefreshCw, Activity, TrendingUp, Users, Vote } from 'lucide-react';
import { cn, formatNumber, formatCurrency } from '../../utils';
import { MetricCard } from '../ui/GlassCard.jsx';
import { Button } from '../ui/Button.jsx';
import { StatusPill } from '../ui/StatusPill.jsx';

export function ProtocolDashboard({ protocolState, loading, error, onRefresh, className }) {
  const { ido, rebase, rewards, governance } = protocolState || {};

  const metrics = [
    {
      label: 'IDO Progress',
      value: ido ? `${(ido.percentComplete || 0).toFixed(1)}%` : '—',
      sublabel: ido ? `${formatCurrency(ido.amountRaised || 0)} raised` : 'Loading…',
      variant: 'default',
    },
    {
      label: 'Rebase Index',
      value: rebase ? rebase.index?.toFixed(6) ?? '—' : '—',
      sublabel: rebase?.oraclePrice ? `Oracle: $${rebase.oraclePrice}` : 'Loading…',
      variant: 'gold',
    },
    {
      label: 'Staking TVL',
      value: rewards ? formatCurrency(rewards.totalTVL || 0) : '—',
      sublabel: rewards?.userStake ? `Your stake: ${rewards.userStake} MCHAT` : 'Not staked',
      variant: 'default',
    },
    {
      label: 'Governance',
      value: governance ? formatNumber(governance.total || 0) : '—',
      sublabel: governance?.items
        ? `${governance.items.filter((p) => p.status === 'active').length} active`
        : 'Loading…',
      variant: 'default',
    },
  ];

  return (
    <div className={cn('glass-card p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-orange" />
          <h3 className="font-semibold">Protocol Dashboard</h3>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-xs text-danger">Failed to load</span>
          )}
          <Button
            variant="ghost"
            size="small"
            onClick={onRefresh}
            loading={loading}
            icon={RefreshCw}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 mb-5 sm:grid-cols-4">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            label={m.label}
            value={m.value}
            sublabel={m.sublabel}
            variant={m.variant}
          />
        ))}
      </div>

      {/* IDO progress bar */}
      {ido && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-orange" />
              <span className="text-sm font-medium">IDO Fundraise</span>
            </div>
            <StatusPill status={ido.status || 'pending'} label={ido.status || 'Pending'} />
          </div>
          <div className="h-2 rounded-full bg-background-100 border border-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-orange to-primary-gold rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, ido.percentComplete || 0)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-text-muted">{formatCurrency(ido.amountRaised || 0)}</span>
            <span className="text-xs text-text-muted">Target: {formatCurrency(ido.raiseTarget || 0)}</span>
          </div>
        </div>
      )}

      {/* Governance proposals summary */}
      {governance?.items && governance.items.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Vote className="w-4 h-4 text-primary-orange" />
            <span className="text-sm font-medium">Recent Proposals</span>
          </div>
          <div className="space-y-2">
            {governance.items.slice(0, 3).map((proposal, i) => (
              <div
                key={proposal.id || i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-background-100 border border-white/5"
              >
                <p className="text-xs text-text-primary truncate flex-1 mr-2">
                  {proposal.title || `Proposal ${i + 1}`}
                </p>
                <StatusPill status={proposal.status || 'pending'} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staker count */}
      {rewards && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
          <Users className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-muted">
            Total stakers: <span className="text-text-primary font-medium">{formatNumber(rewards.stakerCount || 0)}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default ProtocolDashboard;
