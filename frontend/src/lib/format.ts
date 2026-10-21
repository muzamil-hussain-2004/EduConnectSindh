import type { Role, TeachingMode } from '@/types/api';

export const formatPkr = (n: number) => `PKR ${n.toLocaleString('en-PK')}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export const MODE_LABEL: Record<TeachingMode | 'HOME' | 'ONLINE', string> = {
  HOME: 'At home',
  ONLINE: 'Online',
  BOTH: 'Home & online',
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

export const isSeeker = (role?: Role) => role === 'STUDENT' || role === 'PARENT';
