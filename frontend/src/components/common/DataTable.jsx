import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';

export function DataTable({
  columns,
  data,
  page = 1,
  pageSize = 10,
  total = 0,
  totalPages = 1,
  onPageChange,
  onSortChange,
  sortBy,
  sortDir = 'desc',
  testId = 'data-table',
  emptyMessage = 'No records',
}) {
  const handleSort = (key) => {
    if (!onSortChange) return;
    if (sortBy === key) onSortChange(key, sortDir === 'asc' ? 'desc' : 'asc');
    else onSortChange(key, 'asc');
  };
  return (
    <div className="border border-border rounded-md bg-card overflow-hidden" data-testid={testId}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="data-head" style={{ width: col.width }}>
                  <button
                    className={`flex items-center gap-1 ${col.sortable ? 'cursor-pointer hover:text-zinc-900' : 'cursor-default'}`}
                    onClick={() => col.sortable && handleSort(col.key)}
                    disabled={!col.sortable}
                    type="button"
                  >
                    {col.header}
                    {col.sortable && <ArrowUpDown className={`w-3 h-3 ${sortBy === col.key ? 'text-zinc-900' : 'text-zinc-400'}`} />}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-sm text-muted-foreground">{emptyMessage}</td>
              </tr>
            )}
            {data.map((row, idx) => (
              <tr key={row.id || idx} className="border-t border-border/70 hover:bg-zinc-50 transition-colors duration-150" data-testid={`${testId}-row-${idx}`}>
                {columns.map((col) => (
                  <td key={col.key} className="data-cell">
                    {col.cell ? col.cell(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-zinc-50/50">
          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-zinc-800">{(page - 1) * pageSize + 1}</span>–<span className="font-medium text-zinc-800">{Math.min(page * pageSize, total)}</span> of <span className="font-medium text-zinc-800">{total}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPageChange && onPageChange(Math.max(1, page - 1))} disabled={page <= 1} data-testid={`${testId}-prev`}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="text-xs text-muted-foreground">Page {page} of {totalPages}</div>
            <Button variant="outline" size="sm" onClick={() => onPageChange && onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} data-testid={`${testId}-next`}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
