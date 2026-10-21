import { CalendarClock, Users, Video } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAppSelector } from '@/app/hooks';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  useBookClassMutation,
  useCancelClassMutation,
  useLazyGetJoinLinkQuery,
  useUnbookClassMutation,
  type ClassSession,
} from '@/features/classes/classesApi';
import { isSeeker } from '@/lib/format';
import { getErrorMessage } from '@/services/api/baseApi';

export const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

/** `mode` decides which actions show: browse (book), booked (join + leave) or manage (tutor). */
export function ClassCard({
  session,
  mode,
}: {
  session: ClassSession;
  mode: 'browse' | 'booked' | 'manage';
}) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const [book, { isLoading: booking }] = useBookClassMutation();
  const [unbook, { isLoading: leaving }] = useUnbookClassMutation();
  const [cancel, { isLoading: cancelling }] = useCancelClassMutation();
  const [getLink, { isFetching: joining }] = useLazyGetJoinLinkQuery();

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const join = async () => {
    const win = window.open('', '_blank');
    try {
      const url = await getLink(session.id).unwrap();
      if (win) win.location.href = url;
    } catch (e) {
      win?.close();
      toast.error(getErrorMessage(e));
    }
  };

  const cancelled = session.status === 'CANCELLED';

  return (
    <article className="flex flex-col rounded-md border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{session.title}</h3>
        {cancelled && <Badge tone="danger">Cancelled</Badge>}
      </div>
      <p className="mt-1 text-xs text-muted">
        by{' '}
        <Link to={`/tutors/${session.tutor.id}`} className="hover:text-brand-500">
          {session.tutor.fullName}
        </Link>
        {session.course && (
          <>
            {' · '}
            <Link to={`/courses/${session.course.id}`} className="hover:text-brand-500">
              {session.course.title}
            </Link>
          </>
        )}
      </p>
      <div className="mt-3 space-y-1 text-sm text-ink-soft">
        <p className="inline-flex items-center gap-2">
          <CalendarClock className="size-4" /> {formatWhen(session.startsAt)} ·{' '}
          {session.durationMin} min
        </p>
        <p className="flex items-center gap-2">
          <Users className="size-4" /> {session.bookingCount}/{session.capacity} booked
        </p>
      </div>
      {session.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted">{session.description}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
        {mode === 'browse' && isSeeker(role) && !cancelled && (
          <Button
            size="sm"
            loading={booking}
            disabled={session.seatsLeft === 0}
            onClick={() => run(() => book(session.id).unwrap(), 'Seat booked')}
          >
            {session.seatsLeft === 0 ? 'Full' : 'Book a seat'}
          </Button>
        )}
        {mode === 'browse' && !role && (
          <Link to="/login" className="text-sm font-medium text-brand-500">
            Sign in to book
          </Link>
        )}
        {mode === 'booked' && (
          <>
            <Button size="sm" loading={joining} onClick={join}>
              <Video className="size-4" /> Join class
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={leaving}
              onClick={() => run(() => unbook(session.id).unwrap())}
            >
              Release seat
            </Button>
          </>
        )}
        {mode === 'manage' && !cancelled && (
          <>
            <Button size="sm" loading={joining} variant="soft" onClick={join}>
              <Video className="size-4" /> Open link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={cancelling}
              onClick={() =>
                confirm('Cancel this class? Booked students will be notified.') &&
                run(() => cancel(session.id).unwrap(), 'Class cancelled')
              }
            >
              Cancel class
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
