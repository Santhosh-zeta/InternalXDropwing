import { useState, useEffect, useRef } from 'react';
import { User, VENTURES } from '@/lib/constants';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface DocumentsViewProps {
  currentUser: User;
}

interface Document {
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
  const [documents, setDocuments] = useState<Document[]>([]);
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

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: Check file size (e.g., max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size exceeds 50MB limit');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (currentUser.ventureId) {
      formData.append('ventureId', currentUser.ventureId.toString());
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('internalx_token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '📊';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📘';
    if (mimeType.includes('zip') || mimeType.includes('tar')) return '📦';
    if (mimeType.includes('video/')) return '🎬';
    return '📄';
  };

  const getFileColor = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '#10b981'; // Green
    if (mimeType.includes('pdf')) return '#ef4444'; // Red
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) return '#10b981'; // Green
    if (mimeType.includes('word') || mimeType.includes('document')) return '#3b82f6'; // Blue
    if (mimeType.includes('zip') || mimeType.includes('tar')) return '#f59e0b'; // Yellow
    if (mimeType.includes('video/')) return '#8b5cf6'; // Purple
    return '#6b7280'; // Gray
  };

  const handleDownload = (doc: Document) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/uploads/${doc.path}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)' }}>Document Vault</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Secure file storage for projects, assets, and enterprise knowledge.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="glass" style={{ display: 'flex', padding: 4, borderRadius: 12 }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: viewMode === 'grid' ? 'var(--color-bg-tertiary)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none',
                background: viewMode === 'list' ? 'var(--color-bg-tertiary)' : 'transparent',
                color: viewMode === 'list' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer', transition: 'all 0.2s'
              }}
            >
              List
            </button>
          </div>
          
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '10px 20px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)', color: '#fff',
              fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 8, opacity: uploading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)',
              transition: 'all 0.2s'
            }}
          >
            {uploading ? '⏳ Uploading...' : '☁️ Upload File'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-muted)' }}>
          <div className="animate-spin-slow" style={{ fontSize: 40, marginBottom: 16 }}>✦</div>
          <p>Loading vault...</p>
        </div>
      ) : documents.length === 0 ? (
        <div className="glass" style={{ textAlign: 'center', padding: '80px', borderRadius: 20, border: '1px dashed var(--color-border)' }}>
          <div style={{ fontSize: 64, marginBottom: 16, opacity: 0.5 }}>📂</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Vault is Empty</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
            No documents have been uploaded yet. Start by uploading files relevant to your venture or projects.
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '10px 24px', borderRadius: 12, border: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
              fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            Upload First File
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20 }}>
          {documents.map(doc => {
            const fileColor = getFileColor(doc.mime_type);
            return (
              <div
                key={doc.id}
                className="glass"
                style={{
                  borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)',
                  display: 'flex', flexDirection: 'column', position: 'relative',
                  transition: 'all 0.2s', cursor: 'pointer'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = fileColor; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              >
                {/* Delete Button overlay */}
                {(currentUser.accessLevel <= 3 || currentUser.id === doc.uploaded_by) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(doc.id); }}
                    style={{
                      position: 'absolute', top: 8, right: 8, width: 28, height: 28,
                      borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.5)',
                      color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', zIndex: 10, opacity: 0.6,
                      transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
                  >
                    ✖
                  </button>
                )}

                <div 
                  onClick={() => handleDownload(doc)}
                  style={{
                    height: 140, background: `${fileColor}15`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 64,
                    borderBottom: '1px solid var(--color-border)', position: 'relative'
                  }}
                >
                  {getFileIcon(doc.mime_type)}
                  
                  {/* Extension badge */}
                  <div style={{
                    position: 'absolute', bottom: 12, left: 12, padding: '4px 8px',
                    background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    borderRadius: 6, fontSize: 10, fontWeight: 700, color: '#fff',
                    textTransform: 'uppercase', letterSpacing: 1
                  }}>
                    {doc.original_name.split('.').pop()}
                  </div>
                </div>
                
                <div style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column' }} onClick={() => handleDownload(doc)}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={doc.original_name}>
                    {doc.original_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    {formatSize(doc.size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                  
                  <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                        👤
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.uploaded_by_name}
                      </span>
                    </div>
                    {doc.venture_name && (
                      <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--color-bg-tertiary)', borderRadius: 4, color: 'var(--color-text-muted)' }}>
                        {doc.venture_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass" style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Name</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Size</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Uploaded By</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Venture</th>
                <th style={{ padding: '16px', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="hover-bg-tertiary">
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => handleDownload(doc)}>
                      <div style={{ fontSize: 24 }}>{getFileIcon(doc.mime_type)}</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{doc.original_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{doc.mime_type}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>{formatSize(doc.size)}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      👤 {doc.uploaded_by_name}
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '16px' }}>
                    {doc.venture_name ? (
                      <span style={{ fontSize: 11, padding: '4px 8px', background: 'var(--color-bg-tertiary)', borderRadius: 6, color: 'var(--color-text-muted)' }}>
                        {doc.venture_name}
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Global</span>
                    )}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        onClick={() => handleDownload(doc)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-primary)', cursor: 'pointer', fontSize: 12 }}
                      >
                        Download
                      </button>
                      {(currentUser.accessLevel <= 3 || currentUser.id === doc.uploaded_by) && (
                        <button
                          onClick={() => handleDelete(doc.id)}
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
