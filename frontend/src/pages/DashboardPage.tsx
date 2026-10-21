import { useAppSelector } from '@/app/hooks';
import { Card } from '@/components/ui/Card';
import type { Role } from '@/types/api';

const HINTS: Record<Role, string> = {
  STUDENT: 'Search for tutors, shortlist favourites and send requests.',
  PARENT: 'Find tutors for your children and track requests.',
  TUTOR: 'Complete your profile and verification to start receiving requests.',
  ADMIN: 'Review tutor verifications and moderate reviews.',
};

export function DashboardPage() {
  const user = useAppSelector((s) => s.auth.user);
  if (!user) return null;
  return (
    <Card>
      <h1 className="text-xl font-semibold">Hello, {user.fullName}</h1>
      <p className="mt-1 text-sm text-slate-500">Signed in as {user.role.toLowerCase()}.</p>
      <p className="mt-4 text-slate-700">{HINTS[user.role]}</p>
    </Card>
  );
}
