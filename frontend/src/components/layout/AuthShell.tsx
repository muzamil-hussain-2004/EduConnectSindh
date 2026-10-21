import type { ReactNode } from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';

const tab = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex-1 rounded-full px-6 py-2.5 text-center text-sm font-medium text-white transition',
    isActive && 'bg-brand-500 shadow-sm',
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
    <div className="grid min-h-screen bg-canvas lg:grid-cols-2">
      <div className="relative m-10 hidden overflow-hidden rounded-[2rem] lg:block">
        <img src={image} alt="" className="absolute inset-0 size-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-10 left-12 text-white">
          <p className="text-4xl font-semibold">{headline}</p>
          <p className="mt-2 text-2xl">{subline}</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <p className="text-center text-base">Welcome to EduConnect Sindh!</p>
          <nav className="mx-auto mt-6 flex w-full max-w-xs rounded-full bg-brand-300 p-2">
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
