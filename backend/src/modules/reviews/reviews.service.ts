import { AppError } from '../../shared/errors/AppError';
import { notificationsService } from '../notifications/notifications.service';
import { searchCache } from '../search/search.cache';
import { reviewsRepository } from './reviews.repository';
import type { AdminListQuery, ListReviewsQuery, ReviewInput } from './reviews.schema';

type ReviewRow = NonNullable<Awaited<ReturnType<typeof reviewsRepository.moderate>>>;

// moderationNote is only for admins and the author, never for the public list.
const toPublic = (r: ReviewRow) => ({
  id: r.id,
  rating: r.rating,
  comment: r.comment,
  authorName: r.author.fullName,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

const toAdmin = (r: ReviewRow) => ({
  ...toPublic(r),
  tutorId: r.tutorProfileId,
  status: r.status,
  moderationNote: r.moderationNote,
});

const meta = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

async function requirePublicTutor(tutorId: string) {
  const tutor = await reviewsRepository.findTutor(tutorId);
  if (!tutor || !tutor.isPublished || tutor.user.status !== 'ACTIVE') {
    throw AppError.notFound('Tutor not found');
  }
  return tutor;
}

export const reviewsService = {
  async listForTutor(tutorId: string, { page, limit }: ListReviewsQuery) {
    await requirePublicTutor(tutorId);
    const { items, total } = await reviewsRepository.listVisible(tutorId, page, limit);
    return { items: items.map(toPublic), meta: meta(page, limit, total) };
  },

  async saveMine(authorId: string, tutorId: string, input: ReviewInput) {
    const tutor = await requirePublicTutor(tutorId);
    if (!(await reviewsRepository.hasAcceptedRequest(authorId, tutorId))) {
      throw AppError.forbidden('You can review a tutor only after they accepted your request');
    }
    const isNew = !(await reviewsRepository.findMine(authorId, tutorId));
    const review = await reviewsRepository.upsert(authorId, tutorId, input);
    await searchCache.invalidate();
    // Edits do not notify again, only the first review does.
    if (isNew) {
      await notificationsService.notify({
        userId: tutor.userId,
        type: 'REVIEW_RECEIVED',
        title: 'New review',
        body: `${review.author.fullName} rated you ${input.rating}/5.`,
        data: { reviewId: review.id },
      });
    }
    return toPublic(review);
  },

  async deleteMine(authorId: string, tutorId: string) {
    if ((await reviewsRepository.deleteMine(authorId, tutorId)) === 0) {
      throw AppError.notFound('Review not found');
    }
    await searchCache.invalidate();
  },

  async listAll(query: AdminListQuery) {
    const { items, total } = await reviewsRepository.listAll(query.status, query.page, query.limit);
    return { items: items.map(toAdmin), meta: meta(query.page, query.limit, total) };
  },

  async moderate(id: string, status: 'VISIBLE' | 'HIDDEN', note?: string) {
    const review = await reviewsRepository.moderate(id, status, note ?? null);
    if (!review) throw AppError.notFound('Review not found');
    await searchCache.invalidate();
    return toAdmin(review);
  },
};
