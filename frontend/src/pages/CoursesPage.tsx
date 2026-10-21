import { useSearchParams } from 'react-router';
import { CourseCard, LEVEL_LABEL } from '@/components/courses/CourseCard';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { fieldClass } from '@/components/ui/Input';
import { useGetSubjectsQuery } from '@/features/catalog/catalogApi';
import {
  useSearchCoursesQuery,
  type CourseLevel,
  type CourseSearchParams,
} from '@/features/courses/coursesApi';
import { cn } from '@/lib/cn';

const SORTS: { value: NonNullable<CourseSearchParams['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Most popular' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
];

export function CoursesPage() {
  const [sp, setSp] = useSearchParams();
  const { data: subjects } = useGetSubjectsQuery();
  const q = sp.get('q') ?? '';
  const subjectId = sp.get('subjectId') ?? '';
  const level = (sp.get('level') as CourseLevel | null) ?? undefined;
  const freeOnly = sp.get('freeOnly') === 'true';
  const sort = (sp.get('sort') as CourseSearchParams['sort']) ?? 'newest';
  const page = Number(sp.get('page') ?? 1);

  const { data, isFetching, isError } = useSearchCoursesQuery({
    q: q || undefined,
    subjectId: subjectId || undefined,
    level,
    freeOnly: freeOnly || undefined,
    sort,
    page,
    limit: 12,
  });

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setSp(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold md:text-3xl">Courses</h1>
      <p className="mt-1 text-sm text-muted">Learn at your own pace from verified local tutors.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() });
        }}
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_12rem_11rem_11rem_auto]"
      >
        <input
          key={q}
          name="q"
          defaultValue={q}
          aria-label="Search courses"
          placeholder="Search courses"
          className={cn(fieldClass, 'h-11 sm:col-span-2 lg:col-span-1')}
        />
        <select
          aria-label="Subject"
          value={subjectId}
          onChange={(e) => update({ subjectId: e.target.value })}
          className={cn(fieldClass, 'h-11')}
        >
          <option value="">All subjects</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Level"
          value={level ?? ''}
          onChange={(e) => update({ level: e.target.value })}
          className={cn(fieldClass, 'h-11')}
        >
          <option value="">All levels</option>
          {Object.entries(LEVEL_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort by"
          value={sort}
          onChange={(e) => update({ sort: e.target.value })}
          className={cn(fieldClass, 'h-11')}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="flex h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={freeOnly}
            onChange={(e) => update({ freeOnly: e.target.checked ? 'true' : undefined })}
            className="size-4 accent-brand-500"
          />
          Free only
        </label>
      </form>

      <section className="mt-6">
        {data?.meta && (
          <p className="mb-4 text-sm text-muted">
            <span className="font-semibold text-ink">{data.meta.total}</span> courses found
          </p>
        )}
        {isError ? (
          <ErrorBlock />
        ) : !data && isFetching ? (
          <LoadingBlock />
        ) : data && data.items.length === 0 ? (
          <EmptyState
            title="No courses found"
            text="Try a different search or remove some filters."
          />
        ) : (
          <div
            className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${isFetching ? 'opacity-60' : ''}`}
          >
            {data?.items.map((c) => (
              <CourseCard key={c.id} course={c} />
            ))}
          </div>
        )}
        <Pagination meta={data?.meta} onPage={(p) => update({ page: String(p) })} />
      </section>
    </div>
  );
}
