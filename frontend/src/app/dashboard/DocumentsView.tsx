import { useState, useEffect, useRef } from 'react';
import { User } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import {
  Upload, LayoutGrid, List, FolderOpen, FileText,
  FileImage, FileSpreadsheet, Package, Video, File,
  Download, Trash2, Loader2, User as UserIcon, X
} from 'lucide-react';

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

export default function DocumentsView({ currentUser }: DocumentsViewProps) {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (currentUser.venture?.id) {
      formData.append('ventureId', currentUser.venture.id.toString());
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('internalx_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://internalx.dropwinggroups.com'}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const res = await response.json();
      if (res.success) {
        toast.success('Document uploaded successfully');
        fetchDocuments();
      } else {
        toast.error(res.message || 'Upload failed');
      }
    } catch (err) {
      toast.error('Error uploading document');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
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

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] p-6 rounded-2xl flex justify-between items-center flex-wrap gap-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Document Vault</h2>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            Secure file storage for projects, assets, and enterprise knowledge.
          </p>
        </div>

        <div className="flex gap-3 items-center">
          {/* View toggle */}
          <div className="flex p-1 gap-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
              title="Grid View"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-[var(--color-bg-card)] text-[var(--color-text-primary)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-purple-glow)] hover:bg-[#7c3aed] text-white font-bold text-[13px] flex items-center gap-2 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading
              ? <><Loader2 size={15} className="animate-spin" /> Uploading...</>
              : <><Upload size={15} strokeWidth={2.5} /> Upload File</>
            }
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-muted)]">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--color-purple-glow)] mb-4" />
          <p className="font-medium text-sm">Loading vault...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-dashed border-[var(--color-border)] rounded-2xl p-20 text-center">
          <FolderOpen size={64} className="mx-auto mb-4 text-[var(--color-text-muted)] opacity-40" />
          <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Vault is Empty</h3>
          <p className="text-[var(--color-text-secondary)] text-sm mb-8 max-w-sm mx-auto font-medium leading-relaxed">
            No documents have been uploaded yet. Start by uploading files relevant to your venture or projects.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card)] text-[var(--color-text-primary)] font-bold text-[13px] transition-colors flex items-center gap-2 mx-auto"
          >
            <Upload size={15} /> Upload First File
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {documents.map(doc => {
            const fileColor = getFileColor(doc.mime_type);
            const canDelete = currentUser.accessLevel <= 3 || currentUser.id === doc.uploaded_by;

            return (
              <div
                key={doc.id}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col relative group hover:border-[var(--color-text-muted)] hover:-translate-y-1 transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* Delete overlay */}
                {canDelete && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 hover:bg-rose-500/80 transition-all"
                  >
                    <X size={13} />
                  </button>
                )}

                <div
                  onClick={() => handleDownload(doc)}
                  className="h-[130px] flex items-center justify-center border-b border-[var(--color-border)] relative"
                  style={{ background: `${fileColor}12`, color: fileColor }}
                >
                  {getFileIcon(doc.mime_type, 48)}
                  <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[9px] font-bold text-white uppercase tracking-widest">
                    {doc.original_name.split('.').pop()}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col" onClick={() => handleDownload(doc)}>
                  <div className="font-bold text-[13px] text-[var(--color-text-primary)] mb-1 truncate" title={doc.original_name}>
                    {doc.original_name}
                  </div>
                  <div className="text-[11px] font-medium text-[var(--color-text-muted)] mb-3">
                    {formatSize(doc.size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <UserIcon size={11} className="text-[var(--color-text-muted)] shrink-0" />
                      <span className="text-[11px] font-medium text-[var(--color-text-secondary)] truncate">{doc.uploaded_by_name}</span>
                    </div>
                    {doc.venture_name && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-muted)] shrink-0 uppercase tracking-wider">
                        {doc.venture_name.substring(0, 4)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)]">
                  {['Name', 'Size', 'Uploaded By', 'Date', 'Venture', 'Actions'].map(h => (
                    <th key={h} className={`p-4 px-5 text-[11px] font-bold text-[var(--color-text-secondary)] uppercase tracking-wider ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
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
                        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => handleDownload(doc)}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: `${fileColor}15`, color: fileColor, borderColor: `${fileColor}30` }}>
                            {getFileIcon(doc.mime_type, 17)}
                          </div>
                          <div>
                            <div className="font-bold text-[13px] text-[var(--color-text-primary)] group-hover:text-[var(--color-purple-glow)] transition-colors">{doc.original_name}</div>
                            <div className="text-[11px] font-medium text-[var(--color-text-muted)] mt-0.5">{doc.mime_type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 px-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">{formatSize(doc.size)}</td>
                      <td className="p-4 px-5">
                        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text-secondary)]">
                          <UserIcon size={13} className="text-[var(--color-text-muted)]" /> {doc.uploaded_by_name}
                        </div>
                      </td>
                      <td className="p-4 px-5 text-[13px] font-medium text-[var(--color-text-secondary)]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-4 px-5">
                        {doc.venture_name ? (
                          <span className="text-[11px] font-bold px-2.5 py-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-muted)]">
                            {doc.venture_name}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Global</span>
                        )}
                      </td>
                      <td className="p-4 px-5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-card)] text-[var(--color-text-primary)] text-[12px] font-bold transition-colors flex items-center gap-1.5"
                          >
                            <Download size={13} /> Download
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(doc.id)}
                              className="px-3 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[12px] font-bold transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
