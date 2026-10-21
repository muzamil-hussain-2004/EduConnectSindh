import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '@/features/notifications/notificationsApi';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { PageHeader } from './PageHeader';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useGetNotificationsQuery({ page });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAll, { isLoading: marking }] = useMarkAllNotificationsReadMutation();

  return (
    <>
      <PageHeader
        title="Notifications"
        action={
          <Button variant="outline" size="sm" loading={marking} onClick={() => markAll()}>
            Mark all as read
          </Button>
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.items.length ? (
        <ul className="divide-y divide-line rounded-md border border-line">
          {data.items.map((n) => (
            <li key={n.id} className={cn('flex items-start gap-3 p-4', !n.readAt && 'bg-brand-50')}>
              <span
                className={cn(
                  'mt-2 size-2 shrink-0 rounded-full',
                  n.readAt ? 'bg-line' : 'bg-brand-500',
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{n.title}</p>
                <p className="text-sm text-ink-soft">{n.body}</p>
                <p className="mt-1 text-xs text-muted">{formatDate(n.createdAt)}</p>
              </div>
              {!n.readAt && (
                <Button variant="ghost" size="sm" onClick={() => markRead(n.id)}>
                  Mark read
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="You're all caught up" />
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
