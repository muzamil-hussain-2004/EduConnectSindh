import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { LoadingBlock } from '@/components/ui/Feedback';
import { useGetCitiesQuery, useGetSubjectsQuery } from '@/features/catalog/catalogApi';
import {
  useGetMyTutorProfileQuery,
  useSaveMyTutorProfileMutation,
  type TutorProfileInput,
} from '@/features/tutors/tutorsApi';
import { getErrorMessage, getFieldErrors } from '@/services/api/baseApi';
import type { TutorProfile } from '@/types/api';
import { PageHeader } from './PageHeader';

type Draft = Omit<TutorProfileInput, 'experienceYears' | 'hourlyRate'> & {
  experienceYears: string;
  hourlyRate: string;
};

const fromProfile = (p?: TutorProfile): Draft => ({
  headline: p?.headline ?? '',
  bio: p?.bio ?? '',
  qualification: p?.qualification ?? '',
  experienceYears: String(p?.experienceYears ?? 0),
  hourlyRate: String(p?.hourlyRate ?? ''),
  teachingMode: p?.teachingMode ?? 'BOTH',
  subjectIds: p?.subjects.map((s) => s.id) ?? [],
  areaIds: p?.areas.map((a) => a.id) ?? [],
  isPublished: p?.isPublished ?? false,
});

function Checklist({
  label,
  options,
  selected,
  onChange,
  error,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.id}
            className="cursor-pointer rounded-md border border-line px-3 py-1.5 text-sm has-checked:border-brand-500 has-checked:bg-brand-100 has-checked:text-brand-500"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={selected.includes(o.id)}
              onChange={() => toggle(o.id)}
            />
            {o.name}
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function ProfileForm({ profile }: { profile?: TutorProfile }) {
  const [draft, setDraft] = useState<Draft>(() => fromProfile(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [save, { isLoading }] = useSaveMyTutorProfileMutation();
  const { data: subjects = [] } = useGetSubjectsQuery();
  const { data: cities = [] } = useGetCitiesQuery();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      await save({
        ...draft,
        experienceYears: Number(draft.experienceYears),
        hourlyRate: Number(draft.hourlyRate),
      }).unwrap();
      toast.success('Profile saved');
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length) setErrors(fields as Record<string, string>);
      else toast.error(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-5" noValidate>
      <Input
        label="Headline"
        placeholder="e.g. Experienced maths & physics teacher"
        value={draft.headline}
        onChange={(e) => set('headline', e.target.value)}
        error={errors.headline}
      />
      <Textarea
        label="About you"
        value={draft.bio}
        onChange={(e) => set('bio', e.target.value)}
        error={errors.bio}
      />
      <Input
        label="Qualification"
        value={draft.qualification}
        onChange={(e) => set('qualification', e.target.value)}
        error={errors.qualification}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Experience (years)"
          type="number"
          min={0}
          value={draft.experienceYears}
          onChange={(e) => set('experienceYears', e.target.value)}
          error={errors.experienceYears}
        />
        <Input
          label="Hourly rate (PKR)"
          type="number"
          min={100}
          value={draft.hourlyRate}
          onChange={(e) => set('hourlyRate', e.target.value)}
          error={errors.hourlyRate}
        />
        <Select
          label="Teaching mode"
          value={draft.teachingMode}
          onChange={(e) => set('teachingMode', e.target.value as Draft['teachingMode'])}
        >
          <option value="BOTH">Home & online</option>
          <option value="HOME">At home</option>
          <option value="ONLINE">Online</option>
        </Select>
      </div>
      <Checklist
        label="Subjects"
        options={subjects}
        selected={draft.subjectIds}
        onChange={(ids) => set('subjectIds', ids)}
        error={errors.subjectIds}
      />
      {draft.teachingMode !== 'ONLINE' && (
        <Checklist
          label="Areas you travel to"
          options={cities.flatMap((c) => c.areas)}
          selected={draft.areaIds}
          onChange={(ids) => set('areaIds', ids)}
          error={errors.areaIds}
        />
      )}
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-brand-500"
          checked={draft.isPublished}
          onChange={(e) => set('isPublished', e.target.checked)}
        />
        Publish my profile so students can find me
      </label>
      <Button type="submit" loading={isLoading}>
        Save profile
      </Button>
    </form>
  );
}

export function TutorProfilePage() {
  const { data, isLoading, isError } = useGetMyTutorProfileQuery();
  return (
    <>
      <PageHeader
        title="My tutor profile"
        text={
          isError || !data
            ? 'Create your profile to start receiving requests.'
            : data.isPublished
              ? 'Your profile is live.'
              : 'Your profile is a draft and not visible to students.'
        }
      />
      {isLoading ? <LoadingBlock /> : <ProfileForm key={data?.updatedAt ?? 'new'} profile={data} />}
    </>
  );
}
