import { Star } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { EmptyState, LoadingBlock, Pagination } from '@/components/ui/Feedback';
import { RatingStars } from '@/components/ui/Badge';
import { useGetMyRequestsQuery } from '@/features/requests/requestsApi';
import { useGetTutorReviewsQuery, useSaveReviewMutation } from '@/features/tutors/tutorsApi';
import { cn } from '@/lib/cn';
import { formatDate, isSeeker } from '@/lib/format';
import { getErrorMessage } from '@/services/api/baseApi';

function ReviewForm({ tutorId }: { tutorId: string }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [save, { isLoading }] = useSaveReviewMutation();

  const submit = async () => {
    if (!rating) return toast.error('Choose a star rating');
    if (comment.trim().length < 10) return toast.error('Write at least 10 characters');
    try {
      await save({ id: tutorId, rating, comment: comment.trim() }).unwrap();
      toast.success('Review saved');
      setComment('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-3 rounded-md bg-surface p-4">
      <p className="font-semibold">Write a review</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)}
          >
            <Star
              className={cn('size-7', n <= rating ? 'fill-warning text-warning' : 'text-line')}
            />
          </button>
        ))}
      </div>
      <Textarea
        aria-label="Your review"
        placeholder="Share your experience"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <Button onClick={submit} loading={isLoading}>
        Submit review
      </Button>
    </div>
  );
}

export function ReviewsSection({ tutorId }: { tutorId: string }) {
  const [page, setPage] = useState(1);
  const role = useAppSelector((s) => s.auth.user?.role);
  const seeker = isSeeker(role);
  const { data, isLoading } = useGetTutorReviewsQuery({ id: tutorId, page });
  const { data: accepted } = useGetMyRequestsQuery({ status: 'ACCEPTED' }, { skip: !seeker });
  const canReview = !!accepted?.items.some((r) => r.tutorId === tutorId);

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Reviews</h2>
      {canReview && <ReviewForm tutorId={tutorId} />}
      {isLoading ? (
        <LoadingBlock />
      ) : data?.items.length ? (
        <ul className="divide-y divide-line">
          {data.items.map((r) => (
            <li key={r.id} className="py-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{r.authorName}</p>
                <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
              </div>
              <RatingStars value={r.rating} />
              <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No reviews yet"
          text="Reviews can be left after a tutor has accepted your request."
        />
      )}
      <Pagination meta={data?.meta} onPage={setPage} />
    </section>
  );
}
