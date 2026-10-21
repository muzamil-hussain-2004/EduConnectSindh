import { useId } from 'react';
import { Link } from 'react-router';

/** Sindh province outline with a graduation cap and the Indus running through it. */
export function LogoMark({ className = 'size-10' }: { className?: string }) {
  const gradient = useId();
  return (
    <svg viewBox="0 0 100 108" className={className} role="img" aria-label="EduConnect Sindh">
      <defs>
        <linearGradient
          id={gradient}
          x1="20"
          y1="0"
          x2="85"
          y2="105"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FF8A5C" />
          <stop offset="1" stopColor="#E8501F" />
        </linearGradient>
      </defs>
      <path
        d="M60 3 71 9 77 21 72 31 81 42 79 56 89 68 87 83 78 91 66 93 58 99 48 101 40 96 31 94 25 88 11 84 10 76 19 68 24 56 19 44 22 31 30 23 38 13 50 7Z"
        fill={`url(#${gradient})`}
        stroke="#E8501F"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M52 14C40 28 46 38 38 50 32 60 44 70 40 82 38 90 44 96 47 99"
        fill="none"
        stroke="#fff"
        strokeOpacity=".45"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M50 34 77 47 50 60 23 47Z" fill="#fff" />
      <path d="M36 54v10c8 7 20 7 28 0V54L50 61Z" fill="#fff" fillOpacity=".92" />
      <path d="M77 47v14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="77" cy="63" r="3" fill="#fff" />
    </svg>
  );
}

export function Logo({ light }: { light?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="EduConnect Sindh home">
      <LogoMark className="size-11 shrink-0" />
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
