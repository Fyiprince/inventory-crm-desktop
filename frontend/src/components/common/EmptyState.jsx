import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ title = 'No data yet', description, action, testId }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 border border-dashed border-border rounded-md bg-zinc-50/40" data-testid={testId}>
      <div className="h-12 w-12 rounded-md bg-white border border-border flex items-center justify-center text-zinc-500">
        <Inbox className="w-5 h-5" />
      </div>
      <div className="mt-4 text-sm font-medium text-zinc-800">{title}</div>
      {description && <div className="mt-1 text-xs text-muted-foreground max-w-sm">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
