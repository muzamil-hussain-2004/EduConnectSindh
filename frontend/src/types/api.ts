export type Role = 'STUDENT' | 'PARENT' | 'TUTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  status: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PageMeta;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
}

export interface AuthPayload {
  user: User;
  accessToken: string;
}

export type TeachingMode = 'HOME' | 'ONLINE' | 'BOTH';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Subject {
  id: string;
  name: string;
}

export interface Area {
  id: string;
  name: string;
}

export interface City {
  id: string;
  name: string;
  areas: Area[];
}

export interface TutorSummary {
  id: string;
  fullName: string;
  headline: string;
  qualification: string;
  experienceYears: number;
  hourlyRate: number;
  teachingMode: TeachingMode;
  verificationStatus: VerificationStatus;
  ratingAvg?: number;
  ratingCount?: number;
  subjects: Subject[];
  areas: Area[];
}

export interface TutorProfile extends TutorSummary {
  bio: string;
  isPublished: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReview extends Review {
  tutorId: string;
  status: 'VISIBLE' | 'HIDDEN';
  moderationNote: string | null;
}

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED';

export interface Contact {
  fullName: string;
  email?: string;
  phone?: string | null;
}

export interface TutorRequest {
  id: string;
  tutorId: string;
  status: RequestStatus;
  subject: Subject;
  area: Area | null;
  mode: 'HOME' | 'ONLINE';
  budgetPerHour: number | null;
  message: string;
  responseNote: string | null;
  respondedAt: string | null;
  createdAt: string;
  tutor?: Contact;
  student?: Contact;
}

export interface ShortlistItem {
  savedAt: string;
  tutor: TutorSummary;
}

export type NotificationType =
  | 'REQUEST_RECEIVED'
  | 'REQUEST_ACCEPTED'
  | 'REQUEST_DECLINED'
  | 'REVIEW_RECEIVED'
  | 'VERIFICATION_APPROVED'
  | 'VERIFICATION_REJECTED';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export type DocumentType = 'CNIC_FRONT' | 'CNIC_BACK' | 'DEGREE' | 'OTHER';

export interface VerificationDocument {
  id: string;
  type: DocumentType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface MyVerification {
  status: VerificationStatus;
  note: string | null;
  reviewedAt: string | null;
  documents: VerificationDocument[];
}

export interface VerificationRequestItem {
  tutorId: string;
  fullName: string;
  headline: string;
  status: VerificationStatus;
  note: string | null;
  reviewedAt: string | null;
  submittedAt: string;
  documentCount: number;
}

export interface VerificationRequestDetail {
  tutorId: string;
  fullName: string;
  headline: string;
  qualification: string;
  status: VerificationStatus;
  note: string | null;
  reviewedAt: string | null;
  documents: VerificationDocument[];
}

export interface Paged<T> {
  items: T[];
  meta?: PageMeta;
}
