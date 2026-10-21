import { FileText, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/tutors/StatusBadge';
import { Button, buttonClass } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingBlock } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Input';
import {
  useDeleteDocumentMutation,
  useGetMyVerificationQuery,
  useSubmitVerificationMutation,
  useUploadDocumentMutation,
} from '@/features/verification/verificationApi';
import { getErrorMessage } from '@/services/api/baseApi';
import type { DocumentType } from '@/types/api';
import { PageHeader } from './PageHeader';

export const DOC_LABEL: Record<DocumentType, string> = {
  CNIC_FRONT: 'CNIC (front)',
  CNIC_BACK: 'CNIC (back)',
  DEGREE: 'Degree / certificate',
  OTHER: 'Other',
};

export function VerificationPage() {
  const { data, isLoading, isError } = useGetMyVerificationQuery();
  const [upload, { isLoading: uploading }] = useUploadDocumentMutation();
  const [remove] = useDeleteDocumentMutation();
  const [submit, { isLoading: submitting }] = useSubmitVerificationMutation();
  const [type, setType] = useState<DocumentType>('CNIC_FRONT');
  const fileRef = useRef<HTMLInputElement>(null);

  if (isLoading) return <LoadingBlock />;
  if (isError || !data)
    return (
      <>
        <PageHeader
          title="Verification"
          text="Upload your CNIC and degree. An admin reviews them and awards the Verified badge."
        />
        <Card className="max-w-2xl space-y-3">
          <p className="font-medium">Step 1: create your tutor profile</p>
          <p className="text-sm text-muted">
            Verification is attached to your tutor profile. Fill in your subjects, rate and
            qualification first, then come back here to upload documents.
          </p>
          <Link to="/dashboard/profile" className={buttonClass('primary', 'sm')}>
            Create tutor profile
          </Link>
        </Card>
      </>
    );

  const locked = data.status === 'PENDING' || data.status === 'VERIFIED';

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      await upload({ type, file }).unwrap();
      toast.success('Document uploaded');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSubmit = async () => {
    try {
      await submit().unwrap();
      toast.success('Submitted for review');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Verification"
        text="Upload your CNIC and degree. An admin reviews them and awards the Verified badge."
        action={<VerificationBadge status={data.status} />}
      />
      {data.status === 'REJECTED' && data.note && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-danger">Rejected: {data.note}</p>
      )}
      <Card className="max-w-2xl space-y-4">
        {!locked && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Select
                label="Document type"
                value={type}
                onChange={(e) => setType(e.target.value as DocumentType)}
              >
                {Object.entries(DOC_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
            <input
              ref={fileRef}
              type="file"
              hidden
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <Button variant="outline" loading={uploading} onClick={() => fileRef.current?.click()}>
              Choose file
            </Button>
          </div>
        )}
        {!locked && <p className="text-xs text-muted">JPG, PNG or PDF, up to 5 MB.</p>}
        {data.documents.length === 0 ? (
          <p className="text-sm text-muted">No documents uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {data.documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <FileText className="size-5 shrink-0 text-brand-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.originalName}</p>
                  <p className="text-xs text-muted">{DOC_LABEL[d.type]}</p>
                </div>
                {!locked && (
                  <button
                    onClick={() => remove(d.id)}
                    aria-label={`Delete ${d.originalName}`}
                    className="rounded-md p-2 text-danger hover:bg-red-50"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!locked && (
          <Button onClick={onSubmit} loading={submitting} disabled={data.documents.length === 0}>
            Submit for review
          </Button>
        )}
        {data.status === 'PENDING' && (
          <p className="text-sm text-muted">Your documents are being reviewed.</p>
        )}
      </Card>
    </>
  );
}
