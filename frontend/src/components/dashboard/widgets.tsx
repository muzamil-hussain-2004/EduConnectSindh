import { CalendarClock, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { Avatar } from '@/components/ui/Avatar';
import {
  useGetBookedClassesQuery,
  useGetMyClassesQuery,
  useGetUpcomingClassesQuery,
  type ClassSession,
} from '@/features/classes/classesApi';
import { useGetNotificationsQuery } from '@/features/notifications/notificationsApi';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

export const delay = (i: number) => ({ ['--delay' as string]: `${i * 70}ms` });

/** Gradient hero with a short message and one call to action. */
export function WelcomeBanner({
  title,
  text,
  action,
  icon: Icon,
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <section
      className="animate-fade-up relative overflow-hidden rounded-2xl p-6 text-white sm:p-8"
      style={{ background: 'linear-gradient(120deg, #3a33e0 0%, #564ffd 55%, #8a85ff 100%)' }}
    >
      <span className="absolute -top-10 right-24 size-40 rounded-full bg-white/10" />
      <span className="absolute -right-8 -bottom-12 size-52 rounded-full bg-white/10" />
      <Icon className="absolute top-1/2 right-8 hidden size-28 -translate-y-1/2 text-white/25 sm:block" />
      <div className="relative max-w-md">
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm text-white/85">{text}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </section>
  );
}

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/** Ring chart; the arcs pop in with a CSS animation. */
export function Donut({
  segments,
  centre,
  caption,
}: {
  segments: Segment[];
  centre: ReactNode;
  caption?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <div className="relative size-32 shrink-0">
        <svg viewBox="0 0 42 42" className="size-full -rotate-90" role="img" aria-label={caption}>
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="#f0f1f5" strokeWidth="5" />
          {total > 0 &&
            segments.map((s) => {
              const pct = (s.value / total) * 100;
              const len = Math.max(pct - 1, 0);
              const arc = (
                <circle
                  key={s.label}
                  cx="21"
                  cy="21"
                  r="15.9155"
                  fill="none"
                  stroke={s.color}
                  strokeWidth="5"
                  strokeDasharray={`${len} ${100 - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
              offset += pct;
              return arc;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">{centre}</div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-ink-soft">{s.label}</span>
            <span className="font-semibold">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatTile({
  label,
  value,
  icon: Icon,
  tone,
  to,
  index = 0,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  tone: string;
  to?: string;
  index?: number;
}) {
  const body = (
    <div
      className="lift animate-fade-up flex items-center gap-4 rounded-xl border border-line bg-white p-4"
      style={delay(index)}
    >
      <span className={cn('grid size-12 shrink-0 place-items-center rounded-xl', tone)}>
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl leading-none font-bold">{value}</p>
        <p className="mt-1 truncate text-sm text-muted">{label}</p>
      </div>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

export function Panel({
  title,
  children,
  action,
  className,
  index = 0,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  index?: number;
}) {
  return (
    <section
      className={cn('animate-fade-up rounded-xl border border-line bg-white p-5', className)}
      style={delay(index)}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-end gap-2" role="img" aria-label="Activity chart">
      {data.map((d, i) => (
        <div
          key={d.label + i}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
        >
          <span className="text-[10px] text-muted">{d.value || ''}</span>
          <div
            className="animate-grow-up w-full max-w-6 rounded-t-md"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value ? 6 : 3,
              background: 'linear-gradient(to top, #564ffd, #a9a5ff)',
              ...delay(i / 2),
            }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniCalendar({ marked }: { marked: Date[] }) {
  const [cursor, setCursor] = useState(() => new Date());
  const today = new Date();
  const { cells, title } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const list: (number | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= days; d++) list.push(d);
    return {
      cells: list,
      title: cursor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
    };
  }, [cursor]);
  const move = (by: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + by, 1));
  const same = (d: Date, day: number) =>
    d.getFullYear() === cursor.getFullYear() &&
    d.getMonth() === cursor.getMonth() &&
    d.getDate() === day;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button
          aria-label="Previous month"
          onClick={() => move(-1)}
          className="rounded p-1 hover:bg-surface"
        >
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-semibold">{title}</p>
        <button
          aria-label="Next month"
          onClick={() => move(1)}
          className="rounded p-1 hover:bg-surface"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="py-1 text-muted">
            {d}
          </span>
        ))}
        {cells.map((day, i) =>
          day === null ? (
            <span key={i} />
          ) : (
            <span
              key={i}
              className={cn(
                'mx-auto grid size-7 place-items-center rounded-full',
                same(today, day) && 'bg-brand-500 font-semibold text-white',
                !same(today, day) &&
                  marked.some((m) => same(m, day)) &&
                  'bg-brand-100 font-semibold text-brand-500',
              )}
            >
              {day}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function useSchedule(): ClassSession[] {
  const role = useAppSelector((s) => s.auth.user?.role);
  const mine = useGetMyClassesQuery(undefined, { skip: role !== 'TUTOR' });
  const booked = useGetBookedClassesQuery(undefined, {
    skip: role !== 'STUDENT' && role !== 'PARENT',
  });
  const upcoming = useGetUpcomingClassesQuery({}, { skip: role !== 'ADMIN' });
  const list = mine.data ?? booked.data ?? upcoming.data?.items ?? [];
  return list
    .filter((c) => c.status === 'SCHEDULED' && new Date(c.startsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Profile, calendar, schedule and recent activity: the right-hand column of every overview. */
export function SidePanel() {
  const user = useAppSelector((s) => s.auth.user);
  const schedule = useSchedule();
  const { data: notes } = useGetNotificationsQuery();
  if (!user) return null;

  return (
    <div className="space-y-5">
      <div className="animate-fade-up flex flex-col items-center rounded-xl border border-line bg-white p-5 text-center">
        <Avatar name={user.fullName} src={user.avatarUrl} size="xl" />
        <p className="mt-3 font-semibold">{user.fullName}</p>
        <p className="text-xs text-muted capitalize">{user.role.toLowerCase()}</p>
      </div>
      <Panel title="Calendar" index={1}>
        <MiniCalendar marked={schedule.map((c) => new Date(c.startsAt))} />
      </Panel>
      <Panel
        title="My schedule"
        index={2}
        action={
          <Link to="/classes" className="text-xs font-medium text-brand-500">
            View all
          </Link>
        }
      >
        {schedule.length === 0 ? (
          <p className="text-sm text-muted">No upcoming live classes.</p>
        ) : (
          <ul className="space-y-3">
            {schedule.slice(0, 3).map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-500">
                  <CalendarClock className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted">
                    {formatDate(c.startsAt)} ·{' '}
                    {new Date(c.startsAt).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel
        title="Recent activities"
        index={3}
        action={
          <Link to="/dashboard/notifications" className="text-xs font-medium text-brand-500">
            View all
          </Link>
        }
      >
        {notes?.items.length ? (
          <ul className="space-y-3">
            {notes.items.slice(0, 4).map((n) => (
              <li key={n.id} className="flex gap-3">
                <span
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    n.readAt ? 'bg-line' : 'bg-brand-500',
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="line-clamp-1 text-xs text-muted">{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Nothing yet.</p>
        )}
      </Panel>
    </div>
  );
}
