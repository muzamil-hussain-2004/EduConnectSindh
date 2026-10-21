import { AppError } from '../../shared/errors/AppError';
import { searchCache } from '../search/search.cache';
import type { TutorProfileWithRelations } from './tutors.repository';
import { tutorsRepository } from './tutors.repository';
import type { UpsertTutorProfileInput } from './tutors.schema';

// Shape of a profile that may leave the server. Contact details are deliberately absent:
// students reach tutors through requests (step 1.6).
export function toTutorDto(profile: TutorProfileWithRelations) {
  return {
    id: profile.id,
    fullName: profile.user.fullName,
    headline: profile.headline,
    bio: profile.bio,
    qualification: profile.qualification,
    experienceYears: profile.experienceYears,
    hourlyRate: profile.hourlyRate,
    teachingMode: profile.teachingMode,
    isPublished: profile.isPublished,
    verificationStatus: profile.verificationStatus,
    ratingAvg: profile.ratingAvg,
    ratingCount: profile.ratingCount,
    subjects: profile.subjects,
    areas: profile.areas,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export const tutorsService = {
  async getMine(userId: string) {
    const profile = await tutorsRepository.findByUserId(userId);
    if (!profile) throw AppError.notFound('You have not created a tutor profile yet');
    return toTutorDto(profile);
  },

  async saveMine(userId: string, input: UpsertTutorProfileInput) {
    const { subjectIds, areaIds, ...fields } = input;
    const uniqueSubjects = [...new Set(subjectIds)];
    const uniqueAreas = [...new Set(areaIds)];

    if ((await tutorsRepository.countSubjects(uniqueSubjects)) !== uniqueSubjects.length) {
      throw AppError.badRequest('One or more subjects do not exist');
    }
    if (
      uniqueAreas.length > 0 &&
      (await tutorsRepository.countAreas(uniqueAreas)) !== uniqueAreas.length
    ) {
      throw AppError.badRequest('One or more areas do not exist');
    }
    if (fields.isPublished && fields.teachingMode !== 'ONLINE' && uniqueAreas.length === 0) {
      throw AppError.badRequest('Choose at least one area to publish a home-tutoring profile');
    }

    const saved = await tutorsRepository.upsert(userId, fields, uniqueSubjects, uniqueAreas);
    await searchCache.invalidate();
    return toTutorDto(saved);
  },

  // Public: unpublished profiles look like they do not exist.
  async getPublic(id: string) {
    const profile = await tutorsRepository.findById(id);
    if (!profile || !profile.isPublished) throw AppError.notFound('Tutor not found');
    return toTutorDto(profile);
  },
};
