import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { Avatar } from '@/components/ui/Avatar';
import { buttonClass } from '@/components/ui/Button';
import { useLogoutMutation } from '@/features/auth/authApi';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';

function UserMenu() {
  const user = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-md py-1 pr-2 pl-1 hover:bg-surface"
      >
        <Avatar name={user.fullName} src={user.avatarUrl} size="sm" />
        <span className="text-sm font-medium">{user.fullName.split(' ')[0]}</span>
        <ChevronDown className="size-4 text-muted" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-lg border border-line bg-white p-1.5 shadow-lg"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <Link
            to="/dashboard"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-surface"
          >
            <LayoutDashboard className="size-4" /> Dashboard
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              setOpen(false);
              await logout()
                .unwrap()
                .catch(() => undefined);
              navigate('/');
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-danger hover:bg-surface"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

const link = ({ isActive }: { isActive: boolean }) =>
  cn('text-sm transition hover:text-white', isActive ? 'font-medium text-white' : 'text-white/60');

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block rounded-md px-3 py-2.5 text-sm',
    isActive ? 'bg-brand-100 font-medium text-brand-500' : 'text-ink-soft',
  );

export function Navbar() {
  const user = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const [logout] = useLogoutMutation();

  const onLogout = async () => {
    setOpen(false);
    await logout()
      .unwrap()
      .catch(() => undefined);
    navigate('/');
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setOpen(false);
    navigate(q.trim() ? `/tutors?q=${encodeURIComponent(q.trim())}` : '/tutors');
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="hidden bg-ink md:block">
        <div className="mx-auto flex max-w-7xl gap-6 px-4 py-2.5">
          <NavLink to="/" end className={link}>
            Home
          </NavLink>
          <NavLink to="/tutors" className={link}>
            Find tutors
          </NavLink>
          <NavLink to="/courses" className={link}>
            Courses
          </NavLink>
          <NavLink to="/classes" className={link}>
            Live classes
          </NavLink>
          {user && (
            <NavLink to="/dashboard" className={link}>
              Dashboard
            </NavLink>
          )}
        </div>
      </div>
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
          <Logo />
          <form onSubmit={onSearch} className="relative hidden flex-1 md:block md:max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tutors or subjects..."
              aria-label="Search tutors"
              className="h-11 w-full rounded-md border border-line pr-3 pl-10 text-sm outline-none focus:border-brand-500"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />
                <UserMenu />
              </>
            ) : (
              <>
                <Link to="/register" className={buttonClass('soft', 'sm', 'hidden sm:inline-flex')}>
                  Create account
                </Link>
                <Link to="/login" className={buttonClass('primary', 'sm')}>
                  Sign in
                </Link>
              </>
            )}
            <button
              className="rounded-md p-2 text-ink-soft hover:bg-surface md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="space-y-2 border-t border-line bg-white px-4 py-3 md:hidden">
            <form onSubmit={onSearch} className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search tutors or subjects..."
                aria-label="Search tutors"
                className="h-11 w-full rounded-md border border-line pr-3 pl-10 text-sm outline-none focus:border-brand-500"
              />
            </form>
            <NavLink to="/" end className={mobileLink} onClick={() => setOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/tutors" className={mobileLink} onClick={() => setOpen(false)}>
              Find tutors
            </NavLink>
            <NavLink to="/courses" className={mobileLink} onClick={() => setOpen(false)}>
              Courses
            </NavLink>
            <NavLink to="/classes" className={mobileLink} onClick={() => setOpen(false)}>
              Live classes
            </NavLink>
            {user ? (
              <>
                <NavLink to="/dashboard" className={mobileLink} onClick={() => setOpen(false)}>
                  Dashboard
                </NavLink>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-sm text-danger"
                >
                  <LogOut className="size-4" /> Log out
                </button>
              </>
            ) : (
              <NavLink to="/register" className={mobileLink} onClick={() => setOpen(false)}>
                Create account
              </NavLink>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
