import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Download, Printer, AlertTriangle, MapPin, Archive } from 'lucide-react';

import { productsApi, categoriesApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { formatNumber, formatINR } from '@/lib/format';
import { exportToExcel, exportToPDF, printReport } from '@/lib/exporters';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function Inventory() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [sortBy, setSortBy] = useState('currentStock');
  const [sortDir, setSortDir] = useState('asc');

  const { data: categories = [] } = useQuery({ queryKey: ['cats-all'], queryFn: categoriesApi.all });
  const { data } = useQuery({
    queryKey: ['inventory', { page, search, categoryId, lowStock, sortBy, sortDir }],
    queryFn: () => productsApi.list({ page, pageSize: 15, search, categoryId: categoryId || undefined, lowStock, sortBy, sortDir }),
  });

  const columns = [
    { key: 'sku', header: 'SKU', sortable: true, cell: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'name', header: 'Product', sortable: true, cell: (r) => <span className="font-medium text-zinc-900">{r.name}</span> },
    { key: 'category', header: 'Category', cell: (r) => r.category?.name ? <Badge variant="secondary" className="font-normal">{r.category.name}</Badge> : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'location', header: 'Location', cell: (r) => r.location ? (
      <div className="flex items-center gap-1.5 text-sm">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{r.location}</span>
      </div>
    ) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'rackNumber', header: 'Rack', cell: (r) => r.rackNumber ? (
      <div className="flex items-center gap-1.5 text-sm font-mono">
        <Archive className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{r.rackNumber}</span>
      </div>
    ) : <span className="text-muted-foreground text-xs">—</span> },
    { key: 'currentStock', header: 'Stock', sortable: true, cell: (r) => {
      const low = r.currentStock <= r.minStock;
      return (
        <div className="flex items-center gap-2">
          <span className={`font-mono font-semibold ${low ? 'text-red-600' : 'text-zinc-900'}`}>{formatNumber(r.currentStock)}</span>
          <span className="text-muted-foreground text-xs">{r.unit}</span>
          {low && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
        </div>
      );
    } },
    { key: 'minStock', header: 'Min', cell: (r) => <span className="font-mono text-xs text-muted-foreground">{r.minStock}</span> },
    { key: 'value', header: 'Stock Value', cell: (r) => <span className="font-mono">{formatINR((r.price || 0) * r.currentStock)}</span> },
    { key: 'status', header: 'Status', cell: (r) => {
      const low = r.currentStock <= r.minStock;
      if (r.currentStock === 0) return <Badge className="bg-red-50 text-red-700 border-red-200 border font-normal">Out of stock</Badge>;
      if (low) return <Badge className="bg-amber-50 text-amber-700 border-amber-200 border font-normal">Low</Badge>;
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border font-normal">Healthy</Badge>;
    } },
  ];

  const exportCols = [
    { header: 'SKU', accessor: 'sku' },
    { header: 'Product', accessor: 'name' },
    { header: 'Category', accessor: (r) => r.category?.name || '' },
    { header: 'Location', accessor: 'location' },
    { header: 'Rack Number', accessor: 'rackNumber' },
    { header: 'Current Stock', accessor: 'currentStock' },
    { header: 'Unit', accessor: 'unit' },
    { header: 'Min Stock', accessor: 'minStock' },
    { header: 'Stock Value (INR)', accessor: (r) => (r.price || 0) * r.currentStock },
  ];

  const handlePrint = () => {
    const rows = (data?.items || []).map((r) => [
      r.sku,
      r.name,
      r.category?.name || '—',
      r.location || '—',
      r.rackNumber || '—',
      `${r.currentStock} ${r.unit}`,
      r.minStock,
      formatINR((r.price || 0) * r.currentStock),
    ]);
    printReport('Inventory Report', ['SKU', 'Product', 'Category', 'Location', 'Rack', 'Current Stock', 'Min', 'Value'], rows);
  };

  return (
    <div data-testid="page-inventory">
      <PageHeader
        overline="Operations"
        title="Inventory"
        description="Live view of current stock. Filter by category, view low-stock only, and export or print for audits."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportToExcel(data?.items || [], exportCols, 'inventory.xlsx', 'Inventory')} data-testid="inv-export-excel"><Download className="w-4 h-4 mr-2" />Excel</Button>
            <Button variant="outline" onClick={() => exportToPDF(data?.items || [], exportCols, 'Inventory Report', 'inventory.pdf')} data-testid="inv-export-pdf">PDF</Button>
            <Button variant="outline" onClick={handlePrint} data-testid="inv-print"><Printer className="w-4 h-4 mr-2" />Print</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 border border-border rounded-md px-2 h-9 bg-white w-full max-w-sm">
          <Search className="w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search…" className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0" data-testid="inv-search" />
        </div>
        <Select value={categoryId || 'all'} onValueChange={(v) => { setCategoryId(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-48" data-testid="inv-filter-category"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-zinc-700 select-none">
          <Checkbox checked={lowStock} onCheckedChange={(v) => { setLowStock(!!v); setPage(1); }} data-testid="inv-filter-lowstock" />
          Low stock only
        </label>
      </div>

      <DataTable
        columns={columns}
        data={data?.items || []}
        page={page}
        pageSize={15}
        total={data?.total || 0}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        onSortChange={(k, d) => { setSortBy(k); setSortDir(d); }}
        sortBy={sortBy}
        sortDir={sortDir}
        testId="inventory-table"
      />
    </div>
  );
}
