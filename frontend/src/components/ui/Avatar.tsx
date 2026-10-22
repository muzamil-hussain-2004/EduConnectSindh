import { useState } from 'react';
import { env } from '@/config/env';
import { cn } from '@/lib/cn';
import { initials } from '@/lib/format';

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-24 text-2xl',
} as const;

interface AvatarProps {
  name: string;
  /** Path returned by the API, e.g. /users/<id>/avatar?v=abc. Empty shows initials. */
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Profile picture with an initials fallback (also used when the image fails to load). */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const show = !!src && failed !== src;
  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-500',
        SIZES[size],
        className,
      )}
    >
      {show ? (
        <img
          src={`${env.apiUrl}${src}`}
          alt={name}
          loading="lazy"
          onError={() => setFailed(src)}
          className="size-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
