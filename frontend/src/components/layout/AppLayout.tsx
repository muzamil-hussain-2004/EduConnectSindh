import { Outlet } from 'react-router';
import { useNotificationSocket } from '@/features/notifications/useNotificationSocket';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export function AppLayout() {
  useNotificationSocket();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
