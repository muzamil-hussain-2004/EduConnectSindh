import { Link } from 'react-router';
import { ClassCard } from '@/components/courses/ClassCard';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { useGetBookedClassesQuery } from '@/features/classes/classesApi';
import { PageHeader } from './PageHeader';

export function MyClassesPage() {
  const { data, isLoading, isError } = useGetBookedClassesQuery();
  return (
    <>
      <PageHeader title="My classes" text="Live classes you booked." />
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <ClassCard key={c.id} session={c} mode="booked" />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No upcoming classes"
          text="Browse live classes and book a seat."
          action={
            <Link to="/classes" className={buttonClass('primary')}>
              Browse classes
            </Link>
          }
        />
      )}
    </>
  );
}
