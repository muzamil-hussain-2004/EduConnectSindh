import { CheckCircle2, Circle, Clock, Lock } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { useAppSelector } from '@/app/hooks';
import {
  formatMinutes,
  LEVEL_LABEL,
  priceLabel,
  ProgressBar,
} from '@/components/courses/CourseCard';
import { Badge, RatingStars } from '@/components/ui/Badge';
import { Button, buttonClass } from '@/components/ui/Button';
import { ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import {
  useEnrollMutation,
  useGetCourseQuery,
  useGetEnrollmentQuery,
  useUnenrollMutation,
} from '@/features/courses/coursesApi';
import { isSeeker } from '@/lib/format';
import { getErrorMessage } from '@/services/api/baseApi';

export function CourseDetailPage() {
  const { id = '' } = useParams();
  const role = useAppSelector((s) => s.auth.user?.role);
  const signedIn = useAppSelector((s) => !!s.auth.user);
  const seeker = isSeeker(role);
  const { data: course, isLoading, isError } = useGetCourseQuery(id);
  const { data: enrollment } = useGetEnrollmentQuery(id, { skip: !seeker });
  const [enroll, { isLoading: enrolling }] = useEnrollMutation();
  const [unenroll, { isLoading: leaving }] = useUnenrollMutation();

  if (isLoading) return <LoadingBlock />;
  if (isError || !course) return <ErrorBlock message="This course is not available." />;

  const enrolled = enrollment?.enrolled ? enrollment : null;
  const firstLesson = course.lessons[0];

  const onEnroll = async () => {
    try {
      await enroll(id).unwrap();
      toast.success('You are enrolled. Happy learning!');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };
  const onLeave = async () => {
    if (!confirm('Leave this course? Your progress will be removed.')) return;
    try {
      await unenroll(id).unwrap();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_22rem]">
      <div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="brand">{course.subject.name}</Badge>
          <Badge>{LEVEL_LABEL[course.level]}</Badge>
        </div>
        <h1 className="mt-3 text-2xl font-semibold md:text-3xl">{course.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          <Link
            to={`/tutors/${course.tutor.id}`}
            className="font-medium text-ink hover:text-brand-500"
          >
            {course.tutor.fullName}
          </Link>
          <RatingStars value={course.tutor.ratingAvg ?? 0} />
          <span>{course.enrollmentCount} students</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-4" /> {formatMinutes(course.totalDurationMin)}
          </span>
        </div>

        <h2 className="mt-8 text-lg font-semibold">About this course</h2>
        <p className="mt-2 whitespace-pre-line text-ink-soft">{course.description}</p>

        <h2 className="mt-8 text-lg font-semibold">Lessons ({course.lessonCount})</h2>
        <ul className="mt-3 divide-y divide-line rounded-md border border-line">
          {course.lessons.map((l, i) => {
            const done = enrolled?.completedLessonIds.includes(l.id);
            const row = (
              <>
                {enrolled ? (
                  done ? (
                    <CheckCircle2 className="size-5 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-5 shrink-0 text-muted" />
                  )
                ) : (
                  <Lock className="size-4 shrink-0 text-muted" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {i + 1}. {l.title}
                </span>
                <span className="text-xs text-muted">{formatMinutes(l.durationMin)}</span>
              </>
            );
            return (
              <li key={l.id}>
                {enrolled ? (
                  <Link
                    to={`/courses/${id}/learn/${l.id}`}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface"
                  >
                    {row}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3 text-sm text-ink-soft">
                    {row}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <aside className="h-fit rounded-md border border-line p-5 lg:sticky lg:top-24">
        <p className="text-2xl font-semibold text-brand-500">{priceLabel(course.price)}</p>
        {enrolled ? (
          <div className="mt-4 space-y-3">
            <ProgressBar percent={enrolled.progress.percent} />
            <p className="text-sm text-muted">
              {enrolled.progress.completed} of {enrolled.progress.total} lessons completed
            </p>
            {firstLesson && (
              <Link
                to={`/courses/${id}/learn/${firstLesson.id}`}
                className={buttonClass('primary', 'md', 'w-full')}
              >
                Continue learning
              </Link>
            )}
            <Button variant="ghost" className="w-full" loading={leaving} onClick={onLeave}>
              Leave course
            </Button>
          </div>
        ) : seeker ? (
          <Button className="mt-4 w-full" loading={enrolling} onClick={onEnroll}>
            Enroll now
          </Button>
        ) : signedIn ? (
          <p className="mt-4 text-sm text-muted">Only students and parents can enroll.</p>
        ) : (
          <Link to="/login" className={buttonClass('primary', 'md', 'mt-4 w-full')}>
            Sign in to enroll
          </Link>
        )}
        <ul className="mt-5 space-y-2 text-sm text-ink-soft">
          <li>{course.lessonCount} lessons</li>
          <li>{LEVEL_LABEL[course.level]} level</li>
          <li>Lifetime access</li>
        </ul>
      </aside>
    </div>
  );
}
