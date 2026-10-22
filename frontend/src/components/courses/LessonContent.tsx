import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/cn';

/** Lesson text split on a line containing only "---" becomes a slide deck. */
export function LessonContent({ content }: { content: string }) {
  const slides = content
    .split(/^\s*---\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);
  const [index, setIndex] = useState(0);
  const current = Math.min(index, Math.max(slides.length - 1, 0));

  if (slides.length <= 1) {
    return (
      <div className="mt-5 rounded-md border border-line p-5 whitespace-pre-line text-ink-soft">
        {content}
      </div>
    );
  }

  return (
    <div className="mt-5 overflow-hidden rounded-md border border-line">
      <div key={current} className="animate-fade-up min-h-56 p-6 whitespace-pre-line text-ink-soft">
        {slides[current]}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-surface px-4 py-2">
        <button
          type="button"
          onClick={() => setIndex(current - 1)}
          disabled={current === 0}
          aria-label="Previous slide"
          className="rounded-md p-1.5 hover:bg-white disabled:opacity-30"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div
          className="flex items-center gap-1.5"
          aria-label={`Slide ${current + 1} of ${slides.length}`}
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                'h-2 rounded-full transition-all',
                i === current ? 'w-6 bg-brand-500' : 'w-2 bg-line hover:bg-muted',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIndex(current + 1)}
          disabled={current === slides.length - 1}
          aria-label="Next slide"
          className="rounded-md p-1.5 hover:bg-white disabled:opacity-30"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
