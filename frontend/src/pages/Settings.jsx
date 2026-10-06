import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, IndianRupee, Building2, Info } from 'lucide-react';

import { settingsApi } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const DEFAULTS = {
  company_name: 'My Company Pvt. Ltd.',
  company_address: '',
  currency: 'INR',
  low_stock_threshold_note: 'Configured per product',
};

export default function Settings() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.list });
  const [values, setValues] = useState(DEFAULTS);

  useEffect(() => {
    const map = { ...DEFAULTS };
    items.forEach((i) => { map[i.key] = i.value; });
    setValues(map);
  }, [items]);

  const saveMut = useMutation({
    mutationFn: async (v) => {
      await Promise.all(Object.entries(v).map(([k, val]) => settingsApi.update(k, val)));
    },
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e) => toast.error(e.friendly || 'Save failed'),
  });

  return (
    <div data-testid="page-settings">
      <PageHeader
        overline="Preferences"
        title="Settings"
        description="Configure company details and application preferences. All values are persisted locally in your SQLite database."
      />
      <div className="max-w-3xl grid grid-cols-1 gap-6">
        <div className="card-flat p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-zinc-700" />
            <h2 className="text-lg font-semibold tracking-tight">Company profile</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Company name</Label>
              <Input value={values.company_name || ''} onChange={(e) => setValues({ ...values, company_name: e.target.value })} data-testid="settings-company-name" />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea rows={3} value={values.company_address || ''} onChange={(e) => setValues({ ...values, company_address: e.target.value })} data-testid="settings-company-address" />
            </div>
          </div>
        </div>

        <div className="card-flat p-6">
          <div className="flex items-center gap-2 mb-4">
            <IndianRupee className="w-4 h-4 text-zinc-700" />
            <h2 className="text-lg font-semibold tracking-tight">Locale</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Currency</Label>
              <Input value={values.currency || 'INR'} disabled />
              <p className="text-xs text-muted-foreground mt-1">Fixed to Indian Rupees (₹) in this build.</p>
            </div>
          </div>
        </div>

        <div className="card-flat p-6 bg-blue-50/40 border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-700 mt-0.5" />
            <div className="text-sm text-blue-900 leading-relaxed">
              <div className="font-medium mb-1">Offline-first architecture</div>
              This application stores everything in a local SQLite database (<span className="font-mono">crm.db</span>). Use the Backup & Restore module to safeguard your data or migrate to another machine.
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => saveMut.mutate(values)} disabled={saveMut.isPending} data-testid="settings-save">
            <Save className="w-4 h-4 mr-2" />{saveMut.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
