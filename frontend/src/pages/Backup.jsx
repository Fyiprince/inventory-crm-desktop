import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DatabaseBackup, Download, Upload, Trash2, HardDrive, ShieldCheck } from 'lucide-react';

import { backupApi, API } from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

function humanSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function Backup() {
  const qc = useQueryClient();
  const inputRef = useRef(null);
  const [confirm, setConfirm] = useState(null);

  const { data: backups = [] } = useQuery({ queryKey: ['backups'], queryFn: backupApi.list });
  const createMut = useMutation({ mutationFn: backupApi.create, onSuccess: () => { toast.success('Backup created'); qc.invalidateQueries({ queryKey: ['backups'] }); }, onError: (e) => toast.error(e.friendly || 'Failed') });
  const restoreMut = useMutation({ mutationFn: backupApi.restore, onSuccess: () => { toast.success('Database restored — reloading…'); setTimeout(() => window.location.reload(), 1200); }, onError: (e) => toast.error(e.friendly || 'Restore failed') });
  const deleteMut = useMutation({ mutationFn: backupApi.remove, onSuccess: () => { toast.success('Backup removed'); qc.invalidateQueries({ queryKey: ['backups'] }); setConfirm(null); }, onError: (e) => toast.error(e.friendly || 'Failed') });

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.db')) { toast.error('Please select a .db file'); return; }
    restoreMut.mutate(file);
    e.target.value = '';
  };

  return (
    <div data-testid="page-backup">
      <PageHeader
        overline="Data"
        title="Backup & Restore"
        description="Snapshot your entire database with one click. Restore from a .db backup to migrate machines or roll back mistakes."
        actions={
          <div className="flex gap-2">
            <a href={backupApi.downloadUrl()} className="inline-flex" data-testid="backup-download-current">
              <Button variant="outline"><Download className="w-4 h-4 mr-2" />Download current DB</Button>
            </a>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending} data-testid="backup-create">
              <DatabaseBackup className="w-4 h-4 mr-2" />{createMut.isPending ? 'Creating…' : 'Create backup'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card-flat p-6 col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="text-lg font-semibold tracking-tight">Restore from file</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Uploading a database file will <span className="text-red-600 font-semibold">replace all current data</span>. Consider creating a backup first.
          </p>
          <input ref={inputRef} type="file" accept=".db" hidden onChange={handleFile} data-testid="backup-restore-input" />
          <Button variant="outline" onClick={() => inputRef.current?.click()} disabled={restoreMut.isPending} data-testid="backup-restore-btn">
            <Upload className="w-4 h-4 mr-2" />{restoreMut.isPending ? 'Restoring…' : 'Choose .db file to restore'}
          </Button>
        </div>
        <div className="card-flat p-6">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-zinc-700" />
            <h2 className="text-lg font-semibold tracking-tight">Storage</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Database</span><span className="font-mono">crm.db</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Backups</span><span className="font-mono">{backups.length}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-mono text-xs">/app/backups</span></div>
          </div>
        </div>
      </div>

      <div className="card-flat overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold tracking-tight">Backup history</h2>
        </div>
        <table className="w-full text-sm" data-testid="backup-history-table">
          <thead>
            <tr>
              <th className="data-head">Filename</th>
              <th className="data-head">Size</th>
              <th className="data-head">Created</th>
              <th className="data-head text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.length === 0 && (
              <tr><td colSpan={4} className="text-center py-10 text-sm text-muted-foreground">No backups yet. Click <span className="font-medium">Create backup</span> above.</td></tr>
            )}
            {backups.map((b) => (
              <tr key={b.filename} className="border-t border-border/70">
                <td className="data-cell font-mono text-xs">{b.filename}</td>
                <td className="data-cell font-mono text-xs">{humanSize(b.size)}</td>
                <td className="data-cell">{formatDateTime(b.createdAt)}</td>
                <td className="data-cell text-right">
                  <a href={`${API}/backup/download`} className="inline-block mr-1"><Button size="sm" variant="ghost"><Download className="w-3.5 h-3.5" /></Button></a>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setConfirm(b.filename)} data-testid={`backup-delete-${b.filename}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)} title="Delete backup?" description="This backup file will be permanently removed." onConfirm={() => deleteMut.mutate(confirm)} confirmLabel="Delete" destructive testId="backup-delete-confirm" />
    </div>
  );
}
