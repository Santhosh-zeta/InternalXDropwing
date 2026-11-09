'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, File, FileImage, FileSpreadsheet, FileText, FolderOpen, Package, Share2, Trash2, Upload, Video, type LucideIcon } from 'lucide-react';
import api, { API_URL, apiGet, errMsg, getProjects, setDocumentClientVisible } from '@/lib/api';
import { unwrapList, useApi } from '@/lib/useApi';
import type { Envelope } from '@/lib/types';
import type { User } from '@/lib/constants';
import { AsyncState, Badge, Button, Card, EmptyState, Select, SkeletonTable, useConfirm } from '@/components/ui';

interface DocItem {
  id: number;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  venture_name: string | null;
  project_id: number | null;
  project_name: string | null;
  uploaded_by: number;
  uploaded_by_name: string;
  client_visible?: boolean;
  created_at: string;
}

const MAX_BYTES = 50 * 1024 * 1024;
const TH = 'p-4 px-5 text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)]';

function fileKind(mime: string): { icon: LucideIcon; color: string } {
  if (mime.startsWith('image/')) return { icon: FileImage, color: '#10b981' };
  if (mime.includes('pdf')) return { icon: FileText, color: '#ef4444' };
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return { icon: FileSpreadsheet, color: '#10b981' };
  if (mime.includes('word') || mime.includes('document')) return { icon: FileText, color: '#3b82f6' };
  if (mime.includes('zip') || mime.includes('tar')) return { icon: Package, color: '#f59e0b' };
  if (mime.startsWith('video/')) return { icon: Video, color: '#8b5cf6' };
  return { icon: File, color: '#6b7280' };
}

function formatSize(bytes: number): string {
  if (!bytes) return '0 B';
  const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${['B', 'KB', 'MB', 'GB'][i]}`;
}

/** Files for the projects and venture the caller can see. Clients get their documents in the portal instead. */
export default function DocumentsView({ currentUser }: { currentUser: User }) {
  const docs = useApi('documents', (s) => unwrapList(apiGet<Envelope<DocItem[]>>('/documents', s)), { toastOnError: 'auto' });
  const projects = useApi('documents-projects', (s) => unwrapList(getProjects(s)));
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');

  const canShare = currentUser.accessLevel <= 5;
  const canDelete = (d: DocItem) => currentUser.accessLevel <= 5 || currentUser.id === d.uploaded_by;

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reset = () => { if (fileRef.current) fileRef.current.value = ''; };
    if (file.size > MAX_BYTES) {
      toast.error('File size exceeds the 50 MB limit');
      setStatus('Upload cancelled: the file exceeds the 50 MB limit.');
      return reset();
    }
    const form = new FormData();
    form.append('file', file);
    // The server derives the venture from the project or from the caller; this only picks the project.
    if (projectId) form.append('projectId', projectId);
    setUploading(true);
    setStatus(`Uploading ${file.name}…`);
    try {
      const res = await api.post<{ success: boolean; message?: string }>('/documents/upload', form);
      if (!res.data.success) throw new Error(res.data.message);
      toast.success('Document uploaded');
      setStatus(`${file.name} uploaded.`);
      docs.refetch();
    } catch (err) {
      const message = errMsg(err, 'Upload failed');
      toast.error(message);
      setStatus(message);
    } finally {
      setUploading(false);
      reset();
    }
  };

  const remove = async (d: DocItem) => {
    const ok = await confirm({
      title: 'Delete this document?',
      description: `"${d.original_name}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      await api.delete(`/documents/${d.id}`);
      toast.success('Document deleted');
      docs.setData((prev) => prev?.filter((x) => x.id !== d.id));
    } catch (err) {
      toast.error(errMsg(err, 'Could not delete the document'));
    }
  };

  const toggleShare = async (d: DocItem) => {
    const next = !d.client_visible;
    docs.setData((prev) => prev?.map((x) => (x.id === d.id ? { ...x, client_visible: next } : x)));
    try {
      await setDocumentClientVisible(d.id, next);
      toast.success(next ? 'Shared with the project client' : 'No longer shared with the client');
    } catch (err) {
      toast.error(errMsg(err, 'Could not change sharing'));
      docs.refetch();
    }
  };

  // The session cookie authorises the download; the server re-checks scope.
  const open = (d: DocItem) => window.open(`${API_URL}/uploads/${encodeURIComponent(d.path)}`, '_blank', 'noopener');

  const rows = docs.data ?? [];
  const uploadButton = (label: string, variant: 'primary' | 'secondary' = 'primary') => (
    <Button variant={variant} loading={uploading} leadingIcon={<Upload size={15} strokeWidth={2.5} aria-hidden="true" />} onClick={() => fileRef.current?.click()}>
      {uploading ? 'Uploading…' : label}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6 pb-10">
      <Card className="flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Documents</h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">Files for your projects and venture. Attach a file to a project to share it with that project&apos;s team.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select aria-label="Attach upload to project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 w-auto min-w-44">
            <option value="">No project</option>
            {(projects.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <label htmlFor="documents-file-input" className="sr-only">Choose a document to upload</label>
          <input id="documents-file-input" type="file" ref={fileRef} className="hidden" onChange={upload} />
          {uploadButton('Upload file')}
        </div>
      </Card>

      <p aria-live="polite" className="sr-only">{status}</p>

      <AsyncState loading={docs.loading} error={docs.error} onRetry={docs.refetch} what="documents" skeleton={<SkeletonTable rows={6} columns={6} />}>
        {rows.length === 0 ? (
          <EmptyState
            icon={<FolderOpen size={22} aria-hidden="true" />}
            title="No documents yet"
            description="Upload contracts, briefs or deliverables. Pick a project first to attach the file to it."
            action={uploadButton('Upload the first file', 'secondary')}
          />
        ) : (
          <Card padding="none" className="overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">Documents</caption>
                <thead>
                  <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <th scope="col" className={TH}>Name</th>
                    <th scope="col" className={TH}>Size</th>
                    <th scope="col" className={TH}>Uploaded by</th>
                    <th scope="col" className={TH}>Date</th>
                    <th scope="col" className={TH}>Project</th>
                    <th scope="col" className={`${TH} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const { icon: Icon, color } = fileKind(d.mime_type);
                    return (
                      <tr key={d.id} className="border-b border-[var(--color-border)] transition-colors last:border-0 hover:bg-[var(--color-bg-secondary)]">
                        <td className="p-4 px-5">
                          <button type="button" className="group flex items-center gap-3 text-left" onClick={() => open(d)}>
                            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border" style={{ background: `${color}15`, color, borderColor: `${color}30` }}>
                              <Icon size={17} />
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[260px] truncate text-[13px] font-bold text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-purple-glow)]">{d.original_name}</span>
                              <span className="block text-[11px] text-[var(--color-text-muted)]">{d.venture_name ?? 'All ventures'}</span>
                            </span>
                          </button>
                        </td>
                        <td className="whitespace-nowrap p-4 px-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">{formatSize(d.size)}</td>
                        <td className="p-4 px-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">{d.uploaded_by_name}</td>
                        <td className="whitespace-nowrap p-4 px-5 text-[13px] text-[var(--color-text-secondary)]">{new Date(d.created_at).toLocaleDateString()}</td>
                        <td className="p-4 px-5">
                          {d.project_name ? (
                            <div className="flex flex-col items-start gap-1">
                              <span className="text-[13px] text-[var(--color-text-primary)]">{d.project_name}</span>
                              {d.client_visible && <Badge tone="info">Shared with client</Badge>}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--color-text-muted)]">None</span>
                          )}
                        </td>
                        <td className="p-4 px-5">
                          <div className="flex items-center justify-end gap-2">
                            {canShare && d.project_id && (
                              <Button size="sm" variant="secondary" aria-pressed={!!d.client_visible} leadingIcon={<Share2 size={13} aria-hidden="true" />} onClick={() => toggleShare(d)}>
                                {d.client_visible ? 'Unshare' : 'Share with client'}
                              </Button>
                            )}
                            <Button iconOnly size="sm" variant="secondary" aria-label={`Download ${d.original_name}`} onClick={() => open(d)}>
                              <Download size={14} aria-hidden="true" />
                            </Button>
                            {canDelete(d) && (
                              <Button iconOnly size="sm" variant="ghost" aria-label={`Delete ${d.original_name}`} onClick={() => remove(d)} className="text-[var(--color-rose)] hover:bg-[var(--color-rose)]/10 hover:text-[var(--color-rose)]">
                                <Trash2 size={14} aria-hidden="true" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AsyncState>
    </div>
  );
}
