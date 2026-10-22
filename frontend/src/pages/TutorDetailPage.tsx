import { ChevronRight, CircleCheck, Lock } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { ReviewsSection } from '@/components/tutors/ReviewsSection';
import { SendRequestModal } from '@/components/tutors/SendRequestModal';
import { VerifiedMark } from '@/components/tutors/StatusBadge';
import { ShortlistButton } from '@/components/tutors/TutorCard';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, RatingStars } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { EmptyState, LoadingBlock } from '@/components/ui/Feedback';
import { useGetTutorRequestStatusQuery } from '@/features/requests/requestsApi';
import { useGetTutorQuery } from '@/features/tutors/tutorsApi';
import { MODE_LABEL, formatPkr, isSeeker } from '@/lib/format';

function RequestButton({
  status,
  onSend,
}: {
  status: 'PENDING' | 'ACCEPTED' | null;
  onSend: () => void;
}) {
  if (status === 'PENDING') {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled
          className="flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-surface font-semibold text-muted"
        >
          <Lock className="size-4" /> Request sent
        </button>
        <p className="text-center text-xs text-muted">Waiting for the tutor to respond.</p>
      </div>
    );
  }
  if (status === 'ACCEPTED') {
    return (
      <div className="space-y-2">
        <Link to="/dashboard/requests" className={buttonClass('soft', 'lg', 'w-full text-success')}>
          <CircleCheck className="size-5" /> Request accepted
        </Link>
        <Button variant="ghost" className="w-full" onClick={onSend}>
          Send another request
        </Button>
      </div>
    );
  }
  return (
    <Button size="lg" className="w-full" onClick={onSend}>
      Send request
    </Button>
  );
}

export function TutorDetailPage() {
  const { id = '' } = useParams();
  const user = useAppSelector((s) => s.auth.user);
  const [open, setOpen] = useState(false);
  const { data: tutor, isLoading, isError } = useGetTutorQuery(id);
  const { data: requestStatus } = useGetTutorRequestStatusQuery(id, {
    skip: !isSeeker(user?.role),
  });

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
    <RequestButton status={requestStatus?.status ?? null} onSend={() => setOpen(true)} />
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
            <Avatar name={tutor.fullName} src={tutor.avatarUrl} size="xl" />
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
