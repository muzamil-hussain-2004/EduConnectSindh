import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';
import { ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { useGetAdminStatsQuery } from '@/features/admin/adminApi';
import { PageHeader } from './PageHeader';

function Tile({ label, value, to }: { label: string; value: number | string; to?: string }) {
  const body = (
    <Card className={to ? 'transition hover:shadow-md' : undefined}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-brand-500">{value}</p>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function AdminOverviewPage() {
  const { data, isLoading, isError } = useGetAdminStatsQuery();
  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock />;

  const max = Math.max(1, ...data.signups.map((s) => s.count));
  const v = data.tutors.byVerification;

  return (
    <>
      <PageHeader title="Platform overview" text="Live numbers across EduConnect Sindh." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Users" value={data.users.total} to="/dashboard/admin/users" />
        <Tile label="Suspended users" value={data.users.suspended} to="/dashboard/admin/users" />
        <Tile
          label="Tutors awaiting review"
          value={v.PENDING ?? 0}
          to="/dashboard/admin/verification"
        />
        <Tile label="Verified tutors" value={v.VERIFIED ?? 0} />
        <Tile label="Published courses" value={data.courses.byStatus.PUBLISHED ?? 0} />
        <Tile label="Enrollments" value={data.courses.enrollments} />
        <Tile label="Upcoming classes" value={data.classes.upcoming} />
        <Tile label="Class bookings" value={data.classes.bookings} />
        <Tile label="Pending requests" value={data.requests.byStatus.PENDING ?? 0} />
        <Tile label="Accepted requests" value={data.requests.byStatus.ACCEPTED ?? 0} />
        <Tile label="Visible reviews" value={data.reviews.visible} to="/dashboard/admin/reviews" />
        <Tile
          label="Students / Parents / Tutors"
          value={`${data.users.byRole.STUDENT ?? 0} / ${data.users.byRole.PARENT ?? 0} / ${data.users.byRole.TUTOR ?? 0}`}
        />
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 font-semibold">New sign-ups, last 14 days</h2>
        <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Sign-ups per day">
          {data.signups.map((s) => (
            <div key={s.date} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-muted">{s.count || ''}</span>
              <div
                className="w-full rounded-t bg-brand-500"
                style={{ height: `${(s.count / max) * 100}%`, minHeight: s.count ? 4 : 2 }}
                title={`${s.date}: ${s.count}`}
              />
              <span className="text-[10px] text-muted">{s.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
