import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { categoriesApi } from '@/lib/api';
import { categorySchema } from '@/lib/schemas';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function Categories() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const { data } = useQuery({
    queryKey: ['categories', page],
    queryFn: () => categoriesApi.list({ page, pageSize: 10, sortBy: 'name', sortDir: 'asc' }),
  });

  const form = useForm({ resolver: zodResolver(categorySchema), defaultValues: { name: '', description: '', skuPrefix: '' } });
  const openCreate = () => { setEditing(null); form.reset({ name: '', description: '', skuPrefix: '' }); setDialogOpen(true); };
  const openEdit = (row) => { setEditing(row); form.reset({ name: row.name, description: row.description || '', skuPrefix: row.skuPrefix || '' }); setDialogOpen(true); };

  const createMut = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => { toast.success('Category created'); qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['cats-all'] }); setDialogOpen(false); },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, v }) => categoriesApi.update(id, v),
    onSuccess: () => { toast.success('Category updated'); qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['cats-all'] }); setDialogOpen(false); },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });
  const deleteMut = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => { toast.success('Category deleted'); qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['cats-all'] }); setConfirmId(null); },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });

  const columns = [
    { key: 'name', header: 'Name', cell: (r) => <div className="font-medium text-zinc-900">{r.name}</div> },
    { key: 'description', header: 'Description', cell: (r) => <span className="text-muted-foreground">{r.description || '—'}</span> },
    { key: 'skuPrefix', header: 'SKU Prefix', cell: (r) => <Badge variant="outline" className="font-mono">{r.skuPrefix || '—'}</Badge> },
    { key: 'count', header: 'Products', cell: (r) => <Badge variant="secondary" className="font-mono">{r._count?.products || 0}</Badge> },
    { key: 'actions', header: '', cell: (r) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} data-testid={`category-edit-${r.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={() => setConfirmId(r.id)} data-testid={`category-delete-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>
    ) },
  ];

  return (
    <div data-testid="page-categories">
      <PageHeader
        overline="Catalog"
        title="Categories"
        description="Organise your SKUs into meaningful groups for faster lookup and cleaner reports."
        actions={<Button onClick={openCreate} data-testid="category-add-btn"><Plus className="w-4 h-4 mr-2" />New category</Button>}
      />
      <DataTable
        columns={columns}
        data={data?.items || []}
        page={page}
        pageSize={10}
        total={data?.total || 0}
        totalPages={data?.totalPages || 1}
        onPageChange={setPage}
        testId="categories-table"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="category-dialog">
          <DialogHeader><DialogTitle>{editing ? 'Edit category' : 'New category'}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => editing ? updateMut.mutate({ id: editing.id, v }) : createMut.mutate(v))} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input {...form.register('name')} data-testid="category-form-name" />
              {form.formState.errors.name && <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>}
            </div>
            <div>
              <Label>SKU Prefix *</Label>
              <Input
                {...form.register('skuPrefix')}
                placeholder="CHOC-"
                onChange={(e) => form.setValue('skuPrefix', e.target.value.toUpperCase(), { shouldValidate: true })}
                data-testid="category-form-sku-prefix"
              />
              <p className="text-xs text-muted-foreground mt-1">Example: CHOC- → products can use CHOC-001, CHOC-002...</p>
              {form.formState.errors.skuPrefix && <p className="text-xs text-red-600 mt-1">{form.formState.errors.skuPrefix.message}</p>}
            </div>
            <div>
              <Label>Description</Label>
              <Textarea {...form.register('description')} rows={3} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="category-form-submit">{editing ? 'Save' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog open={!!confirmId} onOpenChange={(v) => !v && setConfirmId(null)} title="Delete category?" description="Products remain but will be uncategorised." onConfirm={() => deleteMut.mutate(confirmId)} confirmLabel="Delete" destructive testId="category-delete-confirm" />
    </div>
  );
}
