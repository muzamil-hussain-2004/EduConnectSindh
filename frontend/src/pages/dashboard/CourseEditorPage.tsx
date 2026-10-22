import { Pencil, Trash2, Upload } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { LEVEL_LABEL } from '@/components/courses/CourseCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBlock, LoadingBlock } from '@/components/ui/Feedback';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useGetSubjectsQuery } from '@/features/catalog/catalogApi';
import {
  useAddLessonMutation,
  useCreateCourseMutation,
  useDeleteCourseMutation,
  useDeleteLessonMutation,
  useDeleteMaterialMutation,
  useGetCourseManageQuery,
  useSetCoursePublishedMutation,
  useUpdateCourseMutation,
  useUpdateLessonMutation,
  useUploadMaterialMutation,
  type CourseLevel,
  type CourseManage,
  type LessonFull,
} from '@/features/courses/coursesApi';
import { getErrorMessage, getFieldErrors } from '@/services/api/baseApi';
import { PageHeader } from './PageHeader';

function CourseForm({ course }: { course?: CourseManage }) {
  const navigate = useNavigate();
  const { data: subjects } = useGetSubjectsQuery();
  const [create, { isLoading: creating }] = useCreateCourseMutation();
  const [update, { isLoading: updating }] = useUpdateCourseMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({
    title: course?.title ?? '',
    description: course?.description ?? '',
    subjectId: course?.subject.id ?? '',
    level: (course?.level ?? 'BEGINNER') as CourseLevel,
    price: String(course?.price ?? 0),
  });
  const set = (k: keyof typeof draft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const body = { ...draft, price: Number(draft.price) || 0 };
    try {
      if (course) {
        await update({ id: course.id, body }).unwrap();
        toast.success('Course saved');
      } else {
        const created = await create(body).unwrap();
        toast.success('Draft created. Now add lessons.');
        navigate(`/dashboard/courses/${created.id}`, { replace: true });
      }
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border border-line p-5">
      <Input label="Title" value={draft.title} onChange={set('title')} error={errors.title} />
      <Textarea
        label="Description"
        value={draft.description}
        onChange={set('description')}
        error={errors.description}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Select
          label="Subject"
          value={draft.subjectId}
          onChange={set('subjectId')}
          error={errors.subjectId}
        >
          <option value="">Choose…</option>
          {subjects?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <Select label="Level" value={draft.level} onChange={set('level')}>
          {Object.entries(LEVEL_LABEL).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Input
          label="Price (PKR, 0 = free)"
          type="number"
          min={0}
          value={draft.price}
          onChange={set('price')}
          error={errors.price}
        />
      </div>
      <Button type="submit" loading={creating || updating}>
        {course ? 'Save changes' : 'Create draft'}
      </Button>
    </form>
  );
}

function MaterialsEditor({ courseId, lesson }: { courseId: string; lesson: LessonFull }) {
  const [upload, { isLoading }] = useUploadMaterialMutation();
  const [remove] = useDeleteMaterialMutation();

  const onPick = async (file?: File) => {
    if (!file) return;
    try {
      await upload({ courseId, lessonId: lesson.id, file }).unwrap();
      toast.success('File attached');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="mt-5 space-y-2 border-t border-line pt-4">
      <p className="text-sm font-semibold">Slides &amp; materials</p>
      <p className="text-xs text-muted">
        PDF, JPG/PNG or .txt up to 15 MB. Export PowerPoint to PDF. Only enrolled students can read
        them, and the AI assistant answers from the text in your PDFs.
      </p>
      <ul className="space-y-1">
        {lesson.materials.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-sm"
          >
            <span className="truncate">{m.originalName}</span>
            <button
              type="button"
              aria-label={`Remove ${m.originalName}`}
              className="text-muted hover:text-danger"
              onClick={() =>
                remove({ courseId, lessonId: lesson.id, materialId: m.id })
                  .unwrap()
                  .catch((e) => toast.error(getErrorMessage(e)))
              }
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line px-3 py-2 text-sm hover:bg-surface">
        <Upload className="size-4" /> {isLoading ? 'Uploading...' : 'Attach a file'}
        <input
          type="file"
          hidden
          accept="application/pdf,image/png,image/jpeg,.txt,.md"
          disabled={isLoading}
          onChange={(e) => {
            void onPick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
    </div>
  );
}

function LessonModal({
  courseId,
  lesson,
  open,
  onClose,
}: {
  courseId: string;
  lesson?: LessonFull;
  open: boolean;
  onClose: () => void;
}) {
  const [add, { isLoading: adding }] = useAddLessonMutation();
  const [edit, { isLoading: editing }] = useUpdateLessonMutation();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({
    title: lesson?.title ?? '',
    content: lesson?.content ?? '',
    videoUrl: lesson?.videoUrl ?? '',
    durationMin: String(lesson?.durationMin ?? 10),
  });
  const set = (k: keyof typeof draft) => (e: { target: { value: string } }) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    const body = {
      title: draft.title,
      content: draft.content,
      videoUrl: draft.videoUrl.trim() || undefined,
      durationMin: Number(draft.durationMin) || 1,
    };
    try {
      if (lesson) await edit({ courseId, lessonId: lesson.id, body }).unwrap();
      else await add({ courseId, body }).unwrap();
      onClose();
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={lesson ? 'Edit lesson' : 'Add lesson'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <Input label="Title" value={draft.title} onChange={set('title')} error={errors.title} />
        <Textarea
          label="Content"
          value={draft.content}
          onChange={set('content')}
          error={errors.content}
        />
        <Input
          label="Video link (https, optional)"
          value={draft.videoUrl}
          onChange={set('videoUrl')}
          error={errors.videoUrl}
        />
        <Input
          label="Duration (minutes)"
          type="number"
          min={1}
          value={draft.durationMin}
          onChange={set('durationMin')}
          error={errors.durationMin}
        />
        <Button type="submit" loading={adding || editing} className="w-full">
          Save lesson
        </Button>
      </form>
      {lesson ? (
        <MaterialsEditor courseId={courseId} lesson={lesson} />
      ) : (
        <p className="mt-4 rounded-md bg-surface p-3 text-xs text-muted">
          Save the lesson first, then edit it to attach slides (PDF) and handouts.
        </p>
      )}
    </Modal>
  );
}

function Builder({ course }: { course: CourseManage }) {
  const navigate = useNavigate();
  const [modal, setModal] = useState<{ lesson?: LessonFull } | null>(null);
  const [publish, { isLoading: publishing }] = useSetCoursePublishedMutation();
  const [removeLesson] = useDeleteLessonMutation();
  const [removeCourse] = useDeleteCourseMutation();
  const published = course.status === 'PUBLISHED';

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast.success(ok);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title={course.title}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={published ? 'success' : 'warning'}>
              {published ? 'Published' : 'Draft'}
            </Badge>
            <Button
              size="sm"
              variant={published ? 'outline' : 'primary'}
              loading={publishing}
              onClick={() =>
                run(
                  () => publish({ id: course.id, publish: !published }).unwrap(),
                  published ? 'Moved to drafts' : 'Course published',
                )
              }
            >
              {published ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        }
      />
      <CourseForm course={course} />

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Lessons ({course.lessons.length})</h2>
        <Button size="sm" variant="soft" onClick={() => setModal({})}>
          Add lesson
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-line rounded-md border border-line">
        {course.lessons.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-muted">No lessons yet.</li>
        )}
        {course.lessons.map((l, i) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1 truncate">
              {i + 1}. {l.title}
            </span>
            <span className="text-xs text-muted">{l.durationMin}m</span>
            <button aria-label="Edit lesson" onClick={() => setModal({ lesson: l })}>
              <Pencil className="size-4 text-ink-soft" />
            </button>
            <button
              aria-label="Delete lesson"
              onClick={() =>
                confirm('Delete this lesson?') &&
                run(() => removeLesson({ courseId: course.id, lessonId: l.id }).unwrap())
              }
            >
              <Trash2 className="size-4 text-danger" />
            </button>
          </li>
        ))}
      </ul>

      <Button
        variant="danger"
        size="sm"
        className="mt-8"
        onClick={() =>
          confirm('Delete this course permanently?') &&
          run(async () => {
            await removeCourse(course.id).unwrap();
            navigate('/dashboard/courses');
          })
        }
      >
        Delete course
      </Button>

      {modal && (
        <LessonModal
          key={modal.lesson?.id ?? 'new'}
          courseId={course.id}
          lesson={course.lessons.find((l) => l.id === modal.lesson?.id) ?? modal.lesson}
          open
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

export function CourseEditorPage() {
  const { id } = useParams();
  const { data, isLoading, isError } = useGetCourseManageQuery(id ?? '', { skip: !id });

  if (!id) {
    return (
      <>
        <PageHeader title="New course" text="Start with the basics. You can add lessons next." />
        <CourseForm />
      </>
    );
  }
  if (isLoading) return <LoadingBlock />;
  if (isError || !data) return <ErrorBlock message="Course not found." />;
  return <Builder key={data.id} course={data} />;
}
