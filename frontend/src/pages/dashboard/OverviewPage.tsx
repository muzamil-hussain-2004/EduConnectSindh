import { Link } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useGetUnreadCountQuery } from '@/features/notifications/notificationsApi';
import {
  useGetIncomingRequestsQuery,
  useGetMyRequestsQuery,
  useGetShortlistQuery,
} from '@/features/requests/requestsApi';
import { useGetMyVerificationQuery } from '@/features/verification/verificationApi';
import { VerificationBadge } from '@/components/tutors/StatusBadge';
import { isSeeker } from '@/lib/format';
import { PageHeader } from './PageHeader';

function Stat({ label, value, to }: { label: string; value: React.ReactNode; to: string }) {
  return (
    <Link to={to}>
      <Card className="transition hover:shadow-md">
        <p className="text-sm text-muted">{label}</p>
        <p className="mt-1 text-3xl font-semibold text-brand-500">{value}</p>
      </Card>
    </Link>
  );
}

function SeekerStats() {
  const { data: reqs } = useGetMyRequestsQuery({ status: 'PENDING' });
  const { data: acc } = useGetMyRequestsQuery({ status: 'ACCEPTED' });
  const { data: list } = useGetShortlistQuery();
  return (
    <>
      <Stat label="Pending requests" value={reqs?.meta?.total ?? '–'} to="/dashboard/requests" />
      <Stat label="Accepted requests" value={acc?.meta?.total ?? '–'} to="/dashboard/requests" />
      <Stat label="Shortlisted tutors" value={list?.length ?? '–'} to="/dashboard/shortlist" />
    </>
  );
}

function TutorStats() {
  const { data: reqs } = useGetIncomingRequestsQuery({ status: 'PENDING' });
  const { data: v } = useGetMyVerificationQuery();
  return (
    <>
      <Stat label="New requests" value={reqs?.meta?.total ?? '–'} to="/dashboard/incoming" />
      <Stat
        label="Verification"
        value={
          v ? (
            <VerificationBadge status={v.status} />
          ) : (
            <span className="text-base">Set up profile</span>
          )
        }
        to="/dashboard/verification"
      />
    </>
  );
}

export function OverviewPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: unread } = useGetUnreadCountQuery();
  if (!user) return null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.fullName.split(' ')[0]}`}
        text="Here is what is happening on your account."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isSeeker(user.role) && <SeekerStats />}
        {user.role === 'TUTOR' && <TutorStats />}
        {user.role === 'ADMIN' && (
          <>
            <Stat label="Verification queue" value="Open" to="/dashboard/admin/verification" />
            <Stat label="Review moderation" value="Open" to="/dashboard/admin/reviews" />
          </>
        )}
        <Stat label="Unread notifications" value={unread ?? '–'} to="/dashboard/notifications" />
      </div>
      {isSeeker(user.role) && (
        <Link to="/tutors" className={buttonClass('primary', 'lg', 'mt-6')}>
          Find a tutor
        </Link>
      )}
      {user.role === 'TUTOR' && (
        <Link to="/dashboard/profile" className={buttonClass('primary', 'lg', 'mt-6')}>
          Edit my profile
        </Link>
      )}
    </>
  );
}
