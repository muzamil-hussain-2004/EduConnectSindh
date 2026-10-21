import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { Spinner } from '@/components/ui/Spinner';
import type { Role } from '@/types/api';

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center">
      <Spinner className="size-8 text-brand-600" />
    </div>
  );
}

/** Renders child routes only for signed-in users (optionally of given roles). */
export function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { status, user } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (status === 'idle' || status === 'loading') return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

/** Login/Register are pointless when already signed in. */
export function GuestRoute() {
  const { status, user } = useAppSelector((s) => s.auth);
  if (status === 'idle' || status === 'loading') return <FullPageSpinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
