import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, productsApi, transactionsApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { formatINR, formatNumber, formatMonth, formatDateTime } from '@/lib/format';
import {
  Package, Boxes, Truck, FolderKanban, AlertTriangle, ArrowDownToLine,
  ArrowUpFromLine, ScrollText, IndianRupee,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#2563EB', '#16A34A', '#EAB308', '#DC2626', '#7C3AED', '#0EA5E9', '#F97316', '#14B8A6'];

export default function Dashboard() {
  const { data: summary } = useQuery({ queryKey: ['summary'], queryFn: reportsApi.summary });
  const { data: monthly = [] } = useQuery({ queryKey: ['monthly', 6], queryFn: () => reportsApi.monthly(6) });
  const { data: projectUsage = [] } = useQuery({ queryKey: ['projectUsage'], queryFn: reportsApi.projectUsage });
  const { data: lowStock = [] } = useQuery({ queryKey: ['lowStock'], queryFn: productsApi.lowStock });
  const { data: recent = [] } = useQuery({ queryKey: ['recent', 8], queryFn: () => transactionsApi.recent(8) });

  const chartData = monthly.map((m) => ({ name: formatMonth(m.month), In: m.in, Out: m.out }));

  return (
    <div className="max-w-[1600px]" data-testid="page-dashboard">
      <PageHeader
        overline="Overview"
        title="Operations dashboard"
        description="A single pane of glass over your inventory, movements and open positions."
        testId="dashboard-header"
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        <StatCard testId="stat-products" label="Products" value={formatNumber(summary?.products)} icon={Package} />
        <StatCard testId="stat-categories" label="Categories" value={formatNumber(summary?.categories)} icon={Boxes} />
        <StatCard testId="stat-suppliers" label="Suppliers" value={formatNumber(summary?.suppliers)} icon={Truck} />
        <StatCard testId="stat-projects" label="Projects" value={formatNumber(summary?.projects)} icon={FolderKanban} />
        <StatCard testId="stat-lowstock" label="Low Stock" value={formatNumber(summary?.lowStock)} icon={AlertTriangle} tone={summary?.lowStock ? 'danger' : 'default'} />
        <StatCard testId="stat-stock-value" label="Stock Value" value={formatINR(summary?.totalStockValue)} icon={IndianRupee} tone="success" />
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 card-flat p-6" data-testid="chart-monthly">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="overline">Last 6 months</div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Monthly stock movement</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#2563EB] rounded-sm" /> Stock In</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#DC2626] rounded-sm" /> Stock Out</span>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#52525b', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#52525b', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: 6, borderColor: '#e4e4e7', fontSize: 12 }} />
                <Bar dataKey="In" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Out" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card-flat p-6" data-testid="chart-project-usage">
          <div className="overline">Consumption</div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900 mb-4">Project-wise usage</h2>
          {projectUsage.length === 0 ? (
            <EmptyState title="No consumption yet" description="Record a Stock Out to see project usage." />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectUsage} dataKey="totalQuantity" nameKey="projectName" outerRadius={80} innerRadius={40} paddingAngle={2}>
                    {projectUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 6, borderColor: '#e4e4e7', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card-flat p-6" data-testid="section-low-stock">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="overline">Attention required</div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Low stock alerts</h2>
            </div>
            <Link to="/inventory" className="text-xs text-blue-600 hover:text-blue-800 transition-colors duration-150">View inventory →</Link>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="All products above minimum" description="No low stock alerts right now." />
          ) : (
            <div className="divide-y divide-border">
              {lowStock.slice(0, 6).map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between" data-testid={`lowstock-${p.sku}`}>
                  <div>
                    <div className="text-sm font-medium text-zinc-900">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.sku} · {p.category?.name || 'Uncategorised'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">
                      <span className="text-red-600 font-semibold">{p.currentStock}</span>
                      <span className="text-muted-foreground"> / min {p.minStock}</span>
                    </div>
                    <Badge variant="outline" className="mt-1 text-[10px] border-red-200 text-red-700 bg-red-50">Below minimum</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-flat p-6" data-testid="section-recent">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <div className="overline">Immutable log</div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Recent activity</h2>
            </div>
            <Link to="/transactions" className="text-xs text-blue-600 hover:text-blue-800 transition-colors duration-150">View all →</Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No transactions yet" description="Record your first Stock In or Stock Out to begin." />
          ) : (
            <div className="divide-y divide-border">
              {recent.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-3" data-testid={`recent-${t.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center border ${t.type === 'IN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      {t.type === 'IN' ? <ArrowDownToLine className="w-4 h-4" /> : <ArrowUpFromLine className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-900 truncate">{t.product?.name || '—'}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {t.type === 'OUT' && t.project ? `→ ${t.project.name} · ` : ''}{formatDateTime(t.date)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-mono font-semibold ${t.type === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'IN' ? '+' : '−'}{t.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
