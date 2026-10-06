import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import { reportsApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { formatINR, formatNumber, formatMonth } from '@/lib/format';
import { exportToExcel, exportToPDF, printReport } from '@/lib/exporters';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatCard } from '@/components/common/StatCard';
import { Package, ScrollText, Warehouse, IndianRupee, TrendingUp } from 'lucide-react';

export default function Reports() {
  const [months, setMonths] = useState(6);
  const { data: summary } = useQuery({ queryKey: ['summary'], queryFn: reportsApi.summary });
  const { data: monthly = [] } = useQuery({ queryKey: ['monthly', months], queryFn: () => reportsApi.monthly(months) });
  const { data: projectUsage = [] } = useQuery({ queryKey: ['projectUsage'], queryFn: reportsApi.projectUsage });
  const { data: topProducts = [] } = useQuery({ queryKey: ['topProducts', 10], queryFn: () => reportsApi.topProducts(10) });

  const monthlyChart = monthly.map((m) => ({ name: formatMonth(m.month), In: m.in, Out: m.out, Net: m.in - m.out }));

  return (
    <div data-testid="page-reports">
      <PageHeader
        overline="Insights"
        title="Reports"
        description="Analytics across your stock movements, project consumption and inventory value."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Products" value={formatNumber(summary?.products)} icon={Package} testId="rep-total-products" />
        <StatCard label="Total Transactions" value={formatNumber(summary?.transactions)} icon={ScrollText} testId="rep-total-txns" />
        <StatCard label="Units in Stock" value={formatNumber(summary?.totalUnits)} icon={Warehouse} testId="rep-total-units" />
        <StatCard label="Stock Value" value={formatINR(summary?.totalStockValue)} icon={IndianRupee} tone="success" testId="rep-total-value" />
      </div>

      <Tabs defaultValue="movement">
        <TabsList data-testid="reports-tabs">
          <TabsTrigger value="movement" data-testid="tab-movement">Monthly Movement</TabsTrigger>
          <TabsTrigger value="project" data-testid="tab-project">Project Usage</TabsTrigger>
          <TabsTrigger value="top" data-testid="tab-top">Top Products</TabsTrigger>
        </TabsList>

        <TabsContent value="movement" className="mt-6">
          <div className="card-flat p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="overline">Trend</div>
                <h2 className="text-lg font-semibold tracking-tight">Stock In vs Stock Out</h2>
              </div>
              <div className="flex gap-2">
                {[3, 6, 12].map((m) => (
                  <Button key={m} variant={months === m ? 'default' : 'outline'} size="sm" onClick={() => setMonths(m)} data-testid={`rep-months-${m}`}>{m}M</Button>
                ))}
                <Button variant="outline" size="sm" onClick={() => exportToExcel(monthlyChart, [
                  { header: 'Month', accessor: 'name' }, { header: 'In', accessor: 'In' }, { header: 'Out', accessor: 'Out' }, { header: 'Net', accessor: 'Net' },
                ], 'monthly-movement.xlsx', 'Monthly')}><Download className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer>
                <LineChart data={monthlyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#52525b' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#52525b' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="In" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Out" stroke="#DC2626" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Net" stroke="#16A34A" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="project" className="mt-6">
          <div className="card-flat p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="overline">Consumption</div>
                <h2 className="text-lg font-semibold tracking-tight">Project-wise usage</h2>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => exportToExcel(projectUsage, [
                  { header: 'Project', accessor: 'projectName' }, { header: 'Units Used', accessor: 'totalQuantity' }, { header: 'Transactions', accessor: 'transactionCount' },
                ], 'project-usage.xlsx', 'Projects')} data-testid="rep-project-excel"><Download className="w-4 h-4 mr-1" />Excel</Button>
                <Button variant="outline" size="sm" onClick={() => exportToPDF(projectUsage, [
                  { header: 'Project', accessor: 'projectName' }, { header: 'Units Used', accessor: 'totalQuantity' }, { header: 'Transactions', accessor: 'transactionCount' },
                ], 'Project Usage', 'project-usage.pdf')} data-testid="rep-project-pdf">PDF</Button>
                <Button variant="outline" size="sm" onClick={() => printReport('Project-wise Usage', ['Project', 'Units Used', 'Transactions'], projectUsage.map((p) => [p.projectName, p.totalQuantity, p.transactionCount]))}><Printer className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer>
                <BarChart data={projectUsage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#52525b' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="projectName" tick={{ fontSize: 12, fill: '#52525b' }} axisLine={false} tickLine={false} width={140} />
                  <Tooltip contentStyle={{ borderRadius: 6, fontSize: 12 }} />
                  <Bar dataKey="totalQuantity" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="top" className="mt-6">
          <div className="card-flat p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="overline">Movement leaders</div>
                <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2"><TrendingUp className="w-4 h-4" />Top consumed products</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToExcel(topProducts, [
                { header: 'Product', accessor: (r) => r.product?.name }, { header: 'SKU', accessor: (r) => r.product?.sku }, { header: 'Units Out', accessor: 'totalOut' },
              ], 'top-products.xlsx', 'Top')} data-testid="rep-top-excel"><Download className="w-4 h-4 mr-1" />Excel</Button>
            </div>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr><th className="data-head">#</th><th className="data-head">Product</th><th className="data-head">SKU</th><th className="data-head text-right">Units Out</th></tr></thead>
                <tbody>
                  {topProducts.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">No data yet</td></tr>}
                  {topProducts.map((t, i) => (
                    <tr key={i} className="border-t border-border/70">
                      <td className="data-cell font-mono text-xs text-muted-foreground">{i + 1}</td>
                      <td className="data-cell font-medium">{t.product?.name || '—'}</td>
                      <td className="data-cell font-mono text-xs">{t.product?.sku}</td>
                      <td className="data-cell text-right font-mono font-semibold text-red-600">{t.totalOut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
