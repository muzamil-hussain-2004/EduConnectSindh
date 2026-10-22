import { AppError } from '../../shared/errors/AppError';
import { avatarUrlFor } from '../../shared/utils/avatar';
import { shortlistRepository } from './shortlist.repository';

export const shortlistService = {
  async add(studentId: string, tutorProfileId: string) {
    const tutor = await shortlistRepository.findTutor(tutorProfileId);
    if (!tutor || !tutor.isPublished || tutor.user.status !== 'ACTIVE') {
      throw AppError.notFound('Tutor not found');
    }
    await shortlistRepository.add(studentId, tutorProfileId);
  },

  async remove(studentId: string, tutorProfileId: string) {
    await shortlistRepository.remove(studentId, tutorProfileId);
  },

  async list(studentId: string) {
    const rows = await shortlistRepository.list(studentId);
    return rows.map(({ createdAt, tutorProfile: t }) => ({
      savedAt: createdAt,
      tutor: {
        id: t.id,
        fullName: t.user.fullName,
        avatarUrl: avatarUrlFor(t.user.id, t.user.avatarFile),
        headline: t.headline,
        qualification: t.qualification,
        experienceYears: t.experienceYears,
        hourlyRate: t.hourlyRate,
        teachingMode: t.teachingMode,
        verificationStatus: t.verificationStatus,
        subjects: t.subjects,
        areas: t.areas,
      },
    }));
  },
};
