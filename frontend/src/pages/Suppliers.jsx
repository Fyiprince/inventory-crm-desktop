import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { suppliersApi } from '@/lib/api';
import { supplierSchema } from '@/lib/schemas';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const empty = {
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: '',
  gstNumber: '',
};

export default function Suppliers() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const { data } = useQuery({
    queryKey: ['suppliers', page],
    queryFn: () =>
      suppliersApi.list({
        page,
        pageSize: 10,
        sortBy: 'name',
        sortDir: 'asc',
      }),
  });

  const form = useForm({
    resolver: zodResolver(supplierSchema),
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
      ...empty,
      ...row,
    });
    setDialogOpen(true);
  };

  const createMut = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      toast.success('Supplier created');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['sups-all'] });
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, v }) => suppliersApi.update(id, v),
    onSuccess: () => {
      toast.success('Supplier updated');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['sups-all'] });
      setDialogOpen(false);
    },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: suppliersApi.remove,
    onSuccess: () => {
      toast.success('Supplier deleted');
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      qc.invalidateQueries({ queryKey: ['sups-all'] });
      setConfirmId(null);
    },
    onError: (e) => toast.error(e.friendly || 'Failed'),
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      cell: (r) => (
        <div>
          <div className="font-medium text-zinc-900">{r.name}</div>
          {r.contact && (
            <div className="text-xs text-muted-foreground">
              Contact: {r.contact}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: (r) =>
        r.phone || (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'email',
      header: 'Email',
      cell: (r) =>
        r.email ? (
          <a
            href={`mailto:${r.email}`}
            className="text-blue-600 hover:underline"
          >
            {r.email}
          </a>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'gstNumber',
      header: 'GSTIN',
      cell: (r) =>
        r.gstNumber || (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: 'address',
      header: 'Address',
      cell: (r) => (
        <span className="text-muted-foreground">
          {r.address || '—'}
        </span>
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
            data-testid={`supplier-edit-${r.id}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => setConfirmId(r.id)}
            data-testid={`supplier-delete-${r.id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div data-testid="page-suppliers">
      <PageHeader
        overline="Catalog"
        title="Suppliers"
        description="Vendors and partners feeding your inventory pipeline."
        actions={
          <Button
            onClick={openCreate}
            data-testid="supplier-add-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New supplier
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
        testId="suppliers-table"
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-xl"
          data-testid="supplier-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Edit supplier' : 'New supplier'}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit((v) =>
              editing
                ? updateMut.mutate({ id: editing.id, v })
                : createMut.mutate(v)
            )}
            className="grid grid-cols-2 gap-4"
          >
            <div className="col-span-2">
              <Label>Name *</Label>
              <Input
                {...form.register('name')}
                data-testid="supplier-form-name"
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label>Contact person</Label>
              <Input {...form.register('contact')} />
            </div>

            <div>
              <Label>Phone</Label>
              <Input
                {...form.register('phone')}
                data-testid="supplier-form-phone"
              />
            </div>

            <div className="col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                {...form.register('email')}
                data-testid="supplier-form-email"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label>GST Number / GSTIN</Label>
              <Input
                {...form.register('gstNumber')}
                placeholder="Enter GSTIN"
                data-testid="supplier-form-gst-number"
              />
              {form.formState.errors.gstNumber && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.gstNumber.message}
                </p>
              )}
            </div>

            <div />

            <div className="col-span-2">
              <Label>Address</Label>
              <Textarea
                rows={2}
                {...form.register('address')}
              />
            </div>

            <DialogFooter className="col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                data-testid="supplier-form-submit"
              >
                {editing ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(v) => !v && setConfirmId(null)}
        title="Delete supplier?"
        description="Products will remain but lose the supplier link."
        onConfirm={() => deleteMut.mutate(confirmId)}
        confirmLabel="Delete"
        destructive
        testId="supplier-delete-confirm"
      />
    </div>
  );
}