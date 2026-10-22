import { Bell, BookMarked, GraduationCap, Heart, Inbox, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { SidePanel, StatTile, WelcomeBanner } from '@/components/dashboard/widgets';
import { VerificationBadge } from '@/components/tutors/StatusBadge';
import { buttonClass } from '@/components/ui/Button';
import { useGetUnreadCountQuery } from '@/features/notifications/notificationsApi';
import {
  useGetIncomingRequestsQuery,
  useGetMyRequestsQuery,
  useGetShortlistQuery,
} from '@/features/requests/requestsApi';
import { useGetMyVerificationQuery } from '@/features/verification/verificationApi';
import { isSeeker } from '@/lib/format';
import { AdminOverviewPage } from './AdminOverviewPage';

const DASH = '-';

function SeekerStats() {
  const { data: reqs } = useGetMyRequestsQuery({ status: 'PENDING' });
  const { data: acc } = useGetMyRequestsQuery({ status: 'ACCEPTED' });
  const { data: list } = useGetShortlistQuery();
  return (
    <>
      <StatTile
        index={1}
        label="Pending requests"
        value={reqs?.meta?.total ?? DASH}
        icon={BookMarked}
        tone="bg-accent-100 text-accent-500"
        to="/dashboard/requests"
      />
      <StatTile
        index={2}
        label="Accepted requests"
        value={acc?.meta?.total ?? DASH}
        icon={GraduationCap}
        tone="bg-green-100 text-success"
        to="/dashboard/requests"
      />
      <StatTile
        index={3}
        label="Shortlisted tutors"
        value={list?.length ?? DASH}
        icon={Heart}
        tone="bg-brand-100 text-brand-500"
        to="/dashboard/shortlist"
      />
    </>
  );
}

function TutorStats() {
  const { data: reqs } = useGetIncomingRequestsQuery({ status: 'PENDING' });
  const { data: v } = useGetMyVerificationQuery();
  return (
    <>
      <StatTile
        index={1}
        label="New requests"
        value={reqs?.meta?.total ?? DASH}
        icon={Inbox}
        tone="bg-accent-100 text-accent-500"
        to="/dashboard/incoming"
      />
      <StatTile
        index={2}
        label="Verification"
        value={
          v ? (
            <VerificationBadge status={v.status} />
          ) : (
            <span className="text-base">Set up profile</span>
          )
        }
        icon={ShieldCheck}
        tone="bg-green-100 text-success"
        to="/dashboard/verification"
      />
    </>
  );
}

export function OverviewPage() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: unread } = useGetUnreadCountQuery();
  if (!user) return null;
  if (user.role === 'ADMIN') return <AdminOverviewPage />;

  const seeker = isSeeker(user.role);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <WelcomeBanner
          icon={seeker ? GraduationCap : ShieldCheck}
          title={`Welcome, ${user.fullName.split(' ')[0]}`}
          text={
            seeker
              ? 'Pick up your lessons, join live classes or find a new tutor.'
              : 'Keep your profile and courses up to date so students can find you.'
          }
          action={
            seeker ? (
              <Link to="/dashboard/learning" className={buttonClass('primary', 'md')}>
                Continue learning
              </Link>
            ) : (
              <Link to="/dashboard/profile" className={buttonClass('primary', 'md')}>
                Edit my profile
              </Link>
            )
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {seeker && <SeekerStats />}
          {user.role === 'TUTOR' && <TutorStats />}
          <StatTile
            index={4}
            label="Unread notifications"
            value={unread ?? DASH}
            icon={Bell}
            tone="bg-brand-100 text-brand-500"
            to="/dashboard/notifications"
          />
        </div>
        {seeker && (
          <Link to="/tutors" className={buttonClass('outline', 'lg')}>
            Find a tutor
          </Link>
        )}
      </div>
      <SidePanel />
    </div>
  );
}
