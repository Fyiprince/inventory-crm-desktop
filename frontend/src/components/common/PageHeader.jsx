import React from 'react';

export function PageHeader({ overline, title, description, actions, testId }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border mb-6" data-testid={testId}>
      <div>
        {overline && <div className="overline mb-2">{overline}</div>}
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-none text-zinc-900">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground max-w-xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
