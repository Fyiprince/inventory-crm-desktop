import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Package,
  IndianRupee,
  CalendarDays,
} from 'lucide-react';

import { projectsApi, transactionsApi } from '@/lib/api';
import { projectSchema } from '@/lib/schemas';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const empty = {
  name: '',
  description: '',
  status: 'active',
};

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  completed: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  'on-hold': 'bg-amber-50 text-amber-700 border-amber-200',
};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export default function Projects() {
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const { data } = useQuery({
    queryKey: ['projects', page],
    queryFn: () =>
      projectsApi.list({
        page,
        pageSize: 10,
        sortBy: 'name',
        sortDir: 'asc',
      }),
  });

  const {
    data: usageData,
    isLoading: usageLoading,
  } = useQuery({
    queryKey: ['project-transactions', selectedProject?.id],
    queryFn: () =>
      transactionsApi.list({
        projectId: selectedProject.id,
        type: 'OUT',
        page: 1,
        pageSize: 100,
        sortBy: 'date',
        sortDir: 'desc',
      }),
    enabled: !!selectedProject?.id && usageOpen,
  });

  const form = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: empty,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(empty);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);

    form.reset({
      name: row.name,
      description: row.description || '',
      status: row.status || 'active',
    });

    setDialogOpen(true);
  };

  const openUsage = (row) => {
    setSelectedProject(row);
    setUsageOpen(true);
  };

  const createMut = useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => {
      toast.success('Project created');
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projs-all'] });
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, v }) => projectsApi.update(id, v),
    onSuccess: () => {
      toast.success('Project updated');
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projs-all'] });
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: projectsApi.remove,
    onSuccess: () => {
      toast.success('Project deleted');
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['projs-all'] });
      setConfirmId(null);
    },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });

  const transactions = usageData?.items || [];

  /*
   * Resolve the price used for each transaction.
   *
   * Priority:
   * 1. Stock Out transaction unitCost
   * 2. Product current price as fallback for older transactions
   */
  const getTransactionPrice = (txn) => {
    const transactionPrice = Number(txn.unitCost);

    if (
      txn.unitCost !== null &&
      txn.unitCost !== undefined &&
      Number.isFinite(transactionPrice) &&
      transactionPrice > 0
    ) {
      return transactionPrice;
    }

    const productPrice = Number(txn.product?.price);

    if (
      Number.isFinite(productPrice) &&
      productPrice > 0
    ) {
      return productPrice;
    }

    return 0;
  };

  const totalQuantity = transactions.reduce(
    (sum, txn) => sum + Number(txn.quantity || 0),
    0
  );

  const transactionPrices = transactions
    .map((txn) => getTransactionPrice(txn))
    .filter((price) => price > 0);

  const minPrice = transactionPrices.length
    ? Math.min(...transactionPrices)
    : 0;

  const maxPrice = transactionPrices.length
    ? Math.max(...transactionPrices)
    : 0;

  /*
   * Total Usage Value
   * = quantity × actual transaction price
   */
  const totalValue = transactions.reduce(
    (sum, txn) => {
      const quantity = Number(txn.quantity || 0);
      const price = getTransactionPrice(txn);

      return sum + quantity * price;
    },
    0
  );

  const priceRange =
    transactionPrices.length === 0
      ? 'No price'
      : minPrice === maxPrice
        ? formatCurrency(minPrice)
        : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`;

  const columns = [
    {
      key: 'name',
      header: 'Name',
      cell: (r) => (
        <div>
          <div className="font-medium text-zinc-900">
            {r.name}
          </div>

          {r.description && (
            <div className="text-xs text-muted-foreground truncate max-w-md">
              {r.description}
            </div>
          )}
        </div>
      ),
    },

    {
      key: 'status',
      header: 'Status',
      cell: (r) => (
        <Badge
          variant="outline"
          className={`font-normal ${STATUS_STYLES[r.status] || ''}`}
        >
          {r.status}
        </Badge>
      ),
    },

    {
      key: 'txns',
      header: 'Transactions',
      cell: (r) => (
        <span className="font-mono">
          {r._count?.transactions || 0}
        </span>
      ),
    },

    {
      key: 'usage',
      header: 'Usage',
      cell: (r) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => openUsage(r)}
          data-testid={`project-usage-${r.id}`}
        >
          <Eye className="w-3.5 h-3.5 mr-1.5" />
          View Usage
        </Button>
      ),
    },

    {
      key: 'actions',
      header: '',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEdit(r)}
            data-testid={`project-edit-${r.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => setConfirmId(r.id)}
            data-testid={`project-delete-${r.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div data-testid="page-projects">
      <PageHeader
        overline="Catalog"
        title="Projects"
        description="Every Stock Out is attributed to a project. Track consumption per site or workstream."
        actions={
          <Button
            onClick={openCreate}
            data-testid="project-add-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New project
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.items || []}
        page={page}
        pageSize={10}
        total={data?.total || 0}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        testId="projects-table"
      />

      {/* Create / Edit Project */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      >
        <DialogContent data-testid="project-dialog">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit project' : 'New project'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit((v) =>
              editing
                ? updateMut.mutate({
                    id: editing.id,
                    v,
                  })
                : createMut.mutate(v)
            )}
            className="space-y-4"
          >
            <div>
              <Label>Name *</Label>

              <Input
                {...form.register('name')}
                data-testid="project-form-name"
              />

              {form.formState.errors.name && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label>Description</Label>

              <Textarea
                rows={3}
                {...form.register('description')}
              />
            </div>

            <div>
              <Label>Status</Label>

              <Select
                value={form.watch('status')}
                onValueChange={(v) =>
                  form.setValue('status', v)
                }
              >
                <SelectTrigger data-testid="project-form-status">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="active">
                    Active
                  </SelectItem>

                  <SelectItem value="on-hold">
                    On Hold
                  </SelectItem>

                  <SelectItem value="completed">
                    Completed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                data-testid="project-form-submit"
              >
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Project Usage */}
      <Dialog
        open={usageOpen}
        onOpenChange={setUsageOpen}
      >
        <DialogContent className="max-w-6xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProject?.name} — Usage & Transactions
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Products Used */}
              <div className="rounded-lg border bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="w-4 h-4" />
                  Products Used
                </div>

                <div className="text-2xl font-semibold mt-2">
                  {
                    new Set(
                      transactions.map(
                        (txn) => txn.productId
                      )
                    ).size
                  }
                </div>
              </div>

              {/* Total Quantity */}
              <div className="rounded-lg border bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="w-4 h-4" />
                  Total Quantity
                </div>

                <div className="text-2xl font-semibold mt-2">
                  {totalQuantity}
                </div>
              </div>

              {/* Total Usage Value */}
              <div className="rounded-lg border bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IndianRupee className="w-4 h-4" />
                  Total Usage Value
                </div>

                <div className="text-2xl font-semibold mt-2">
                  {formatCurrency(totalValue)}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  Quantity × Stock Out Price
                </div>
              </div>

              {/* Price Range */}
              <div className="rounded-lg border bg-white p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <IndianRupee className="w-4 h-4" />
                  Price Range
                </div>

                <div className="text-2xl font-semibold mt-2">
                  {priceRange}
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  Lowest to highest Stock Out price
                </div>
              </div>
            </div>

            {/* Transactions */}
            <div className="rounded-lg border overflow-hidden">
              <div className="px-4 py-3 border-b bg-zinc-50">
                <div className="font-medium">
                  Stock Out History
                </div>

                <div className="text-xs text-muted-foreground mt-1">
                  Products consumed by this project
                </div>
              </div>

              {usageLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading transactions...
                </div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />

                  <p className="font-medium">
                    No products used yet
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Stock Out transactions for this project will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-zinc-50">
                        <th className="text-left px-4 py-3 font-medium">
                          Product
                        </th>

                        <th className="text-left px-4 py-3 font-medium">
                          SKU
                        </th>

                        <th className="text-right px-4 py-3 font-medium">
                          Qty
                        </th>

                        <th className="text-right px-4 py-3 font-medium">
                          Price / Unit
                        </th>

                        <th className="text-right px-4 py-3 font-medium">
                          Total
                        </th>

                        <th className="text-left px-4 py-3 font-medium">
                          Date
                        </th>

                        <th className="text-left px-4 py-3 font-medium">
                          Reference
                        </th>

                        <th className="text-left px-4 py-3 font-medium">
                          Note
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((txn) => {
                        const quantity = Number(
                          txn.quantity || 0
                        );

                        const unitCost =
                          getTransactionPrice(txn);

                        const total =
                          quantity * unitCost;

                        return (
                          <tr
                            key={txn.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-4 py-3">
                              <div className="font-medium">
                                {txn.product?.name || '-'}
                              </div>
                            </td>

                            <td className="px-4 py-3 font-mono text-xs">
                              {txn.product?.sku || '-'}
                            </td>

                            <td className="px-4 py-3 text-right font-mono">
                              {quantity}
                            </td>

                            <td className="px-4 py-3 text-right">
                              {unitCost > 0
                                ? formatCurrency(unitCost)
                                : 'No price'}
                            </td>

                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(total)}
                            </td>

                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatDate(txn.date)}
                              </div>
                            </td>

                            <td className="px-4 py-3 font-mono text-xs">
                              {txn.reference || '-'}
                            </td>

                            <td className="px-4 py-3 text-muted-foreground max-w-[180px] truncate">
                              {txn.note || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUsageOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) =>
          !v && setConfirmId(null)
        }
        title="Delete project?"
        description="Related transactions will lose the project link but remain in the log."
        onConfirm={() =>
          deleteMut.mutate(confirmId)
        }
        confirmLabel="Delete"
        destructive
        testId="project-delete-confirm"
      />
    </div>
  );
}