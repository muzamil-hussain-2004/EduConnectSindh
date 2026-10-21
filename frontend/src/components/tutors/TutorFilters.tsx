import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useGetCitiesQuery, useGetSubjectsQuery } from '@/features/catalog/catalogApi';
import type { TutorSearchParams } from '@/features/tutors/tutorsApi';

export type Filters = Omit<TutorSearchParams, 'page' | 'limit' | 'sort' | 'q'>;

const num = (v: string) => (v === '' ? undefined : Number(v));

/** Local draft state; "Apply" pushes it to the URL so desktop and mobile share one code path. */
export function TutorFilters({
  value,
  onApply,
  onReset,
}: {
  value: Filters;
  onApply: (f: Filters) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState<Filters>(value);
  const { data: subjects = [] } = useGetSubjectsQuery();
  const { data: cities = [] } = useGetCitiesQuery();
  const areas = cities.flatMap((c) => c.areas);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(draft);
      }}
    >
      <Select
        label="Subject"
        value={draft.subjectId ?? ''}
        onChange={(e) => set('subjectId', e.target.value || undefined)}
      >
        <option value="">All subjects</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select
        label="Area"
        value={draft.areaId ?? ''}
        onChange={(e) => set('areaId', e.target.value || undefined)}
      >
        <option value="">All areas</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Select
        label="Teaching mode"
        value={draft.mode ?? ''}
        onChange={(e) => set('mode', (e.target.value || undefined) as Filters['mode'])}
      >
        <option value="">Any</option>
        <option value="HOME">At home</option>
        <option value="ONLINE">Online</option>
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Min rate (PKR)"
          type="number"
          min={0}
          value={draft.minRate ?? ''}
          onChange={(e) => set('minRate', num(e.target.value))}
        />
        <Input
          label="Max rate (PKR)"
          type="number"
          min={0}
          value={draft.maxRate ?? ''}
          onChange={(e) => set('maxRate', num(e.target.value))}
        />
      </div>
      <Select
        label="Minimum rating"
        value={draft.minRating ?? ''}
        onChange={(e) => set('minRating', num(e.target.value))}
      >
        <option value="">Any</option>
        {[4.5, 4, 3.5, 3].map((r) => (
          <option key={r} value={r}>
            {r} & up
          </option>
        ))}
      </Select>
      <Select
        label="Experience"
        value={draft.minExperience ?? ''}
        onChange={(e) => set('minExperience', num(e.target.value))}
      >
        <option value="">Any</option>
        {[1, 3, 5, 10].map((y) => (
          <option key={y} value={y}>
            {y}+ years
          </option>
        ))}
      </Select>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-brand-500"
          checked={!!draft.verifiedOnly}
          onChange={(e) => set('verifiedOnly', e.target.checked || undefined)}
        />
        Verified tutors only
      </label>
      <div className="flex gap-2 pt-2">
        <Button type="submit" className="flex-1">
          Apply
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setDraft({});
            onReset();
          }}
        >
          Reset
        </Button>
      </div>
    </form>
  );
}
