import { Star } from 'lucide-react';
import { cn } from '@/lib/cn';

const TONES = {
  brand: 'bg-brand-100 text-brand-500',
  accent: 'bg-accent-100 text-accent-500',
  success: 'bg-green-100 text-success',
  warning: 'bg-orange-100 text-warning',
  danger: 'bg-red-100 text-danger',
  neutral: 'bg-surface text-ink-soft',
} as const;

export type Tone = keyof typeof TONES;

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function RatingStars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className="size-4 fill-warning text-warning" aria-hidden />
      <span className="font-medium">{count === 0 ? 'New' : value.toFixed(1)}</span>
      {count !== undefined && count > 0 && <span className="text-muted">({count})</span>}
    </span>
  );
}
