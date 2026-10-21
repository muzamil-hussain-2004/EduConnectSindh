import { ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { buttonClass } from '@/components/ui/Button';
import { useGetMyVerificationQuery } from '@/features/verification/verificationApi';

/** Tells a tutor why they cannot publish yet, and how to fix it. Returns whether they are verified. */
export function useTutorVerified() {
  const { data, isLoading } = useGetMyVerificationQuery();
  return { verified: data?.status === 'VERIFIED', status: data?.status, isLoading };
}

const COPY: Record<string, string> = {
  UNVERIFIED:
    'Only verified tutors can create courses and live classes. Upload your CNIC and degree and submit them for review.',
  PENDING: 'Your documents are under review. You can create courses once an admin approves them.',
  REJECTED:
    'Your verification was rejected. Fix the issue noted by the admin and submit your documents again.',
};

export function VerificationNotice({ status }: { status?: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-lg border border-brand-100 bg-brand-100/40 p-4 sm:flex-row sm:items-center">
      <ShieldAlert className="size-6 shrink-0 text-brand-500" />
      <p className="flex-1 text-sm text-ink-soft">
        {COPY[status ?? 'UNVERIFIED'] ?? COPY.UNVERIFIED}
      </p>
      <Link to="/dashboard/verification" className={buttonClass('primary', 'sm')}>
        {status === 'PENDING' ? 'View status' : 'Get verified'}
      </Link>
    </div>
  );
}
