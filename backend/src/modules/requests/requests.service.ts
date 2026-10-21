import { AppError } from '../../shared/errors/AppError';
import type { RequestWithRelations } from './requests.repository';
import { requestsRepository } from './requests.repository';
import type { CreateRequestInput, ListRequestsQuery } from './requests.schema';

const MAX_PENDING_PER_STUDENT = 10;

type Viewer = 'student' | 'tutor';

// The other side's phone and email appear only after the tutor accepts.
function toRequestDto(r: RequestWithRelations, viewer: Viewer) {
  const accepted = r.status === 'ACCEPTED';
  const other = viewer === 'student' ? r.tutorProfile.user : r.student;
  return {
    id: r.id,
    tutorId: r.tutorProfile.id,
    status: r.status,
    subject: r.subject,
    area: r.area,
    mode: r.mode,
    budgetPerHour: r.budgetPerHour,
    message: r.message,
    responseNote: r.responseNote,
    respondedAt: r.respondedAt,
    createdAt: r.createdAt,
    [viewer === 'student' ? 'tutor' : 'student']: {
      fullName: other.fullName,
      ...(accepted ? { email: other.email, phone: other.phone } : {}),
    },
  };
}

const meta = (query: ListRequestsQuery, total: number) => ({
  page: query.page,
  limit: query.limit,
  total,
  totalPages: Math.ceil(total / query.limit),
});

export const requestsService = {
  async create(studentId: string, input: CreateRequestInput) {
    const { tutorId, ...details } = input;
    const tutor = await requestsRepository.findTutor(tutorId);
    if (!tutor || !tutor.isPublished || tutor.user.status !== 'ACTIVE') {
      throw AppError.notFound('Tutor not found');
    }
    if (!tutor.subjects.some((s) => s.id === details.subjectId)) {
      throw AppError.badRequest('This tutor does not teach the selected subject');
    }
    if (tutor.teachingMode !== 'BOTH' && tutor.teachingMode !== details.mode) {
      throw AppError.badRequest(
        `This tutor only offers ${tutor.teachingMode.toLowerCase()} lessons`,
      );
    }
    if (details.mode === 'HOME') {
      if (!details.areaId) throw AppError.badRequest('Choose your area for home tutoring');
      if (!tutor.areas.some((a) => a.id === details.areaId)) {
        throw AppError.badRequest('This tutor does not travel to the selected area');
      }
    } else if (details.areaId && !(await requestsRepository.areaExists(details.areaId))) {
      throw AppError.badRequest('Area does not exist');
    }

    if (await requestsRepository.hasPending(studentId, tutorId, details.subjectId)) {
      throw AppError.conflict('You already have a pending request to this tutor for this subject');
    }
    if ((await requestsRepository.countPendingByStudent(studentId)) >= MAX_PENDING_PER_STUDENT) {
      throw AppError.conflict(
        `You can have at most ${MAX_PENDING_PER_STUDENT} pending requests. Cancel one or wait for replies`,
      );
    }

    return toRequestDto(await requestsRepository.create(studentId, details, tutorId), 'student');
  },

  async listMine(studentId: string, query: ListRequestsQuery) {
    const { items, total } = await requestsRepository.list(
      { studentId, ...(query.status ? { status: query.status } : {}) },
      query,
    );
    return { items: items.map((r) => toRequestDto(r, 'student')), meta: meta(query, total) };
  },

  async listIncoming(tutorUserId: string, query: ListRequestsQuery) {
    const { items, total } = await requestsRepository.list(
      { tutorProfile: { userId: tutorUserId }, ...(query.status ? { status: query.status } : {}) },
      query,
    );
    return { items: items.map((r) => toRequestDto(r, 'tutor')), meta: meta(query, total) };
  },

  // Someone else's request looks like it does not exist, so ids cannot be probed.
  async respond(tutorUserId: string, id: string, decision: 'ACCEPTED' | 'DECLINED', note?: string) {
    const request = await requestsRepository.findById(id);
    if (!request || request.tutorProfile.userId !== tutorUserId) {
      throw AppError.notFound('Request not found');
    }
    if ((await requestsRepository.transition(id, decision, note ?? null)) === 0) {
      throw AppError.conflict('This request is no longer pending');
    }
    return toRequestDto((await requestsRepository.findById(id)) as RequestWithRelations, 'tutor');
  },

  async cancel(studentId: string, id: string) {
    const request = await requestsRepository.findById(id);
    if (!request || request.studentId !== studentId) throw AppError.notFound('Request not found');
    if ((await requestsRepository.transition(id, 'CANCELLED', null)) === 0) {
      throw AppError.conflict('Only pending requests can be cancelled');
    }
    return toRequestDto((await requestsRepository.findById(id)) as RequestWithRelations, 'student');
  },
};
