export interface User {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  phone?: string;
  accessLevel: number;
  levelName: string;
  department: string;
  designation: string;
  avatarUrl?: string;
  lastLogin?: string;
  venture: {
    id: number;
    name: string;
    slug: string;
    primaryColor: string;
  } | null;
}

export const VENTURES = [
  { name: 'Fenixa Solutions', slug: 'fenixa', color: '#06b6d4', emoji: '💻' },
  { name: 'Fenixa Cloud & DevOps', slug: 'fenixa-cloud', color: '#6366f1', emoji: '⚡' },
  { name: 'Fenixa QA & Architecture', slug: 'fenixa-qa', color: '#10b981', emoji: '🛡️' },
  { name: 'Fenixa AI Labs', slug: 'fenixa-ai', color: '#8b5cf6', emoji: '🤖' },
];
