import React from 'react';

export function StatCard({ label, value, hint, icon: Icon, tone = 'default', testId }) {
  const tones = {
    default: 'text-zinc-900',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-blue-600',
  };
  return (
    <div className="stat-tile" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div className="overline">{label}</div>
        {Icon && (
          <div className="h-8 w-8 flex items-center justify-center rounded-md bg-zinc-50 border border-border text-zinc-700">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight leading-none ${tones[tone]}`}>{value}</div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
