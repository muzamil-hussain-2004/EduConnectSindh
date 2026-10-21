import { SlidersHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { TutorCard } from '@/components/tutors/TutorCard';
import { TutorFilters, type Filters } from '@/components/tutors/TutorFilters';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorBlock, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { fieldClass } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/cn';
import { useSearchTutorsQuery, type TutorSearchParams } from '@/features/tutors/tutorsApi';

const SORTS: { value: NonNullable<TutorSearchParams['sort']>; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top rated' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'experience', label: 'Most experienced' },
];

const FILTER_KEYS = [
  'subjectId',
  'areaId',
  'mode',
  'minRate',
  'maxRate',
  'minRating',
  'minExperience',
  'verifiedOnly',
] as const;
const NUMERIC = new Set(['minRate', 'maxRate', 'minRating', 'minExperience']);

function readFilters(sp: URLSearchParams): Filters {
  const f: Record<string, string | number | boolean> = {};
  for (const k of FILTER_KEYS) {
    const v = sp.get(k);
    if (!v) continue;
    f[k] = NUMERIC.has(k) ? Number(v) : k === 'verifiedOnly' ? v === 'true' : v;
  }
  return f as Filters;
}

export function TutorsPage() {
  const [sp, setSp] = useSearchParams();
  const [sheet, setSheet] = useState(false);
  const filters = readFilters(sp);
  const q = sp.get('q') ?? '';
  const sort = (sp.get('sort') as TutorSearchParams['sort']) ?? 'newest';
  const page = Number(sp.get('page') ?? 1);
  const activeCount = Object.keys(filters).length;

  const { data, isFetching, isError } = useSearchTutorsQuery({
    ...filters,
    q: q || undefined,
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

  const applyFilters = (f: Filters) => {
    const patch: Record<string, string | undefined> = {};
    for (const k of FILTER_KEYS) patch[k] = f[k] === undefined ? undefined : String(f[k]);
    update(patch);
    setSheet(false);
  };
  const resetFilters = () => {
    applyFilters({});
  };

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    update({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() });
  };

  const filterKey = sp.toString();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-semibold md:text-3xl">Find a tutor</h1>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <form onSubmit={onSearch} className="flex flex-1 gap-2">
          <input
            key={q}
            name="q"
            defaultValue={q}
            placeholder="Search by name, subject or keyword"
            aria-label="Search tutors"
            className={`${fieldClass} h-11 flex-1`}
          />
          <Button type="submit">Search</Button>
        </form>
        <div className="flex gap-2">
          <Button variant="soft" className="lg:hidden" onClick={() => setSheet(true)}>
            <SlidersHorizontal className="size-4" /> Filter
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-xs text-white">
                {activeCount}
              </span>
            )}
          </Button>
          <select
            aria-label="Sort by"
            value={sort}
            onChange={(e) => update({ sort: e.target.value })}
            className={cn(fieldClass, 'h-11 w-auto min-w-0 flex-1 sm:flex-none')}
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="hidden lg:block">
          <div className="rounded-md border border-line p-5">
            <h2 className="mb-4 font-semibold">Filters</h2>
            <TutorFilters
              key={filterKey}
              value={filters}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </div>
        </aside>
        <section>
          {data?.meta && (
            <p className="mb-4 text-sm text-muted">
              <span className="font-semibold text-ink">{data.meta.total}</span> tutors found
            </p>
          )}
          {isError ? (
            <ErrorBlock />
          ) : !data && isFetching ? (
            <LoadingBlock />
          ) : data && data.items.length === 0 ? (
            <EmptyState
              title="No tutors match your filters"
              text="Try removing some filters or searching for a different subject."
              action={<Button onClick={resetFilters}>Clear filters</Button>}
            />
          ) : (
            <div
              className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${isFetching ? 'opacity-60' : ''}`}
            >
              {data?.items.map((t) => (
                <TutorCard key={t.id} tutor={t} />
              ))}
            </div>
          )}
          <Pagination meta={data?.meta} onPage={(p) => update({ page: String(p) })} />
        </section>
      </div>

      <Modal open={sheet} onClose={() => setSheet(false)} title="Filters" variant="sheet">
        <TutorFilters
          key={filterKey}
          value={filters}
          onApply={applyFilters}
          onReset={resetFilters}
        />
      </Modal>
    </div>
  );
}
