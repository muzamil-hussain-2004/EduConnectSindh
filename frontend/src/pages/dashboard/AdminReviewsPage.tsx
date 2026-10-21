import { useState } from 'react';
import { toast } from 'sonner';
import { Badge, RatingStars } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { useAdminListReviewsQuery, useModerateReviewMutation } from '@/features/tutors/tutorsApi';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { getErrorMessage } from '@/services/api/baseApi';
import { PageHeader } from './PageHeader';

type Status = 'VISIBLE' | 'HIDDEN';

export function AdminReviewsPage() {
  const [status, setStatus] = useState<Status>('VISIBLE');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useAdminListReviewsQuery({ status, page });
  const [moderate, { isLoading: busy }] = useModerateReviewMutation();

  const act = async (id: string, action: 'hide' | 'unhide') => {
    try {
      await moderate({ id, action }).unwrap();
      toast.success(action === 'hide' ? 'Review hidden' : 'Review restored');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <PageHeader title="Review moderation" text="Hide reviews that break the rules." />
      <div className="mb-4 flex gap-2">
        {(['VISIBLE', 'HIDDEN'] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={cn(
              'rounded-md px-4 py-2 text-sm',
              status === s ? 'bg-brand-500 text-white' : 'bg-surface text-ink-soft',
            )}
          >
            {s === 'VISIBLE' ? 'Visible' : 'Hidden'}
          </button>
        ))}
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.items.length ? (
        <div className="space-y-3">
          {data.items.map((r) => (
            <Card key={r.id} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{r.authorName}</p>
                <div className="flex items-center gap-2">
                  <RatingStars value={r.rating} />
                  {r.status === 'HIDDEN' && <Badge tone="danger">Hidden</Badge>}
                </div>
              </div>
              <p className="text-sm text-ink-soft">{r.comment}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => act(r.id, r.status === 'HIDDEN' ? 'unhide' : 'hide')}
                >
                  {r.status === 'HIDDEN' ? 'Restore' : 'Hide'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="No reviews here" />
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}
