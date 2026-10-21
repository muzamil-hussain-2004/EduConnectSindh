import { Bot, Send } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAskAssistantMutation } from '@/features/assistant/assistantApi';
import type { AssistantAnswer } from '@/features/assistant/assistantApi';
import { getErrorMessage } from '@/services/api/baseApi';

interface Turn {
  question: string;
  reply: AssistantAnswer;
}

export function AssistantPanel({ courseId, lessonId }: { courseId: string; lessonId?: string }) {
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [ask, { isLoading }] = useAskAssistantMutation();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3) return;
    try {
      const reply = await ask({ courseId, question: q, lessonId }).unwrap();
      setTurns((t) => [...t, { question: q, reply }]);
      setQuestion('');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <section className="rounded-xl border border-line bg-white p-4" aria-label="Study assistant">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <Bot className="h-4 w-4 text-brand-600" /> Study assistant
      </h2>
      <p className="mb-3 text-xs text-muted">Answers come only from this course&apos;s lessons.</p>

      <div className="mb-3 max-h-80 space-y-3 overflow-y-auto">
        {turns.map((t, i) => (
          <div key={i} className="space-y-1.5 text-sm">
            <p className="ml-auto w-fit max-w-[90%] rounded-lg bg-brand-50 px-3 py-2">
              {t.question}
            </p>
            <div className="rounded-lg bg-surface px-3 py-2">
              <p className="whitespace-pre-line">{t.reply.answer}</p>
              {t.reply.sources.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Sources:{' '}
                  {t.reply.sources.map((s, j) => (
                    <span key={s.lessonId}>
                      {j > 0 && ', '}
                      <Link
                        to={`/courses/${courseId}/lessons/${s.lessonId}`}
                        className="text-brand-600 hover:underline"
                      >
                        {s.title}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </div>
          </div>
        ))}
        {isLoading && <p className="text-sm text-muted">Thinking…</p>}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this lesson…"
          maxLength={500}
          aria-label="Your question"
        />
        <Button type="submit" disabled={isLoading || question.trim().length < 3} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </section>
  );
}
