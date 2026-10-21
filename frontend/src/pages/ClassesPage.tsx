import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { ClassCard } from '@/components/courses/ClassCard';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { useGetUpcomingClassesQuery } from '@/features/classes/classesApi';

export function ClassesPage() {
  const [sp, setSp] = useSearchParams();
  const [page, setPage] = useState(Number(sp.get('page') ?? 1));
  const { data, isLoading, isError } = useGetUpcomingClassesQuery({ page });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold md:text-3xl">Live classes</h1>
      <p className="mt-1 text-sm text-muted">Book a seat in upcoming online classes.</p>
      <div className="mt-6">
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorBlock />
        ) : data?.items.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((c) => (
              <ClassCard key={c.id} session={c} mode="browse" />
            ))}
          </div>
        ) : (
          <EmptyState title="No upcoming classes" text="Check back soon." />
        )}
        <Pagination
          meta={data?.meta}
          onPage={(p) => {
            setPage(p);
            setSp({ page: String(p) });
          }}
        />
      </div>
    </div>
  );
}
