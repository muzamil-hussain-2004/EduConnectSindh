import { Link } from 'react-router';
import { CourseCard, ProgressBar } from '@/components/courses/CourseCard';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { useGetMyEnrollmentsQuery } from '@/features/courses/coursesApi';
import { PageHeader } from './PageHeader';

export function MyLearningPage() {
  const { data, isLoading, isError } = useGetMyEnrollmentsQuery();
  return (
    <>
      <PageHeader title="My learning" text="Courses you are enrolled in." />
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.items.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((e) => {
            const first = e.course.lessons[0];
            return (
              <div key={e.course.id} className="space-y-2">
                <CourseCard
                  course={e.course}
                  to={first ? `/courses/${e.course.id}/learn/${first.id}` : undefined}
                />
                <ProgressBar percent={e.progress.percent} />
                <p className="text-xs text-muted">
                  {e.progress.completed}/{e.progress.total} lessons · {e.progress.percent}%
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="You haven't enrolled in anything yet"
          text="Browse courses and start learning."
          action={
            <Link to="/courses" className={buttonClass('primary')}>
              Browse courses
            </Link>
          }
        />
      )}
    </>
  );
}
