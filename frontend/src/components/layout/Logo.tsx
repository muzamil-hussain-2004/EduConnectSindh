import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router';

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link
      to="/"
      className={`flex items-center gap-2 text-xl font-semibold ${light ? 'text-white' : 'text-ink'}`}
    >
      <GraduationCap className="size-7 text-brand-500" />
      EduConnect
    </Link>
  );
}
