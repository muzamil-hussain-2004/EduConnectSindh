import { Menu, Search, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, NavLink, useNavigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { buttonClass } from '@/components/ui/Button';
import { NotificationBell } from '@/features/notifications/NotificationBell';
import { cn } from '@/lib/cn';
import { Logo } from './Logo';

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
                <Link
                  to="/dashboard"
                  className={buttonClass('soft', 'sm', 'hidden sm:inline-flex')}
                >
                  {user.fullName.split(' ')[0]}
                </Link>
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
              <NavLink to="/dashboard" className={mobileLink} onClick={() => setOpen(false)}>
                Dashboard
              </NavLink>
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
