import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

/**
 * Compact inline "+ New" button + dialog that creates an entity and returns its id.
 *
 * Props:
 *  - label: string  → button label ("New vendor", "New product", …)
 *  - title: string  → dialog title
 *  - schema: zod schema for the form
 *  - defaults: default form values
 *  - fields: [{ name, label, type?, placeholder?, textarea?, required?, help? }]
 *  - createFn: async (values) => createdEntity (must return object with `id`)
 *  - invalidateKeys: string[] → react-query keys to invalidate on success
 *  - onCreated(id, entity): callback fired after creation
 *  - testId
 */
export function QuickCreate({
  label,
  title,
  schema,
  defaults,
  fields,
  createFn,
  invalidateKeys = [],
  onCreated,
  testId = 'quick-create',
}) {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: defaults });

  React.useEffect(() => { if (open) form.reset(defaults); }, [open]); // eslint-disable-line

  const mut = useMutation({
    mutationFn: createFn,
    onSuccess: (entity) => {
      toast.success(`${title} created`);
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: Array.isArray(k) ? k : [k] }));
      setOpen(false);
      onCreated?.(entity.id, entity);
    },
    onError: (e) => toast.error(e.friendly || 'Failed to create'),
  });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`${testId}-open`}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors duration-150"
      >
        <Plus className="w-3 h-3" />{label}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" data-testid={`${testId}-dialog`}>
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit((v) => mut.mutate(v))} className="grid grid-cols-2 gap-4">
            {fields.map((f) => {
              const isFull = f.full !== false && !f.half;
              return (
                <div key={f.name} className={isFull ? 'col-span-2' : ''}>
                  <Label>{f.label}{f.required && ' *'}</Label>
                  {f.textarea ? (
                    <Textarea rows={f.rows || 2} placeholder={f.placeholder} {...form.register(f.name)} data-testid={`${testId}-${f.name}`} />
                  ) : (
                    <Input type={f.type || 'text'} placeholder={f.placeholder} step={f.step} min={f.min} {...form.register(f.name)} data-testid={`${testId}-${f.name}`} />
                  )}
                  {form.formState.errors[f.name] && (
                    <p className="text-xs text-red-600 mt-1">{form.formState.errors[f.name].message}</p>
                  )}
                  {f.help && <p className="text-xs text-muted-foreground mt-1">{f.help}</p>}
                </div>
              );
            })}
            <DialogFooter className="col-span-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={mut.isPending} data-testid={`${testId}-submit`}>
                {mut.isPending ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
