import { Link } from 'react-router';
import { toast } from 'sonner';
import { RequestStatusBadge } from '@/components/tutors/StatusBadge';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { useState } from 'react';
import {
  useGetIncomingRequestsQuery,
  useGetMyRequestsQuery,
  useRespondToRequestMutation,
} from '@/features/requests/requestsApi';
import { MODE_LABEL, formatDate, formatPkr } from '@/lib/format';
import { getErrorMessage } from '@/services/api/baseApi';
import type { TutorRequest } from '@/types/api';
import { PageHeader } from './PageHeader';

function RequestItem({ r, incoming }: { r: TutorRequest; incoming: boolean }) {
  const [respond, { isLoading }] = useRespondToRequestMutation();
  const person = incoming ? r.student : r.tutor;

  const act = async (action: 'accept' | 'decline' | 'cancel') => {
    try {
      await respond({ id: r.id, action }).unwrap();
      toast.success(
        `Request ${action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'cancelled'}`,
      );
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">
            {incoming ? (
              (person?.fullName ?? 'Student')
            ) : (
              <Link to={`/tutors/${r.tutorId}`} className="hover:text-brand-500">
                {person?.fullName ?? 'Tutor'}
              </Link>
            )}
          </p>
          <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
        </div>
        <RequestStatusBadge status={r.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{r.subject.name}</Badge>
        <Badge>{MODE_LABEL[r.mode]}</Badge>
        {r.area && <Badge>{r.area.name}</Badge>}
        {r.budgetPerHour && <Badge>Budget {formatPkr(r.budgetPerHour)}/hr</Badge>}
      </div>
      <p className="text-sm text-ink-soft">{r.message}</p>
      {r.responseNote && <p className="text-sm text-muted">Note: {r.responseNote}</p>}
      {r.status === 'ACCEPTED' && person && (
        <div className="rounded-md bg-green-50 p-3 text-sm">
          <p className="font-medium text-success">Contact details</p>
          {person.email && <p>{person.email}</p>}
          {person.phone && <p>{person.phone}</p>}
        </div>
      )}
      {r.status === 'PENDING' && (
        <div className="flex gap-2">
          {incoming ? (
            <>
              <Button size="sm" onClick={() => act('accept')} disabled={isLoading}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => act('decline')}
                disabled={isLoading}
              >
                Decline
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => act('cancel')} disabled={isLoading}>
              Cancel request
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function RequestList({ incoming }: { incoming: boolean }) {
  const [page, setPage] = useState(1);
  const mine = useGetMyRequestsQuery({ page }, { skip: incoming });
  const inc = useGetIncomingRequestsQuery({ page }, { skip: !incoming });
  const { data, isLoading, isError } = incoming ? inc : mine;

  return (
    <>
      <PageHeader
        title={incoming ? 'Requests from students' : 'My requests'}
        text={
          incoming
            ? 'Accept a request to share your contact details with the student.'
            : 'Track the lesson requests you have sent to tutors.'
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.items.length ? (
        <div className="space-y-4">
          {data.items.map((r) => (
            <RequestItem key={r.id} r={r} incoming={incoming} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No requests yet"
          action={
            !incoming && (
              <Link to="/tutors" className={buttonClass('primary')}>
                Find a tutor
              </Link>
            )
          }
        />
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </>
  );
}

export const MyRequestsPage = () => <RequestList incoming={false} />;
export const IncomingRequestsPage = () => <RequestList incoming />;
