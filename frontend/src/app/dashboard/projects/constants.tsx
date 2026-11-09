import { AlertCircle, CheckCircle2, Circle, Clock } from 'lucide-react';
import type { Project } from '@/lib/types';

export const STATUSES = [
  { id: 'planning', label: 'Planning', color: '#8b5cf6', icon: <Circle size={14} aria-hidden="true" /> },
  { id: 'active', label: 'Active', color: '#06b6d4', icon: <Clock size={14} aria-hidden="true" /> },
  { id: 'on-hold', label: 'On hold', color: '#f59e0b', icon: <AlertCircle size={14} aria-hidden="true" /> },
  { id: 'completed', label: 'Completed', color: '#10b981', icon: <CheckCircle2 size={14} aria-hidden="true" /> },
] as const;

export const PRIORITIES = [
  { id: 'low', label: 'Low', color: '#10b981' },
  { id: 'medium', label: 'Medium', color: '#8b5cf6' },
  { id: 'high', label: 'High', color: '#f59e0b' },
  { id: 'urgent', label: 'Urgent', color: '#f43f5e' },
] as const;

export const MEMBER_ROLES = ['Lead', 'Contributor', 'Reviewer', 'Stakeholder'] as const;

/** `tags` arrives as a JSON string from some rows and as an array from others. */
export function parseTags(tags: Project['tags']): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed: unknown = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
