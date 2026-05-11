import React from 'react';
import { cn } from '../../utils';

export function GlassCard({ children, className }) {
  return (
    <div className={cn(
      'glass-card p-6',
      className
    )}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, sublabel, variant = 'default' }) {
  return (
    <div className={cn(
      'p-4 rounded-lg border text-center',
      variant === 'gold' && 'bg-gradient-to-br from-primary-gold/10 to-primary-bronze/5 border-primary-gold/30',
      variant === 'danger' && 'bg-danger/10 border-danger/20',
      variant === 'default' && 'bg-background-100 border-primary-orange/10'
    )}>
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={cn(
        'text-xl font-bold',
        variant === 'gold' && 'text-primary-gold',
        variant === 'danger' && 'text-danger',
        variant === 'default' && 'text-primary-orange'
      )}>{value}</p>
      {sublabel && <p className="text-xs text-text-muted mt-1">{sublabel}</p>}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  return (
    <span className={cn(
      'status-chip',
      status === 'active' || status === 'complete' ? 'active' :
      status === 'pending' ? 'pending' :
      status === 'locked' || status === 'required' ? 'locked' : 'pending'
    )}>
      {children || status}
    </span>
  );
}

export function StateStep({ step }) {
  return (
    <div className={cn(
      'min-w-[120px] p-3 rounded-lg border text-center relative',
      step.decisive && 'bg-gradient-to-br from-danger/20 to-primary-bronze/10 border-danger/30',
      step.status === 'complete' && 'bg-success/10 border-success/30',
      step.status !== 'complete' && !step.decisive && 'bg-background-100 border-white/5'
    )}>
      {step.decisive && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-danger/20 border border-danger/30 text-xs text-danger font-bold">
          NO MINT = NO TOKEN
        </div>
      )}
      <span className="text-xs font-bold text-primary-orange">{step.number}</span>
      <p className="text-xs mt-1">{step.label}</p>
      <StatusBadge status={step.status} />
    </div>
  );
}

export function TerminalPanel({ lines, className }) {
  return (
    <div className={cn('terminal-panel', className)}>
      {lines.map((line, i) => (
        <div key={i} className={line.type}>
          {line.type === 'prompt' && '$ '}
          {line.text}
        </div>
      ))}
    </div>
  );
}
