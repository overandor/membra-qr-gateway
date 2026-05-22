import React from 'react';
import { cn } from '../../utils';

const pillVariants = {
  active: 'bg-success/15 border border-success/30 text-success',
  pending: 'bg-primary-gold/15 border border-primary-gold/30 text-primary-gold',
  failed: 'bg-danger/15 border border-danger/30 text-danger',
  locked: 'bg-white/5 border border-white/10 text-text-muted',
  verified: 'bg-success/15 border border-success/30 text-success',
  invalid: 'bg-danger/15 border border-danger/30 text-danger',
  complete: 'bg-success/15 border border-success/30 text-success',
  warning: 'bg-primary-gold/15 border border-primary-gold/30 text-primary-gold',
};

const dotVariants = {
  active: 'bg-success',
  pending: 'bg-primary-gold',
  failed: 'bg-danger',
  locked: 'bg-text-muted',
  verified: 'bg-success',
  invalid: 'bg-danger',
  complete: 'bg-success',
  warning: 'bg-primary-gold',
};

export function StatusPill({ status, label, showDot = true, className }) {
  const normalizedStatus = (status || 'locked').toLowerCase();
  const pillClass = pillVariants[normalizedStatus] || pillVariants.locked;
  const dotClass = dotVariants[normalizedStatus] || dotVariants.locked;
  const displayLabel = label || status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        pillClass,
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dotClass)} />
      )}
      {displayLabel}
    </span>
  );
}

export default StatusPill;
