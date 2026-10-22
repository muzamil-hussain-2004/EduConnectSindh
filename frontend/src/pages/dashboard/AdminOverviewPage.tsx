import {
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  GraduationCap,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  BarChart,
  Donut,
  Panel,
  SidePanel,
  StatTile,
  WelcomeBanner,
} from '@/components/dashboard/widgets';
import { buttonClass } from '@/components/ui/Button';
import { ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { useGetAdminStatsQuery } from '@/features/admin/adminApi';

export function AdminOverviewPage() {
  const { data, isLoading, isError } = useGetAdminStatsQuery();
  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock />;

  const v = data.tutors.byVerification;
  const roles = data.users.byRole;
  const pending = v.PENDING ?? 0;
  const verified = v.VERIFIED ?? 0;
  const rejected = v.REJECTED ?? 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <WelcomeBanner
          icon={ShieldCheck}
          title="Welcome back, Admin"
          text={
            pending
              ? `${pending} tutor${pending === 1 ? ' is' : 's are'} waiting for verification.`
              : 'Everything is reviewed. Nice work keeping the platform trusted.'
          }
          action={
            <Link to="/dashboard/admin/verification" className={buttonClass('primary', 'md')}>
              Review verifications
            </Link>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile
            index={1}
            label="Total users"
            value={data.users.total}
            icon={Users}
            tone="bg-accent-100 text-accent-500"
            to="/dashboard/admin/users"
          />
          <StatTile
            index={2}
            label="Published courses"
            value={data.courses.byStatus.PUBLISHED ?? 0}
            icon={BookOpen}
            tone="bg-brand-100 text-brand-500"
          />
          <StatTile
            index={3}
            label="Upcoming classes"
            value={data.classes.upcoming}
            icon={CalendarClock}
            tone="bg-green-100 text-success"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Users by role" index={2}>
            <Donut
              caption="Users by role"
              centre={
                <div>
                  <p className="text-xl font-bold">{data.users.total}</p>
                  <p className="text-[10px] text-muted">users</p>
                </div>
              }
              segments={[
                { label: 'Students', value: roles.STUDENT ?? 0, color: '#564ffd' },
                { label: 'Parents', value: roles.PARENT ?? 0, color: '#fd8e1f' },
                { label: 'Tutors', value: roles.TUTOR ?? 0, color: '#23bd33' },
              ]}
            />
          </Panel>
          <Panel title="Tutor verification" index={3}>
            <Donut
              caption="Tutor verification"
              centre={
                <div>
                  <p className="text-xl font-bold">{verified}</p>
                  <p className="text-[10px] text-muted">verified</p>
                </div>
              }
              segments={[
                { label: 'Verified', value: verified, color: '#23bd33' },
                { label: 'Pending', value: pending, color: '#fd8e1f' },
                { label: 'Rejected', value: rejected, color: '#e34444' },
              ]}
            />
          </Panel>
        </div>

        <Panel title="New sign-ups, last 14 days" index={4}>
          <BarChart data={data.signups.map((s) => ({ label: s.date.slice(8), value: s.count }))} />
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            index={5}
            label="Enrollments"
            value={data.courses.enrollments}
            icon={GraduationCap}
            tone="bg-accent-100 text-accent-500"
          />
          <StatTile
            index={6}
            label="Class bookings"
            value={data.classes.bookings}
            icon={CalendarClock}
            tone="bg-brand-100 text-brand-500"
          />
          <StatTile
            index={7}
            label="Pending requests"
            value={data.requests.byStatus.PENDING ?? 0}
            icon={ClipboardCheck}
            tone="bg-brand-100 text-warning"
          />
          <StatTile
            index={8}
            label="Visible reviews"
            value={data.reviews.visible}
            icon={ShieldCheck}
            tone="bg-green-100 text-success"
            to="/dashboard/admin/reviews"
          />
        </div>
      </div>
      <SidePanel />
    </div>
  );
}
