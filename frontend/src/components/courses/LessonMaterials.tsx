import { FileText, Image as ImageIcon, Presentation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { store } from '@/app/store';
import { env } from '@/config/env';
import type { LessonMaterial } from '@/features/courses/coursesApi';
import { cn } from '@/lib/cn';

/** Material files need the access token, so they are fetched and shown from a blob URL. */
function useMaterialBlob(courseId: string, lessonId: string, material: LessonMaterial) {
  const [state, setState] = useState<{ url?: string; error?: boolean }>({});
  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    setState({});
    fetch(`${env.apiUrl}/courses/${courseId}/lessons/${lessonId}/materials/${material.id}/file`, {
      headers: { Authorization: `Bearer ${store.getState().auth.accessToken ?? ''}` },
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error('failed');
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl });
      })
      .catch(() => !cancelled && setState({ error: true }));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [courseId, lessonId, material.id]);
  return state;
}

function Viewer({
  courseId,
  lessonId,
  material,
}: {
  courseId: string;
  lessonId: string;
  material: LessonMaterial;
}) {
  const { url, error } = useMaterialBlob(courseId, lessonId, material);
  const [text, setText] = useState<string | null>(null);
  const isText = material.mimeType === 'text/plain';

  useEffect(() => {
    setText(null);
    if (url && isText)
      void fetch(url)
        .then((r) => r.text())
        .then(setText);
  }, [url, isText]);

  if (error) return <p className="p-6 text-sm text-danger">Could not load this file.</p>;
  if (!url) return <div className="h-96 animate-pulse rounded-md bg-surface" />;
  if (material.mimeType.startsWith('image/')) {
    return (
      <img
        src={url}
        alt={material.originalName}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        className="mx-auto max-h-[70vh] rounded-md"
      />
    );
  }
  if (isText) {
    return (
      <pre className="max-h-[70vh] overflow-auto rounded-md bg-surface p-4 text-sm whitespace-pre-wrap">
        {text ?? 'Loading...'}
      </pre>
    );
  }
  // The viewer toolbar is hidden: learners read the slides here and are not offered a download.
  return (
    <iframe
      title={material.originalName}
      src={`${url}#toolbar=0&navpanes=0`}
      className="h-[70vh] w-full rounded-md border border-line"
    />
  );
}

const iconOf = (m: LessonMaterial) =>
  m.mimeType === 'application/pdf'
    ? Presentation
    : m.mimeType.startsWith('image/')
      ? ImageIcon
      : FileText;

/** Read-only slides and handouts for a lesson. */
export function LessonMaterials({
  courseId,
  lessonId,
  materials,
}: {
  courseId: string;
  lessonId: string;
  materials: LessonMaterial[];
}) {
  const [activeId, setActiveId] = useState(materials[0]?.id);
  const active = materials.find((m) => m.id === activeId) ?? materials[0];
  if (!active) return null;

  return (
    <section className="animate-fade-up mt-6 space-y-3">
      <h2 className="text-lg font-semibold">Slides &amp; materials</h2>
      {materials.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {materials.map((m) => {
            const Icon = iconOf(m);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveId(m.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition',
                  m.id === active.id
                    ? 'border-brand-500 bg-brand-100 text-brand-500'
                    : 'border-line text-ink-soft hover:bg-surface',
                )}
              >
                <Icon className="size-4" /> {m.originalName}
              </button>
            );
          })}
        </div>
      )}
      <Viewer key={active.id} courseId={courseId} lessonId={lessonId} material={active} />
    </section>
  );
}
