import { BadgeCheck } from 'lucide-react';
import { Badge, type Tone } from '@/components/ui/Badge';
import type { RequestStatus, VerificationStatus } from '@/types/api';

const REQUEST_TONE: Record<RequestStatus, Tone> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  DECLINED: 'danger',
  CANCELLED: 'neutral',
};

const VERIF_TONE: Record<VerificationStatus, Tone> = {
  UNVERIFIED: 'neutral',
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
};

const cap = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

export const RequestStatusBadge = ({ status }: { status: RequestStatus }) => (
  <Badge tone={REQUEST_TONE[status]}>{cap(status)}</Badge>
);

export const VerificationBadge = ({ status }: { status: VerificationStatus }) => (
  <Badge tone={VERIF_TONE[status]}>{cap(status)}</Badge>
);

export const VerifiedMark = () => (
  <Badge tone="success">
    <BadgeCheck className="size-3.5" /> Verified
  </Badge>
);
