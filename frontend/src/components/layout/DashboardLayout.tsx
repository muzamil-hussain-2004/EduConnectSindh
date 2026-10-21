import {
  Bell,
  BookMarked,
  BookOpen,
  CalendarClock,
  GraduationCap,
  FileCheck2,
  Heart,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  UserCog,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { useLogoutMutation } from '@/features/auth/authApi';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';
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
    { to: '/dashboard/admin/reviews', label: 'Reviews', icon: MessageSquareWarning },
    NOTIFS,
  ],
};

const tab = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap transition',
    isActive ? 'bg-brand-100 font-medium text-brand-500' : 'text-ink-soft hover:bg-surface',
  );

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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-10">
      <aside className="lg:w-64 lg:shrink-0">
        <div className="mb-4 hidden items-center gap-3 lg:flex">
          <span className="grid size-12 place-items-center rounded-full bg-brand-100 font-semibold text-brand-500">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.fullName}</p>
            <p className="text-xs text-muted capitalize">{user.role.toLowerCase()}</p>
          </div>
        </div>
        <nav
          aria-label="Dashboard"
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
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
          className="mt-4 hidden w-full justify-start lg:inline-flex"
          onClick={onLogout}
          loading={isLoading}
        >
          <LogOut className="size-4" /> Log out
        </Button>
      </aside>
      <section className="min-w-0 flex-1">
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
