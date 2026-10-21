import { useId } from 'react';
import { Link } from 'react-router';

const MAP =
  'M56 2 66 6 72 16 66 26 76 34 86 46 84 58 94 66 92 80 84 90 74 94 66 92 58 100 50 104 42 98 34 100 24 94 10 90 2 86 10 80 20 74 22 62 18 52 24 42 22 32 30 24 36 16 46 8Z';
const RIVER = 'M50 14C44 28 52 40 44 52 38 62 48 72 42 84 40 92 44 98 46 100';

/** Open book, orbit ring and the Sindh map: the project emblem, in the brand orange. */
export function LogoMark({ className = 'h-12 w-auto' }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 200 160" className={className} role="img" aria-label="Edu Sindh Connect">
      <defs>
        <linearGradient id={`${id}-m`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#FF8A5C" />
          <stop offset="1" stopColor="#E8501F" />
        </linearGradient>
      </defs>

      {/* orbit ring with two nodes */}
      <g transform="rotate(-12 100 88)" fill="none" strokeLinecap="round">
        <path d="M8 88a92 26 0 0 1 184 0" stroke="#FF8A5C" strokeWidth="5" />
        <path d="M30 94a72 20 0 0 0 140 0" stroke="#E8501F" strokeWidth="2.5" opacity=".55" />
      </g>
      <g fill="#fff" stroke="#E8501F" strokeWidth="4">
        <circle cx="16" cy="108" r="7" />
        <circle cx="184" cy="68" r="7" />
      </g>
      <g fill="#E8501F">
        <circle cx="16" cy="108" r="2.5" />
        <circle cx="184" cy="68" r="2.5" />
      </g>

      {/* open book: three stripes per side, mirrored */}
      <g fill="none" strokeLinecap="round">
        {[0, 1].map((side) => (
          <g key={side} transform={side ? 'translate(200 0) scale(-1 1)' : undefined}>
            <path d="M12 118Q56 104 100 134" stroke="#C2410C" strokeWidth="7" />
            <path d="M22 130Q62 118 100 142" stroke="#E8501F" strokeWidth="7" />
            <path d="M34 141Q68 131 100 150" stroke="#FF8A5C" strokeWidth="6" />
          </g>
        ))}
        <path d="M84 150Q100 158 116 150" stroke="#C2410C" strokeWidth="4" />
      </g>

      {/* Sindh */}
      <g transform="translate(47 2) scale(1.08)">
        <path
          d={MAP}
          fill={`url(#${id}-m)`}
          stroke="#fff"
          strokeWidth="3"
          strokeLinejoin="round"
          paintOrder="stroke"
        />
        <path
          d={RIVER}
          fill="none"
          stroke="#fff"
          strokeOpacity=".7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="44" cy="62" r="2.2" fill="#fff" />
      </g>
    </svg>
  );
}

export function Logo({ light }: { light?: boolean }) {
  const dark = light ? 'text-white' : 'text-ink';
  return (
    <Link to="/" className="flex items-center gap-2" aria-label="Edu Sindh Connect home">
      <LogoMark className="h-14 w-auto shrink-0" />
      <span className={`text-xl leading-none font-bold tracking-tight ${dark}`}>
        Edu <span className="text-brand-500">Sindh</span> Connect
      </span>
    </Link>
  );
}
