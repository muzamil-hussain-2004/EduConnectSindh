import { Link } from 'react-router';
import { CourseCard } from '@/components/courses/CourseCard';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { useGetMyCoursesQuery } from '@/features/courses/coursesApi';
import { PageHeader } from './PageHeader';

export function MyCoursesPage() {
  const { data, isLoading, isError } = useGetMyCoursesQuery();
  return (
    <>
      <PageHeader
        title="My courses"
        text="Build lessons, publish when ready, and watch students enroll."
        action={
          <Link to="/dashboard/courses/new" className={buttonClass('primary', 'sm')}>
            New course
          </Link>
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <CourseCard key={c.id} course={c} to={`/dashboard/courses/${c.id}`} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No courses yet"
          text="Create your first course. You need your tutor profile first."
        />
      )}
    </>
  );
}
