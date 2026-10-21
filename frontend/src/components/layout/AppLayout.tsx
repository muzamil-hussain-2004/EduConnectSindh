import { GraduationCap } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { useLogoutMutation } from '@/features/auth/authApi';

const YEAR = new Date().getFullYear();

export function AppLayout() {
  const user = useAppSelector((s) => s.auth.user);
  const [logout, { isLoading }] = useLogoutMutation();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout()
      .unwrap()
      .catch(() => undefined);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-brand-700">
            <GraduationCap className="size-6" /> EduConnect Sindh
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NavLink to="/dashboard" className="text-sm text-slate-700 hover:text-brand-600">
                  Dashboard
                </NavLink>
                <span className="hidden text-sm text-slate-500 sm:inline">{user.fullName}</span>
                <Button variant="secondary" onClick={onLogout} loading={isLoading}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-slate-700 hover:text-brand-600">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        © {YEAR} EduConnect Sindh — University of Sindh FYP
      </footer>
    </div>
  );
}
