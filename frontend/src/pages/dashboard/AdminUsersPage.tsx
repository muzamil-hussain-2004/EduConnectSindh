import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { Input, Select } from '@/components/ui/Input';
import { useGetAdminUsersQuery, useSetUserStatusMutation } from '@/features/admin/adminApi';
import { useAppSelector } from '@/app/hooks';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/services/api/baseApi';
import type { Role } from '@/types/api';
import { PageHeader } from './PageHeader';

export function AdminUsersPage() {
  const me = useAppSelector((s) => s.auth.user);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED' | ''>('');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useGetAdminUsersQuery({
    page,
    role: role || undefined,
    status: status || undefined,
    search: search.trim() || undefined,
  });
  const [setUserStatus, { isLoading: busy }] = useSetUserStatusMutation();

  const toggle = async (id: string, next: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await setUserStatus({ id, status: next }).unwrap();
      toast.success(next === 'SUSPENDED' ? 'User suspended' : 'User reactivated');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };

  return (
    <>
      <PageHeader title="Users" text="Search accounts and suspend or reactivate them." />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search name or email"
          aria-label="Search users"
          value={search}
          onChange={(e) => reset(setSearch)(e.target.value)}
        />
        <Select
          aria-label="Role"
          value={role}
          onChange={(e) => reset(setRole)(e.target.value as Role | '')}
        >
          <option value="">All roles</option>
          {(['STUDENT', 'PARENT', 'TUTOR', 'ADMIN'] as Role[]).map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => reset(setStatus)(e.target.value as 'ACTIVE' | 'SUSPENDED' | '')}
        >
          <option value="">Any status</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>

      {isLoading ? (
        <LoadingBlock />
      ) : isError || !data ? (
        <ErrorBlock />
      ) : data.items.length === 0 ? (
        <EmptyState title="No users match" />
      ) : (
        <div className="space-y-3">
          {data.items.map((u) => (
            <Card key={u.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{u.fullName}</p>
                <p className="truncate text-sm text-muted">{u.email}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <Badge tone="brand">{u.role}</Badge>
                  <Badge tone={u.status === 'ACTIVE' ? 'success' : 'danger'}>{u.status}</Badge>
                  Joined {formatDate(u.createdAt)}
                </p>
              </div>
              {u.id !== me?.id && (
                <Button
                  variant={u.status === 'ACTIVE' ? 'outline' : 'primary'}
                  size="sm"
                  disabled={busy}
                  onClick={() => toggle(u.id, u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                >
                  {u.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                </Button>
              )}
            </Card>
          ))}
          <Pagination meta={data.meta} onPage={setPage} />
        </div>
      )}
    </>
  );
}
