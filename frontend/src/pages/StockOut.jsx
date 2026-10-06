import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import {
  ArrowUpFromLine,
  PackageMinus,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react';

import { productsApi, projectsApi, transactionsApi } from '@/lib/api';
import { stockOutSchema, projectSchema } from '@/lib/schemas';
import { PageHeader } from '@/components/common/PageHeader';
import { QuickCreate } from '@/components/common/QuickCreate';
import { formatDateTime, formatNumber } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const today = () => dayjs().format('YYYY-MM-DD');

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function StockOut() {
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['prods-all'],
    queryFn: productsApi.all,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projs-all'],
    queryFn: projectsApi.all,
  });

  const form = useForm({
    resolver: zodResolver(stockOutSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      unitCost: 0,
      projectId: '',
      stockOutBy: '',
      date: today(),
      note: '',
    },
  });

  const productId = form.watch('productId');
  const quantity = Number(form.watch('quantity') || 0);
  const unitCost = Number(form.watch('unitCost') || 0);
  const projectId = form.watch('projectId');

  const { data: recent = [] } = useQuery({
    queryKey: ['recent-out'],
    queryFn: () =>
      transactionsApi.list({
        type: 'OUT',
        pageSize: 6,
        page: 1,
      }),
  });

  // Fetch all Stock In transactions for the selected product
  // so the Stock Out price can use the weighted average purchase price.
  const { data: purchaseTransactions = {} } = useQuery({
    queryKey: ['stockout-purchase-transactions', productId],
    queryFn: () =>
      transactionsApi.list({
        productId,
        type: 'IN',
        pageSize: 1000,
        page: 1,
        sortBy: 'date',
        sortDir: 'desc',
      }),
    enabled: !!productId,
  });

  const selected = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId]
  );

  const insufficient =
    selected && quantity > Number(selected.currentStock);

  const totalValue = quantity * unitCost;

  // Weighted average purchase price from Stock In transactions.
  const averagePurchasePrice = useMemo(() => {
    const transactions = purchaseTransactions?.items || [];

    const validTransactions = transactions.filter(
      (txn) =>
        txn.type === 'IN' &&
        txn.unitCost !== null &&
        txn.unitCost !== undefined &&
        Number(txn.unitCost) >= 0 &&
        Number(txn.quantity) > 0
    );

    if (validTransactions.length === 0) {
      return 0;
    }

    let totalQuantity = 0;
    let totalPurchaseValue = 0;

    validTransactions.forEach((txn) => {
      const qty = Number(txn.quantity || 0);
      const price = Number(txn.unitCost || 0);

      totalQuantity += qty;
      totalPurchaseValue += qty * price;
    });

    return totalQuantity > 0
      ? totalPurchaseValue / totalQuantity
      : 0;
  }, [purchaseTransactions]);

  // Auto-fill Stock Out price whenever a product is selected.
  React.useEffect(() => {
    if (!productId) return;

    if (averagePurchasePrice > 0) {
      form.setValue(
        'unitCost',
        Number(averagePurchasePrice.toFixed(3)),
        {
          shouldValidate: true,
        }
      );
    }
  }, [productId, averagePurchasePrice, form]);

  const mut = useMutation({
    mutationFn: transactionsApi.stockOut,

    onSuccess: () => {
      toast.success('Stock deducted and transaction logged');

      qc.invalidateQueries();

      form.reset({
        productId: '',
        quantity: 1,
        unitCost: 0,
        projectId: '',
        stockOutBy: '',
        date: today(),
        note: '',
      });
    },

    onError: (e) =>
      toast.error(e.friendly || 'Failed to record stock out'),
  });

  const onSubmit = (v) => {
    if (!selected) {
      toast.error('Please select a product');
      return;
    }

    if (insufficient) {
      toast.error(
        `Insufficient stock. Available: ${selected.currentStock}`
      );
      return;
    }

    const stockOutBy =
      form.getValues('stockOutBy')?.trim() || '';

    if (!stockOutBy) {
      toast.error('Please enter who performed the stock out');
      return;
    }

    const payload = {
      ...v,
      quantity: Number(v.quantity),
      unitCost: Number(v.unitCost),
      projectId: v.projectId || null,
      stockOutBy,
      date: dayjs(v.date).toISOString(),
    };

    mut.mutate(payload);
  };

  return (
    <div data-testid="page-stock-out">
      <PageHeader
        overline="Operations"
        title="Stock Out"
        description="Deduct inventory attributed to a project. Available stock is validated before writing."
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* FORM */}
        <div className="xl:col-span-2 card-flat p-6">
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-2 gap-5"
          >

            {/* PRODUCT */}
            <div className="col-span-2">
              <Label>Product *</Label>

              <SearchableSelect
                value={productId}
                onValueChange={(v) =>
                  form.setValue('productId', v, {
                    shouldValidate: true,
                  })
                }
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.sku} — ${p.name}`,
                  searchText: `${p.sku} ${p.name} ${p.category?.name || ''} ${p.location || ''} ${p.rackNumber || ''}`,
                  render: () => (
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                        {p.sku}
                      </span>
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {p.currentStock} {p.unit}
                      </span>
                    </div>
                  ),
                }))}
                placeholder="Select a product"
                searchPlaceholder="Type SKU or product name…"
                emptyMessage="No matching products found."
                testId="stockout-product"
              />

              {form.formState.errors.productId && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.productId.message}
                </p>
              )}
            </div>

            {/* QUANTITY */}
            <div>
              <Label>Quantity *</Label>

              <Input
                type="number"
                min="1"
                {...form.register('quantity')}
                data-testid="stockout-quantity"
              />

              {form.formState.errors.quantity && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>

            {/* STOCK OUT PRICE */}
            <div>
              <Label>Stock Out Price (₹) *</Label>

              <Input
                type="number"
                min="0"
                step="0.001"
                placeholder="Enter price per unit"
                {...form.register('unitCost')}
                data-testid="stockout-price"
              />

              {form.formState.errors.unitCost && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.unitCost.message}
                </p>
              )}

              <p className="text-xs text-muted-foreground mt-1">
                {averagePurchasePrice > 0
                  ? `Auto-filled from average purchase price: ${formatCurrency(averagePurchasePrice)}`
                  : 'Price per unit'}
              </p>
            </div>

            {/* PROJECT */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5" />
                  Project *
                </Label>

                <QuickCreate
                  label="New project"
                  title="Create new project"
                  schema={projectSchema}
                  defaults={{
                    name: '',
                    description: '',
                    status: 'active',
                  }}
                  fields={[
                    {
                      name: 'name',
                      label: 'Project name',
                      required: true,
                    },
                    {
                      name: 'description',
                      label: 'Description',
                      textarea: true,
                    },
                  ]}
                  createFn={(v) =>
                    projectsApi.create({
                      ...v,
                      status: 'active',
                    })
                  }
                  invalidateKeys={[
                    ['projs-all'],
                    ['projects'],
                  ]}
                  onCreated={(id) =>
                    form.setValue('projectId', id, {
                      shouldValidate: true,
                    })
                  }
                  testId="stockout-quick-project"
                />
              </div>

              <Select
                value={projectId}
                onValueChange={(v) =>
                  form.setValue('projectId', v, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger data-testid="stockout-project">
                  <SelectValue placeholder="Attribute to project" />
                </SelectTrigger>

                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {form.formState.errors.projectId && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.projectId.message}
                </p>
              )}
            </div>

            {/* DATE */}
            <div>
              <Label>Date *</Label>

              <Input
                type="date"
                {...form.register('date')}
                data-testid="stockout-date"
              />

              {form.formState.errors.date && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.date.message}
                </p>
              )}
            </div>

            {/* STOCK OUT BY */}
            <div className="col-span-2">
              <Label>Stock Out By *</Label>

              <Input
                type="text"
                placeholder="Enter the name of the person who performed the stock out"
                {...form.register('stockOutBy')}
                data-testid="stockout-by"
              />

              <p className="text-xs text-muted-foreground mt-1">
                Enter the name of the person who took the stock out.
              </p>
            </div>

            {/* NOTE */}
            <div className="col-span-2">
              <Label>Note (optional)</Label>

              <Textarea
                rows={2}
                placeholder="Site details, requestor, PO…"
                {...form.register('note')}
                data-testid="stockout-note"
              />
            </div>

            {/* INSUFFICIENT STOCK */}
            {insufficient && (
              <div
                className="col-span-2 flex items-center gap-2 p-3 rounded-md border border-red-200 bg-red-50 text-red-800 text-sm"
                data-testid="stockout-insufficient"
              >
                <AlertTriangle className="w-4 h-4" />

                Insufficient stock. Available:{' '}

                <span className="font-mono font-semibold">
                  {selected.currentStock}
                </span>
              </div>
            )}

            {/* SUMMARY */}
            <div className="col-span-2 border-t border-border pt-4">
              <div className="grid grid-cols-3 gap-4">

                <div>
                  <div className="text-xs text-muted-foreground">
                    Current Stock
                  </div>

                  <div className="font-mono font-semibold text-zinc-900">
                    {selected
                      ? `${formatNumber(selected.currentStock)} ${selected.unit}`
                      : '—'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    After Stock Out
                  </div>

                  <div
                    className={`font-mono font-semibold ${
                      insufficient
                        ? 'text-red-600'
                        : 'text-zinc-900'
                    }`}
                  >
                    {selected
                      ? `${formatNumber(
                          selected.currentStock - quantity
                        )} ${selected.unit}`
                      : '—'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Value
                  </div>

                  <div className="font-mono font-semibold text-red-600">
                    {formatCurrency(totalValue)}
                  </div>
                </div>

              </div>
            </div>

            {/* SUBMIT */}
            <div className="col-span-2 flex items-center justify-between pt-2 border-t border-border">

              <div className="text-xs text-muted-foreground">
                {selected ? (
                  <>
                    {formatCurrency(unitCost)} ×{' '}
                    {formatNumber(quantity)} {selected.unit}
                    {' = '}
                    <span className="font-semibold text-zinc-900">
                      {formatCurrency(totalValue)}
                    </span>
                  </>
                ) : (
                  'Select a product to preview the stock change.'
                )}
              </div>

              <Button
                type="submit"
                disabled={mut.isPending || insufficient}
                variant="default"
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                data-testid="stockout-submit"
              >
                <ArrowUpFromLine className="w-4 h-4 mr-2" />

                {mut.isPending
                  ? 'Recording…'
                  : 'Record stock out'}
              </Button>

            </div>
          </form>
        </div>

        {/* RECENT STOCK OUT */}
        <div className="card-flat p-6">
          <div className="flex items-center gap-2 mb-3">
            <PackageMinus className="w-4 h-4 text-red-600" />

            <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
              Recent stock-out
            </h2>
          </div>

          {(recent.items || []).length === 0 ? (
            <div className="text-xs text-muted-foreground py-8 text-center">
              No entries yet.
            </div>
          ) : (
            <div className="divide-y divide-border">

              {(recent.items || []).map((t) => (
                <div
                  key={t.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-900">
                      {t.product?.name}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      → {t.project?.name || 'No project'} ·{' '}
                      {formatDateTime(t.date)}
                    </div>

                    {t.stockOutBy && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Stock Out By: {t.stockOutBy}
                      </div>
                    )}

                    {t.unitCost !== null &&
                      t.unitCost !== undefined && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {formatCurrency(t.unitCost)} ×{' '}
                          {t.quantity}
                        </div>
                      )}
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-mono font-semibold text-red-600">
                      −{t.quantity}
                    </div>

                    {t.unitCost !== null &&
                      t.unitCost !== undefined && (
                        <div className="text-xs font-mono text-zinc-600">
                          {formatCurrency(
                            Number(t.unitCost) *
                              Number(t.quantity)
                          )}
                        </div>
                      )}
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