import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

const tab = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex-1 rounded-md px-6 py-2.5 text-center text-sm font-semibold transition',
    isActive ? 'bg-brand-500 text-white' : 'text-brand-500',
  );

interface Props {
  image: string;
  headline: string;
  subline: string;
  children: ReactNode;
}

/** Split layout from the Figma design: photo panel (desktop only) + form with Login/Register tabs. */
export function AuthShell({ image, headline, subline, children }: Props) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-2">
      <div className="relative m-10 hidden overflow-hidden rounded-2xl lg:block">
        <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        <div className="absolute bottom-10 left-12 text-white">
          <p className="text-4xl font-semibold">{headline}</p>
          <p className="mt-2 text-xl text-white/90">{subline}</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <p className="text-center text-base text-ink-soft">Welcome to EduConnect Sindh!</p>
          <nav className="mx-auto mt-6 flex w-full max-w-xs rounded-md bg-brand-100 p-1.5">
            <NavLink to="/login" className={tab}>
              Login
            </NavLink>
            <NavLink to="/register" className={tab}>
              Register
            </NavLink>
          </nav>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
