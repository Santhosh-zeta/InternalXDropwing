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
  { name: 'Dropwing Design Studio', slug: 'dropwing', color: '#8b5cf6', emoji: '🎨' },
  { name: 'Fenixa Solutions', slug: 'fenixa', color: '#06b6d4', emoji: '💻' },
  { name: 'PerSyniX', slug: 'persynix', color: '#f59e0b', emoji: '🔄' },
  { name: 'Grovia', slug: 'grovia', color: '#10b981', emoji: '🌱' },
];
