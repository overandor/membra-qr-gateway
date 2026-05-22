import React from 'react';

export function Dashboard({ children, title, subtitle, action }) {
  return (
    <div className="flex-1 min-h-screen p-6 overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="text-sm text-[var(--text-muted)] mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
