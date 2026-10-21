import { Bell } from 'lucide-react';
import { Link } from 'react-router';
import { useGetUnreadCountQuery } from './notificationsApi';

export function NotificationBell() {
  const { data: count = 0 } = useGetUnreadCountQuery();
  return (
    <Link
      to="/dashboard/notifications"
      aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
      className="relative rounded-md p-2 text-ink-soft hover:bg-surface"
    >
      <Bell className="size-5" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
