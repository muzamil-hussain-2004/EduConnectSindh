import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/tutors/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  useDecideVerificationMutation,
  useGetVerificationRequestQuery,
  useListVerificationRequestsQuery,
} from '@/features/verification/verificationApi';
import { formatDate } from '@/lib/format';
import { openDocument } from '@/lib/openDocument';
import { getErrorMessage } from '@/services/api/baseApi';
import { cn } from '@/lib/cn';
import { PageHeader } from './PageHeader';
import { DOC_LABEL } from './VerificationPage';

type Status = 'PENDING' | 'VERIFIED' | 'REJECTED';
const TABS: Status[] = ['PENDING', 'VERIFIED', 'REJECTED'];

function ReviewModal({ tutorId, onClose }: { tutorId: string; onClose: () => void }) {
  const { data, isLoading } = useGetVerificationRequestQuery(tutorId);
  const [decide, { isLoading: deciding }] = useDecideVerificationMutation();
  const [reason, setReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const act = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && reason.trim().length < 5)
      return toast.error('Give a reason (5+ characters)');
    try {
      await decide({ id: tutorId, action, reason: reason.trim() }).unwrap();
      toast.success(action === 'approve' ? 'Tutor verified' : 'Verification rejected');
      onClose();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Modal open onClose={onClose} title="Review verification">
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-4">
          <div>
            <p className="font-semibold">{data.fullName}</p>
            <p className="text-sm text-ink-soft">{data.headline}</p>
            <p className="text-xs text-muted">{data.qualification}</p>
          </div>
          <ul className="divide-y divide-line rounded-md border border-line">
            {data.documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{DOC_LABEL[d.type]}</span>
                  <span className="block truncate text-xs text-muted">{d.originalName}</span>
                </span>
                <Button
                  size="sm"
                  variant="soft"
                  onClick={() => openDocument(d.id).catch((e) => toast.error(getErrorMessage(e)))}
                >
                  <ExternalLink className="size-4" /> View
                </Button>
              </li>
            ))}
          </ul>
          {data.status === 'PENDING' &&
            (rejecting ? (
              <div className="space-y-3">
                <Textarea
                  aria-label="Rejection reason"
                  placeholder="Why is this being rejected?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button variant="danger" loading={deciding} onClick={() => act('reject')}>
                    Confirm reject
                  </Button>
                  <Button variant="ghost" onClick={() => setRejecting(false)}>
                    Back
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button loading={deciding} onClick={() => act('approve')}>
                  Approve
                </Button>
                <Button variant="outline" onClick={() => setRejecting(true)}>
                  Reject
                </Button>
              </div>
            ))}
        </div>
      )}
    </Modal>
  );
}

export function AdminVerificationPage() {
  const [status, setStatus] = useState<Status>('PENDING');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const { data, isLoading, isError } = useListVerificationRequestsQuery({ status, page });

  return (
    <>
      <PageHeader title="Verification queue" text="Review tutor documents and approve or reject." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setStatus(t);
              setPage(1);
            }}
            className={cn(
              'rounded-md px-4 py-2 text-sm whitespace-nowrap',
              status === t ? 'bg-brand-500 text-white' : 'bg-surface text-ink-soft',
            )}
          >
            {t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.items.length ? (
        <div className="space-y-3">
          {data.items.map((v) => (
            <Card key={v.tutorId} className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{v.fullName}</p>
                <p className="truncate text-sm text-ink-soft">{v.headline}</p>
                <p className="text-xs text-muted">
                  {v.documentCount} documents · submitted {formatDate(v.submittedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <VerificationBadge status={v.status} />
                <Button size="sm" onClick={() => setSelected(v.tutorId)}>
                  Review
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title={`No ${status.toLowerCase()} requests`} />
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
      {selected && <ReviewModal tutorId={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
