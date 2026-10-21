import { Heart } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useAppSelector } from '@/app/hooks';
import { Badge, RatingStars } from '@/components/ui/Badge';
import { VerifiedMark } from '@/components/tutors/StatusBadge';
import {
  useAddToShortlistMutation,
  useGetShortlistQuery,
  useRemoveFromShortlistMutation,
} from '@/features/requests/requestsApi';
import { cn } from '@/lib/cn';
import { MODE_LABEL, formatPkr, initials, isSeeker } from '@/lib/format';
import { getErrorMessage } from '@/services/api/baseApi';
import type { TutorSummary } from '@/types/api';

export function ShortlistButton({ tutorId, className }: { tutorId: string; className?: string }) {
  const role = useAppSelector((s) => s.auth.user?.role);
  const seeker = isSeeker(role);
  const { data } = useGetShortlistQuery(undefined, { skip: !seeker });
  const [add] = useAddToShortlistMutation();
  const [remove] = useRemoveFromShortlistMutation();
  if (!seeker) return null;

  const saved = !!data?.some((i) => i.tutor.id === tutorId);
  const toggle = async () => {
    try {
      await (saved ? remove(tutorId) : add(tutorId)).unwrap();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };
  return (
    <button
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from shortlist' : 'Save to shortlist'}
      className={cn('rounded-full bg-white p-2 shadow-sm hover:bg-brand-50', className)}
    >
      <Heart className={cn('size-5', saved ? 'fill-brand-500 text-brand-500' : 'text-ink-soft')} />
    </button>
  );
}

export function TutorCard({ tutor }: { tutor: TutorSummary }) {
  return (
    <article className="relative flex flex-col rounded-md border border-line bg-white p-4 transition hover:shadow-md">
      <ShortlistButton tutorId={tutor.id} className="absolute top-3 right-3" />
      <div className="flex items-center gap-3 pr-10">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand-100 text-lg font-semibold text-brand-500">
          {initials(tutor.fullName)}
        </span>
        <div className="min-w-0">
          <Link
            to={`/tutors/${tutor.id}`}
            className="block truncate font-semibold after:absolute after:inset-0 hover:text-brand-500"
          >
            {tutor.fullName}
          </Link>
          <p className="truncate text-xs text-muted">{tutor.qualification}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-10 text-sm text-ink-soft">{tutor.headline}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {tutor.subjects.slice(0, 3).map((s) => (
          <Badge key={s.id} tone="brand">
            {s.name}
          </Badge>
        ))}
        {tutor.subjects.length > 3 && <Badge>+{tutor.subjects.length - 3}</Badge>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
        <Badge>{MODE_LABEL[tutor.teachingMode]}</Badge>
        <span>{tutor.experienceYears} yrs exp.</span>
        {tutor.verificationStatus === 'VERIFIED' && <VerifiedMark />}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <RatingStars value={tutor.ratingAvg ?? 0} count={tutor.ratingCount ?? 0} />
        <p className="font-semibold text-brand-500">
          {formatPkr(tutor.hourlyRate)}
          <span className="text-xs font-normal text-muted">/hr</span>
        </p>
      </div>
    </article>
  );
}
