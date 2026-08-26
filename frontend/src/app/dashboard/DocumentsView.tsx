'use client';

import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  Upload, LayoutGrid, List, FolderOpen, FileText,
  FileImage, FileSpreadsheet, Package, Video, File,
  Download, Trash2, User as UserIcon, X
} from 'lucide-react';
import {
  Badge, Button, Card, EmptyState, SkeletonCard, SkeletonTable, useConfirm,
} from '@/components/ui';

interface DocumentsViewProps {
  currentUser: User;
}

interface DocItem {
  id: number;
  file_name: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  venture_id: number | null;
  project_id: number | null;
  uploaded_by: number;
  uploaded_by_name: string;
  venture_name: string | null;
  project_name: string | null;
  created_at: string;
}

const FILE_INPUT_ID = 'documents-vault-file-input';

export default function DocumentsView({ currentUser }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const confirm = useConfirm();

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/documents');
      if (response.data.success) {
        setDocuments(response.data.data);
      }
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit');
      setUploadStatus('Upload cancelled: file size exceeds the 50MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (currentUser.venture?.id) {
      formData.append('ventureId', currentUser.venture.id.toString());
    }

    try {
      setUploading(true);
      setUploadStatus(`Uploading ${file.name}…`);
      const token = localStorage.getItem('internalx_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const res = await response.json();
      if (res.success) {
        toast.success('Document uploaded successfully');
        setUploadStatus(`${file.name} uploaded successfully.`);
        fetchDocuments();
      } else {
        toast.error(res.message || 'Upload failed');
        setUploadStatus(res.message || `Upload of ${file.name} failed.`);
      }
    } catch (err) {
      toast.error('Error uploading document');
      setUploadStatus(`Error uploading ${file.name}.`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Delete this document?',
      description: 'The file will be permanently removed from the vault. This action cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      const response = await api.delete(`/documents/${id}`);
      if (response.data.success) {
        toast.success('Document deleted');
        setDocuments(documents.filter(d => d.id !== id));
      } else {
        toast.error(response.data.message || 'Failed to delete');
      }
    } catch (err) {
      toast.error('Error deleting document');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string, size: number = 20) => {
    if (mimeType.startsWith('image/')) return <FileImage size={size} />;
    if (mimeType.includes('pdf')) return <FileText size={size} />;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return <FileSpreadsheet size={size} />;
    if (mimeType.includes('word') || mimeType.includes('document')) return <FileText size={size} />;
    if (mimeType.includes('zip') || mimeType.includes('tar')) return <Package size={size} />;
    if (mimeType.startsWith('video/')) return <Video size={size} />;
    return <File size={size} />;
  };

  const getFileColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '#10b981';
    if (mimeType.includes('pdf')) return '#ef4444';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '#10b981';
    if (mimeType.includes('word') || mimeType.includes('document')) return '#3b82f6';
    if (mimeType.includes('zip') || mimeType.includes('tar')) return '#f59e0b';
    if (mimeType.startsWith('video/')) return '#8b5cf6';
    return '#6b7280';
  };

  const handleDownload = (doc: DocItem) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}/uploads/${doc.path}`;
    window.open(url, '_blank');
  };

  const tableHeaders: { label: string; align: 'left' | 'right' }[] = [
    { label: 'Name', align: 'left' },
    { label: 'Size', align: 'left' },
    { label: 'Uploaded By', align: 'left' },
    { label: 'Date', align: 'left' },
    { label: 'Venture', align: 'left' },
    { label: 'Actions', align: 'right' },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <Card className="flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Document Vault</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            Secure file storage for projects, assets, and enterprise knowledge.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* View toggle */}
          <div
            role="group"
            aria-label="Document layout"
            className="flex p-1 gap-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-[var(--radius-control)]"
          >
            <Button
              iconOnly
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              variant="ghost"
              size="sm"
              leadingIcon={<LayoutGrid size={16} aria-hidden="true" />}
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : ''}
            />
            <Button
              iconOnly
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              variant="ghost"
              size="sm"
              leadingIcon={<List size={16} aria-hidden="true" />}
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : ''}
            />
          </div>

          <label htmlFor={FILE_INPUT_ID} className="sr-only">Choose a document to upload</label>
          <input
            id={FILE_INPUT_ID}
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            variant="primary"
            size="sm"
            loading={uploading}
            leadingIcon={<Upload size={15} strokeWidth={2.5} aria-hidden="true" />}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      </Card>

      {/* Upload progress / errors, announced to assistive tech */}
      <p aria-live="polite" className="sr-only">{uploadStatus}</p>

      {/* Content */}
      {loading ? (
        viewMode === 'grid' ? (
          <div
            role="status"
            aria-busy="true"
            aria-live="polite"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            <span className="sr-only">Loading vault…</span>
            {Array.from({ length: 10 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (
          <SkeletonTable rows={6} columns={6} />
        )
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen size={22} aria-hidden="true" />}
          title="Vault is empty"
          description="No documents have been uploaded yet. Start by uploading files relevant to your venture or projects."
          action={
            <Button
              variant="secondary"
              leadingIcon={<Upload size={15} aria-hidden="true" />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload first file
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {documents.map(doc => {
            const fileColor = getFileColor(doc.mime_type);
            const canDelete = currentUser.accessLevel <= 3 || currentUser.id === doc.uploaded_by;

            return (
              <Card
                key={doc.id}
                padding="none"
                interactive
                className="overflow-hidden flex flex-col relative group hover:-translate-y-1 transition-all duration-200 shadow-sm"
              >
                {/* Delete overlay */}
                {canDelete && (
                  <Button
                    iconOnly
                    aria-label={`Delete ${doc.original_name}`}
                    variant="ghost"
                    size="sm"
                    leadingIcon={<X size={13} aria-hidden="true" />}
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-500/80 hover:text-white transition-all"
                  />
                )}

                <button
                  type="button"
                  onClick={() => handleDownload(doc)}
                  className="flex flex-1 flex-col text-left"
                >
                  <span className="sr-only">Download {doc.original_name}</span>
                  <span
                    aria-hidden="true"
                    className="h-[130px] w-full flex items-center justify-center border-b border-[var(--color-border)] relative"
                    style={{ background: `${fileColor}12`, color: fileColor }}
                  >
                    {getFileIcon(doc.mime_type, 48)}
                    <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] font-bold text-white uppercase tracking-widest">
                      {doc.original_name.split('.').pop()}
                    </span>
                  </span>

                  <span className="p-3 flex-1 flex flex-col w-full">
                    <span className="block font-bold text-[13px] text-[var(--color-text-primary)] mb-1 truncate" title={doc.original_name}>
                      {doc.original_name}
                    </span>
                    <span className="block text-[11px] font-medium text-[var(--color-text-muted)] mb-3">
                      {formatSize(doc.size)} • {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                    <span className="mt-auto flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <UserIcon size={11} className="text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-medium text-[var(--color-text-secondary)] truncate">{doc.uploaded_by_name}</span>
                      </span>
                      {doc.venture_name && (
                        <Badge tone="neutral" className="shrink-0 text-[9px] px-1.5 py-0.5">
                          {doc.venture_name.substring(0, 4)}
                        </Badge>
                      )}
                    </span>
                  </span>
                </button>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card padding="none" className="overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Documents in the vault</caption>
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  {tableHeaders.map(h => (
                    <th
                      key={h.label}
                      scope="col"
                      className={`p-4 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => {
                  const fileColor = getFileColor(doc.mime_type);
                  const canDelete = currentUser.accessLevel <= 3 || currentUser.id === doc.uploaded_by;
                  return (
                    <tr key={doc.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors">
                      <td className="p-4 px-5">
                        <button
                          type="button"
                          className="flex items-center gap-3 text-left group"
                          onClick={() => handleDownload(doc)}
                        >
                          <span
                            aria-hidden="true"
                            className="w-9 h-9 rounded-[var(--radius-control)] flex items-center justify-center shrink-0 border"
                            style={{ background: `${fileColor}15`, color: fileColor, borderColor: `${fileColor}30` }}
                          >
                            {getFileIcon(doc.mime_type, 17)}
                          </span>
                          <span className="block">
                            <span className="block font-bold text-[13px] text-[var(--color-text-primary)] group-hover:text-[var(--color-purple-glow)] transition-colors">{doc.original_name}</span>
                            <span className="block text-[11px] font-medium text-[var(--color-text-muted)] mt-0.5">{doc.mime_type}</span>
                          </span>
                        </button>
                      </td>
                      <td className="p-4 px-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">{formatSize(doc.size)}</td>
                      <td className="p-4 px-5">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-secondary)]">
                          <UserIcon size={13} className="text-[var(--color-text-muted)]" aria-hidden="true" /> {doc.uploaded_by_name}
                        </div>
                      </td>
                      <td className="p-4 px-5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 px-5">
                        {doc.venture_name ? (
                          <Badge tone="neutral">{doc.venture_name}</Badge>
                        ) : (
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Global</span>
                        )}
                      </td>
                      <td className="p-4 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            leadingIcon={<Download size={13} aria-hidden="true" />}
                            onClick={() => handleDownload(doc)}
                          >
                            Download
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              leadingIcon={<Trash2 size={13} aria-hidden="true" />}
                              onClick={() => handleDelete(doc.id)}
                              className="border border-[var(--color-rose)]/20 bg-[var(--color-rose)]/10 text-[var(--color-rose)] hover:bg-[var(--color-rose)]/20 hover:text-[var(--color-rose)]"
                            >
                              Delete
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
    </div>
  );
}
