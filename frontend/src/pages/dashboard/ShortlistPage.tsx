import { Link } from 'react-router';
import { TutorCard } from '@/components/tutors/TutorCard';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { useGetShortlistQuery } from '@/features/requests/requestsApi';
import { PageHeader } from './PageHeader';

export function ShortlistPage() {
  const { data, isLoading, isError } = useGetShortlistQuery();
  return (
    <>
      <PageHeader title="Shortlist" text="Tutors you saved to compare later." />
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((i) => (
            <TutorCard key={i.tutor.id} tutor={i.tutor} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nothing saved yet"
          text="Tap the heart on a tutor to save them here."
          action={
            <Link to="/tutors" className={buttonClass('primary')}>
              Browse tutors
            </Link>
          }
        />
      )}
    </>
  );
}
