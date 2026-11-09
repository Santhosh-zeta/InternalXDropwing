import { type ReactNode } from 'react';
import { Briefcase, FileCheck, Receipt, FileText, CheckCircle2, CircleDashed, Clock, File, FileImage, FileSpreadsheet } from 'lucide-react';
import { type BadgeTone } from '@/components/ui';

export interface Venture { id: number; name: string; slug: string; primary_color: string; description: string; logo_url: string; }
export interface Project { id: number; title: string; description: string; status: string; progress: number; start_date: string; end_date: string; budget: number; manager_name: string; }
export interface Deliverable { id: number; title: string; description: string; status: string; priority: string; due_date: string; created_at: string; assigned_by_name: string; }
export interface Invoice { invoice_number: string; month: string; total_hours: number; total_amount: number; status: string; issue_date: string; }
export interface Document { id: number; file_name: string; file_size: number; file_type: string; created_at: string; uploaded_by: string; category: string; }
export interface PortalData { venture: Venture | null; projects: Project[]; deliverables: Deliverable[]; invoices: Invoice[]; documents: Document[]; }

/**
 * Status/priority previously mapped to raw hex literals, which stayed dark-mode
 * coloured under the light theme. They now map to Badge tones, which resolve to
 * the themed tokens.
 */
export const PRIORITY_TONE: Record<string, BadgeTone> = {
  urgent: 'danger', high: 'warning', medium: 'info', low: 'success',
};
export const STATUS_TONE: Record<string, BadgeTone> = {
  completed: 'success', 'in-progress': 'info', pending: 'warning',
  active: 'success', planning: 'brand', 'on-hold': 'neutral',
};

export const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const shortDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';

export const longDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const isOverdue = (due?: string, status?: string) =>
  Boolean(due) && new Date(due as string) < new Date() && status !== 'completed';

export const statusIcon = (status: string): ReactNode => {
  if (status === 'completed') return <CheckCircle2 size={11} aria-hidden="true" />;
  if (status === 'in-progress') return <CircleDashed size={11} aria-hidden="true" />;
  return <Clock size={11} aria-hidden="true" />;
};

export const docIcon = (fileType?: string): ReactNode => {
  if (fileType?.includes('pdf')) return <FileText size={20} aria-hidden="true" />;
  if (fileType?.includes('image')) return <FileImage size={20} aria-hidden="true" />;
  if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) return <FileSpreadsheet size={20} aria-hidden="true" />;
  return <File size={20} aria-hidden="true" />;
};

export const TABS = [
  { id: 'overview', label: 'Projects', icon: <Briefcase size={15} aria-hidden="true" /> },
  { id: 'deliverables', label: 'Deliverables', icon: <FileCheck size={15} aria-hidden="true" /> },
  { id: 'invoices', label: 'Invoices', icon: <Receipt size={15} aria-hidden="true" /> },
  { id: 'documents', label: 'Documents', icon: <FileText size={15} aria-hidden="true" /> },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export const TH = 'px-5 py-4 text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-secondary)] whitespace-nowrap';
export const MICRO_LABEL = 'text-label font-bold uppercase tracking-[0.08em] text-[var(--color-text-muted)]';
