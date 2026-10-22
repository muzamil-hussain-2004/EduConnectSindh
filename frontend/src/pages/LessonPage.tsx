import { CheckCircle2, ChevronLeft, ChevronRight, Circle, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import { ProgressBar } from '@/components/courses/CourseCard';
import { LessonContent } from '@/components/courses/LessonContent';
import { LessonMaterials } from '@/components/courses/LessonMaterials';
import { Button, buttonClass } from '@/components/ui/Button';
import { ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import {
  useGetCourseQuery,
  useGetEnrollmentQuery,
  useGetLessonQuery,
  useSetLessonDoneMutation,
} from '@/features/courses/coursesApi';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/services/api/baseApi';

export function LessonPage() {
  const { id = '', lessonId = '' } = useParams();
  const { data: course, isError: courseError } = useGetCourseQuery(id);
  const { data: enrollment } = useGetEnrollmentQuery(id);
  const {
    data: lesson,
    isLoading,
    isError,
  } = useGetLessonQuery({ courseId: id, lessonId }, { skip: !lessonId });
  const [setDone, { isLoading: saving }] = useSetLessonDoneMutation();

  if (courseError || isError) {
    return <ErrorBlock message="You need to be enrolled to open this lesson." />;
  }
  if (isLoading || !course || !lesson) return <LoadingBlock />;

  const enrolled = enrollment?.enrolled ? enrollment : null;
  const done = !!enrolled?.completedLessonIds.includes(lessonId);
  const index = course.lessons.findIndex((l) => l.id === lessonId);
  const prev = course.lessons[index - 1];
  const next = course.lessons[index + 1];

  const toggle = async () => {
    try {
      await setDone({ courseId: id, lessonId, done: !done }).unwrap();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-[1fr_20rem]">
      <article className="min-w-0">
        <Link to={`/courses/${id}`} className="text-sm text-muted hover:text-brand-500">
          ← {course.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{lesson.title}</h1>
        {lesson.videoUrl && (
          <a
            href={lesson.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass('soft', 'sm', 'mt-4')}
          >
            Watch video <ExternalLink className="size-4" />
          </a>
        )}
        <LessonContent key={lessonId} content={lesson.content} />
        <LessonMaterials
          key={`m-${lessonId}`}
          courseId={id}
          lessonId={lessonId}
          materials={lesson.materials}
        />

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {prev && (
              <Link to={`/courses/${id}/learn/${prev.id}`} className={buttonClass('ghost', 'sm')}>
                <ChevronLeft className="size-4" /> Previous
              </Link>
            )}
            {next && (
              <Link to={`/courses/${id}/learn/${next.id}`} className={buttonClass('ghost', 'sm')}>
                Next <ChevronRight className="size-4" />
              </Link>
            )}
          </div>
          {enrolled && (
            <Button variant={done ? 'soft' : 'primary'} loading={saving} onClick={toggle}>
              {done ? 'Completed ✓ (undo)' : 'Mark as complete'}
            </Button>
          )}
        </div>
      </article>

      <aside className="space-y-5">
        {enrolled && (
          <div className="rounded-md border border-line p-4">
            <p className="mb-2 text-sm font-medium">{enrolled.progress.percent}% complete</p>
            <ProgressBar percent={enrolled.progress.percent} />
          </div>
        )}
        <ul className="divide-y divide-line rounded-md border border-line">
          {course.lessons.map((l, i) => (
            <li key={l.id}>
              <Link
                to={`/courses/${id}/learn/${l.id}`}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm hover:bg-surface',
                  l.id === lessonId && 'bg-brand-50 font-medium text-brand-500',
                )}
              >
                {enrolled?.completedLessonIds.includes(l.id) ? (
                  <CheckCircle2 className="size-4 shrink-0 text-success" />
                ) : (
                  <Circle className="size-4 shrink-0 text-muted" />
                )}
                <span className="truncate">
                  {i + 1}. {l.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        {enrolled && <AssistantPanel courseId={id} lessonId={lessonId} />}
      </aside>
    </div>
  );
}
