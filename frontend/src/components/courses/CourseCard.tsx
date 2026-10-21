import { Clock, PlayCircle, Users } from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/Badge';
import type { Course, CourseLevel } from '@/features/courses/coursesApi';
import { formatPkr } from '@/lib/format';

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  BEGINNER: 'Beginner',
  INTERMEDIATE: 'Intermediate',
  ADVANCED: 'Advanced',
};

export const priceLabel = (price: number) => (price === 0 ? 'Free' : formatPkr(price));

export const formatMinutes = (min: number) =>
  min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`;

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-2 w-full overflow-hidden rounded-full bg-brand-100"
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export function CourseCard({ course, to }: { course: Course; to?: string }) {
  return (
    <article className="relative flex flex-col rounded-md border border-line bg-white p-4 transition hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <Badge tone="brand">{course.subject.name}</Badge>
        <Badge>{LEVEL_LABEL[course.level]}</Badge>
      </div>
      <Link
        to={to ?? `/courses/${course.id}`}
        className="mt-3 line-clamp-2 min-h-12 font-semibold after:absolute after:inset-0 hover:text-brand-500"
      >
        {course.title}
      </Link>
      <p className="mt-1 truncate text-xs text-muted">by {course.tutor.fullName}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <PlayCircle className="size-3.5" /> {course.lessonCount} lessons
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" /> {formatMinutes(course.totalDurationMin)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" /> {course.enrollmentCount}
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <Badge tone={course.status === 'PUBLISHED' ? 'success' : 'warning'}>
          {course.status === 'PUBLISHED' ? 'Published' : 'Draft'}
        </Badge>
        <p className="font-semibold text-brand-500">{priceLabel(course.price)}</p>
      </div>
    </article>
  );
}
