import type { Role } from '../../database/generated/prisma/client';
import { AppError } from '../../shared/errors/AppError';
import { searchCache } from '../search/search.cache';
import { detectFileType } from '../../shared/utils/fileType';
import { documentStorage } from './document.storage';
import { verificationRepository } from './verification.repository';
import type { DocumentTypeInput, ListRequestsQuery } from './verification.schema';

const MAX_DOCUMENTS = 10;
// CNIC sides are single-slot: uploading again replaces the earlier file.
const SINGLE_SLOT_TYPES: DocumentTypeInput[] = ['CNIC_FRONT', 'CNIC_BACK'];

type Doc = {
  id: string;
  type: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
};

const toDocumentDto = (doc: Doc) => ({
  id: doc.id,
  type: doc.type,
  originalName: doc.originalName,
  mimeType: doc.mimeType,
  sizeBytes: doc.sizeBytes,
  createdAt: doc.createdAt,
});

async function getEditableProfile(userId: string) {
  const profile = await verificationRepository.findProfileByUserId(userId);
  if (!profile) throw AppError.badRequest('Create your tutor profile first');
  if (profile.verificationStatus === 'PENDING') {
    throw AppError.conflict('Your documents are under review and cannot be changed right now');
  }
  if (profile.verificationStatus === 'VERIFIED') {
    throw AppError.conflict('You are already verified');
  }
  return profile;
}

export const verificationService = {
  async myStatus(userId: string) {
    const profile = await verificationRepository.findProfileByUserId(userId);
    if (!profile) throw AppError.notFound('You have not created a tutor profile yet');
    return {
      status: profile.verificationStatus,
      note: profile.verificationNote,
      reviewedAt: profile.reviewedAt,
      documents: profile.documents.map(toDocumentDto),
    };
  },

  async uploadDocument(
    userId: string,
    type: DocumentTypeInput,
    file: Express.Multer.File | undefined,
  ) {
    if (!file) throw AppError.badRequest('Attach a file in the "file" field');
    const profile = await getEditableProfile(userId);

    const detected = detectFileType(file.buffer);
    if (!detected) throw AppError.badRequest('Only JPG, PNG or PDF files are allowed');

    const replaced = SINGLE_SLOT_TYPES.includes(type)
      ? profile.documents.filter((d) => d.type === type)
      : [];
    if (profile.documents.length - replaced.length >= MAX_DOCUMENTS) {
      throw AppError.badRequest(`You can upload at most ${MAX_DOCUMENTS} documents`);
    }

    const storedName = await documentStorage.save(file.buffer, detected.extension);
    try {
      const created = await verificationRepository.createDocument({
        tutorProfileId: profile.id,
        type,
        storedName,
        originalName: file.originalname.slice(0, 200),
        mimeType: detected.mimeType,
        sizeBytes: file.size,
      });
      for (const old of replaced) {
        await verificationRepository.deleteDocument(old.id);
        await documentStorage.remove(old.storedName);
      }
      return toDocumentDto(created);
    } catch (err) {
      await documentStorage.remove(storedName);
      throw err;
    }
  },

  async deleteDocument(userId: string, documentId: string) {
    const profile = await getEditableProfile(userId);
    const doc = profile.documents.find((d) => d.id === documentId);
    if (!doc) throw AppError.notFound('Document not found');

    await verificationRepository.deleteDocument(doc.id);
    await documentStorage.remove(doc.storedName);
  },

  async submit(userId: string) {
    const profile = await getEditableProfile(userId);
    const has = (type: string) => profile.documents.some((d) => d.type === type);
    const missing = [
      !has('CNIC_FRONT') && 'CNIC front',
      !has('CNIC_BACK') && 'CNIC back',
      !has('DEGREE') && 'at least one degree or certificate',
    ].filter(Boolean);
    if (missing.length > 0) {
      throw AppError.badRequest(`Upload before submitting: ${missing.join(', ')}`);
    }

    if ((await verificationRepository.submit(profile.id)) === 0) {
      throw AppError.conflict('Your request was already submitted');
    }
    return this.myStatus(userId);
  },

  // Only the owner or an admin may read a document; others get 404 so ids cannot be probed.
  async getDocumentFile(actor: { id: string; role: Role }, documentId: string) {
    const doc = await verificationRepository.findDocument(documentId);
    if (!doc || (actor.role !== 'ADMIN' && doc.tutorProfile.userId !== actor.id)) {
      throw AppError.notFound('Document not found');
    }
    return {
      path: documentStorage.pathOf(doc.storedName),
      mimeType: doc.mimeType,
      originalName: doc.originalName,
    };
  },

  async listRequests(query: ListRequestsQuery) {
    const { items, total } = await verificationRepository.listByStatus(query);
    return {
      items: items.map((p) => ({
        tutorId: p.id,
        fullName: p.user.fullName,
        headline: p.headline,
        status: p.verificationStatus,
        note: p.verificationNote,
        reviewedAt: p.reviewedAt,
        submittedAt: p.updatedAt,
        documentCount: p._count.documents,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  },

  async getRequest(tutorId: string) {
    const profile = await verificationRepository.findProfileById(tutorId);
    if (!profile) throw AppError.notFound('Tutor not found');
    return {
      tutorId: profile.id,
      fullName: profile.user.fullName,
      headline: profile.headline,
      qualification: profile.qualification,
      status: profile.verificationStatus,
      note: profile.verificationNote,
      reviewedAt: profile.reviewedAt,
      documents: profile.documents.map(toDocumentDto),
    };
  },

  approve(tutorId: string) {
    return this.decide(tutorId, 'VERIFIED', null);
  },

  reject(tutorId: string, reason: string) {
    return this.decide(tutorId, 'REJECTED', reason);
  },

  async decide(tutorId: string, to: 'VERIFIED' | 'REJECTED', note: string | null) {
    const profile = await verificationRepository.findProfileById(tutorId);
    if (!profile) throw AppError.notFound('Tutor not found');
    if ((await verificationRepository.decide(tutorId, 'PENDING', to, note)) === 0) {
      throw AppError.conflict('This request is not pending review');
    }
    await searchCache.invalidate();
    return this.getRequest(tutorId);
  },
};
