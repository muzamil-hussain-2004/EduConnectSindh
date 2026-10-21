import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { ReviewsSection } from '@/components/tutors/ReviewsSection';
import { SendRequestModal } from '@/components/tutors/SendRequestModal';
import { VerifiedMark } from '@/components/tutors/StatusBadge';
import { ShortlistButton } from '@/components/tutors/TutorCard';
import { Badge, RatingStars } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState, LoadingBlock } from '@/components/ui/Feedback';
import { useGetTutorQuery } from '@/features/tutors/tutorsApi';
import { MODE_LABEL, formatPkr, initials, isSeeker } from '@/lib/format';

export function TutorDetailPage() {
  const { id = '' } = useParams();
  const user = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const { data: tutor, isLoading, isError } = useGetTutorQuery(id);

  if (isLoading) return <LoadingBlock />;
  if (isError || !tutor)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title="Tutor not found"
          action={
            <Link to="/tutors" className={buttonClass('primary')}>
              Back to search
            </Link>
          }
        />
      </div>
    );

  const action = !user ? (
    <Link
      to="/login"
      state={{ from: `/tutors/${tutor.id}` }}
      className={buttonClass('primary', 'lg', 'w-full')}
    >
      Sign in to send a request
    </Link>
  ) : isSeeker(user.role) ? (
    <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
      Send request
    </Button>
  ) : (
    <p className="rounded-md bg-surface p-3 text-sm text-muted">
      Only students and parents can send requests.
    </p>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1 text-sm text-muted">
        <Link to="/tutors" className="hover:text-brand-500">
          Tutors
        </Link>
        <ChevronRight className="size-4" />
        <span className="truncate text-ink">{tutor.fullName}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="grid size-24 shrink-0 place-items-center rounded-full bg-brand-100 text-3xl font-semibold text-brand-500">
              {initials(tutor.fullName)}
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold md:text-3xl">{tutor.fullName}</h1>
              <p className="text-ink-soft">{tutor.headline}</p>
              <div className="flex flex-wrap items-center gap-3">
                <RatingStars value={tutor.ratingAvg} count={tutor.ratingCount} />
                {tutor.verificationStatus === 'VERIFIED' && <VerifiedMark />}
                <Badge>{MODE_LABEL[tutor.teachingMode]}</Badge>
              </div>
            </div>
          </header>

          <section>
            <h2 className="mb-2 text-xl font-semibold">About</h2>
            <p className="whitespace-pre-line text-ink-soft">{tutor.bio}</p>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 text-xl font-semibold">Subjects</h2>
              <div className="flex flex-wrap gap-2">
                {tutor.subjects.map((s) => (
                  <Badge key={s.id} tone="brand">
                    {s.name}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h2 className="mb-2 text-xl font-semibold">Areas served</h2>
              {tutor.areas.length ? (
                <div className="flex flex-wrap gap-2">
                  {tutor.areas.map((a) => (
                    <Badge key={a.id}>{a.name}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">Online only</p>
              )}
            </div>
          </section>

          <ReviewsSection tutorId={tutor.id} />
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-4 rounded-md border border-line p-5 shadow-sm">
            <p className="text-3xl font-semibold text-brand-500">
              {formatPkr(tutor.hourlyRate)}
              <span className="text-sm font-normal text-muted"> / hour</span>
            </p>
            {action}
            <div className="flex items-center justify-between text-sm text-ink-soft">
              <span>Save for later</span>
              <ShortlistButton tutorId={tutor.id} className="border border-line" />
            </div>
            <dl className="space-y-2 border-t border-line pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Qualification</dt>
                <dd className="text-right font-medium">{tutor.qualification}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Experience</dt>
                <dd className="font-medium">{tutor.experienceYears} years</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      {user && isSeeker(user.role) && (
        <SendRequestModal tutor={tutor} open={open} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}
