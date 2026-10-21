import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { ClassCard } from '@/components/courses/ClassCard';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useTutorVerified, VerificationNotice } from '@/components/tutors/VerificationNotice';
import { useCreateClassMutation, useGetMyClassesQuery } from '@/features/classes/classesApi';
import { useGetMyCoursesQuery } from '@/features/courses/coursesApi';
import { getErrorMessage, getFieldErrors } from '@/services/api/baseApi';
import { PageHeader } from './PageHeader';

function ScheduleModal({ onClose }: { onClose: () => void }) {
  const { data: courses } = useGetMyCoursesQuery();
  const [create, { isLoading }] = useCreateClassMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    startsAt: '',
    durationMin: '60',
    meetingUrl: '',
    capacity: '30',
    courseId: '',
  });
  const set = (k: keyof typeof draft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      await create({
        title: draft.title,
        description: draft.description,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : '',
        durationMin: Number(draft.durationMin) || 60,
        meetingUrl: draft.meetingUrl,
        capacity: Number(draft.capacity) || 1,
        courseId: draft.courseId || null,
      }).unwrap();
      toast.success('Class scheduled');
      onClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Modal open onClose={onClose} title="Schedule a class">
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Title" value={draft.title} onChange={set('title')} error={errors.title} />
        <Textarea
          label="Description (optional)"
          value={draft.description}
          onChange={set('description')}
          className="min-h-20"
        />
        <Input
          label="Starts at"
          type="datetime-local"
          value={draft.startsAt}
          onChange={set('startsAt')}
          error={errors.startsAt}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Duration (min)"
            type="number"
            value={draft.durationMin}
            onChange={set('durationMin')}
            error={errors.durationMin}
          />
          <Input
            label="Seats"
            type="number"
            value={draft.capacity}
            onChange={set('capacity')}
            error={errors.capacity}
          />
        </div>
        <Input
          label="Meeting link (https)"
          placeholder="https://meet.google.com/..."
          value={draft.meetingUrl}
          onChange={set('meetingUrl')}
          error={errors.meetingUrl}
        />
        <Select label="Linked course (optional)" value={draft.courseId} onChange={set('courseId')}>
          <option value="">No course</option>
          {courses?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
        <Button type="submit" loading={isLoading} className="w-full">
          Schedule
        </Button>
      </form>
    </Modal>
  );
}

export function TutorClassesPage() {
  const { data, isLoading, isError } = useGetMyClassesQuery();
  const { verified, status, isLoading: checking } = useTutorVerified();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Live classes"
        text="Schedule online classes and share the meeting link with booked students only."
        action={
          <Button size="sm" disabled={!verified} onClick={() => setOpen(true)}>
            Schedule class
          </Button>
        }
      />
      {!checking && !verified && <VerificationNotice status={status} />}
      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock />
      ) : data?.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <ClassCard key={c.id} session={c} mode="manage" />
          ))}
        </div>
      ) : (
        <EmptyState title="No classes yet" text="Schedule your first live class." />
      )}
      {open && <ScheduleModal onClose={() => setOpen(false)} />}
    </>
  );
}
