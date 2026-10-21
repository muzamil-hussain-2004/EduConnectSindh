import { prisma } from '../../config/database';
import { searchCache } from './search.cache';
import type { RecommendQuery } from './search.schema';

const CACHE_TTL_SECONDS = 60;
const CANDIDATE_LIMIT = 100;

// Points add up to 100. Simple and explainable on purpose: every point has a stated reason.
const POINTS = { verified: 35, budget: 30, experience: 20, area: 15 } as const;

export function scoreTutor(
  tutor: {
    verificationStatus: string;
    hourlyRate: number;
    experienceYears: number;
    areas: { id: string }[];
  },
  query: Pick<RecommendQuery, 'budget' | 'areaId'>,
) {
  let score = 0;
  const reasons: string[] = [];

  if (tutor.verificationStatus === 'VERIFIED') {
    score += POINTS.verified;
    reasons.push('Verified tutor');
  }
  if (query.budget !== undefined) {
    if (tutor.hourlyRate <= query.budget) {
      score += POINTS.budget;
      reasons.push('Within your budget');
    } else if (tutor.hourlyRate <= query.budget * 1.2) {
      score += POINTS.budget / 2;
      reasons.push('Slightly above your budget');
    }
  }
  const experiencePoints = Math.round(
    (Math.min(tutor.experienceYears, 10) / 10) * POINTS.experience,
  );
  if (experiencePoints > 0) {
    score += experiencePoints;
    reasons.push(`${tutor.experienceYears} years of experience`);
  }
  if (query.areaId && tutor.areas.some((a) => a.id === query.areaId)) {
    score += POINTS.area;
    reasons.push('Teaches in your area');
  }
  return { score, reasons };
}

export const recommendService = {
  recommend: (query: RecommendQuery) =>
    searchCache.getOrLoad({ kind: 'recommended', ...query }, CACHE_TTL_SECONDS, async () => {
      const candidates = await prisma.tutorProfile.findMany({
        where: {
          isPublished: true,
          user: { status: 'ACTIVE' },
          subjects: { some: { id: query.subjectId } },
          // Hard requirements: the tutor must actually be able to teach this way.
          ...(query.mode ? { teachingMode: { in: [query.mode, 'BOTH'] } } : {}),
          ...(query.mode === 'HOME' && query.areaId
            ? { areas: { some: { id: query.areaId } } }
            : {}),
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: CANDIDATE_LIMIT,
        select: {
          id: true,
          headline: true,
          qualification: true,
          experienceYears: true,
          hourlyRate: true,
          teachingMode: true,
          verificationStatus: true,
          ratingAvg: true,
          ratingCount: true,
          user: { select: { fullName: true } },
          subjects: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
          areas: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
        },
      });

      return candidates
        .map((t) => ({ tutor: t, ...scoreTutor(t, query) }))
        .sort(
          (a, b) =>
            b.score - a.score ||
            a.tutor.hourlyRate - b.tutor.hourlyRate ||
            a.tutor.id.localeCompare(b.tutor.id),
        )
        .slice(0, query.limit)
        .map(({ tutor: t, score, reasons }) => ({
          score,
          reasons,
          tutor: {
            id: t.id,
            fullName: t.user.fullName,
            headline: t.headline,
            qualification: t.qualification,
            experienceYears: t.experienceYears,
            hourlyRate: t.hourlyRate,
            teachingMode: t.teachingMode,
            verificationStatus: t.verificationStatus,
            ratingAvg: t.ratingAvg,
            ratingCount: t.ratingCount,
            subjects: t.subjects,
            areas: t.areas,
          },
        }));
    }),
};
