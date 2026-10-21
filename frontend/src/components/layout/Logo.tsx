import { Link } from 'react-router';

/** The official EduConnect Sindh logo (public/logo.png). */
export function LogoMark({ className = '', height = 48 }: { className?: string; height?: number }) {
  return (
    <img
      src="/logo.png"
      alt="EduConnect Sindh"
      className={className}
      style={{ height }}
      draggable={false}
    />
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="EduConnect Sindh home">
      {/* Transparent artwork; on dark areas it sits on a white chip so the dark-brown book stays visible. */}
      <span className={light ? 'rounded-lg bg-white p-1' : ''}>
        <LogoMark className="w-auto shrink-0" height={56} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`text-xl font-bold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          Edu<span className="text-brand-500">Connect</span>
        </span>
        <span
          className={`mt-1 text-[10px] font-semibold tracking-[0.35em] ${light ? 'text-white/70' : 'text-muted'}`}
        >
          SINDH
        </span>
      </span>
    </Link>
  );
}
