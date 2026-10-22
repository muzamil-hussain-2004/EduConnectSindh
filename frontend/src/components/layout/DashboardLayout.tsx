import {
  Bell,
  BookMarked,
  BookOpen,
  CalendarClock,
  GraduationCap,
  FileCheck2,
  Heart,
  Home,
  Inbox,
  Search,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  UserCog,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { AvatarUploader } from './AvatarUploader';
import { useLogoutMutation } from '@/features/auth/authApi';
import { cn } from '@/lib/cn';
import type { Role } from '@/types/api';

interface Item {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const COMMON: Item[] = [{ to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true }];
const NOTIFS: Item = { to: '/dashboard/notifications', label: 'Notifications', icon: Bell };

const NAV: Record<Role, Item[]> = {
  STUDENT: [
    ...COMMON,
    { to: '/dashboard/learning', label: 'My learning', icon: GraduationCap },
    { to: '/dashboard/classes', label: 'My classes', icon: CalendarClock },
    { to: '/dashboard/requests', label: 'My requests', icon: BookMarked },
    { to: '/dashboard/shortlist', label: 'Shortlist', icon: Heart },
    NOTIFS,
  ],
  PARENT: [
    ...COMMON,
    { to: '/dashboard/learning', label: 'My learning', icon: GraduationCap },
    { to: '/dashboard/classes', label: 'My classes', icon: CalendarClock },
    { to: '/dashboard/requests', label: 'My requests', icon: BookMarked },
    { to: '/dashboard/shortlist', label: 'Shortlist', icon: Heart },
    NOTIFS,
  ],
  TUTOR: [
    ...COMMON,
    { to: '/dashboard/courses', label: 'My courses', icon: BookOpen },
    { to: '/dashboard/live', label: 'Live classes', icon: CalendarClock },
    { to: '/dashboard/incoming', label: 'Requests', icon: Inbox },
    { to: '/dashboard/profile', label: 'My profile', icon: UserCog },
    { to: '/dashboard/verification', label: 'Verification', icon: FileCheck2 },
    NOTIFS,
  ],
  ADMIN: [
    ...COMMON,
    { to: '/dashboard/admin/verification', label: 'Verifications', icon: FileCheck2 },
    { to: '/dashboard/admin/users', label: 'Users', icon: Users },
    { to: '/dashboard/admin/reviews', label: 'Reviews', icon: MessageSquareWarning },
    NOTIFS,
  ],
};

const tab = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition',
    isActive ? 'bg-brand-100 font-medium text-brand-500' : 'text-ink-soft hover:bg-surface',
  );

const SHORTCUTS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/tutors', label: 'Find tutors', icon: Search },
  { to: '/courses', label: 'Courses', icon: BookOpen },
  { to: '/classes', label: 'Live classes', icon: Video },
];

/** Sidebar on desktop, horizontally scrollable tabs on mobile. */
export function DashboardLayout() {
  const user = useAppSelector((s) => s.auth.user);
  const [logout, { isLoading }] = useLogoutMutation();
  const navigate = useNavigate();
  if (!user) return null;

  const items = NAV[user.role];
  const onLogout = async () => {
    await logout()
      .unwrap()
      .catch(() => undefined);
    navigate('/');
  };
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-8">
      <aside className="lg:w-64 lg:shrink-0">
        <div className="animate-fade-up rounded-2xl border border-line bg-white p-4 lg:sticky lg:top-24">
          <div className="mb-4 hidden lg:block">
            <AvatarUploader />
          </div>
          <nav
            aria-label="Dashboard"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
          >
            {items.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={to} to={to} end={end} className={tab}>
                <Icon className="size-4" /> {label}
              </NavLink>
            ))}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 hidden w-full justify-start lg:inline-flex"
            onClick={onLogout}
            loading={isLoading}
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted">{today}</p>
          </div>
          <nav aria-label="Quick links" className="flex flex-wrap gap-2">
            {SHORTCUTS.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="lift inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-medium text-ink-soft hover:text-brand-500"
              >
                <Icon className="size-4" /> {label}
              </Link>
            ))}
          </nav>
        </div>
        <Outlet />
      </section>
    </div>
  );
}
export function LogoutButton() {
  const [logout, { isLoading }] = useLogoutMutation();
  const navigate = useNavigate();
  return (
    <Button
      variant="outline"
      size="sm"
      loading={isLoading}
      onClick={async () => {
        await logout()
          .unwrap()
          .catch(() => undefined);
        navigate('/');
      }}
    >
      <LogOut className="size-4" /> Log out
    </Button>
  );
}
