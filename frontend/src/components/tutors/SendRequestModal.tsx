import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useCreateRequestMutation } from '@/features/requests/requestsApi';
import { getErrorMessage } from '@/services/api/baseApi';
import type { TutorProfile } from '@/types/api';

interface Form {
  subjectId: string;
  mode: 'HOME' | 'ONLINE';
  areaId: string;
  budgetPerHour: string;
  message: string;
}

export function SendRequestModal({
  tutor,
  open,
  onClose,
}: {
  tutor: TutorProfile;
  open: boolean;
  onClose: () => void;
}) {
  const [create, { isLoading }] = useCreateRequestMutation();
  const [error, setError] = useState('');
  const defaultMode = tutor.teachingMode === 'ONLINE' ? 'ONLINE' : 'HOME';
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Form>({
    defaultValues: {
      subjectId: tutor.subjects[0]?.id ?? '',
      mode: defaultMode,
      areaId: tutor.areas[0]?.id ?? '',
      budgetPerHour: '',
      message: '',
    },
  });
  const mode = watch('mode');

  const onSubmit = async (v: Form) => {
    setError('');
    try {
      await create({
        tutorId: tutor.id,
        subjectId: v.subjectId,
        mode: v.mode,
        areaId: v.mode === 'HOME' ? v.areaId || undefined : undefined,
        budgetPerHour: v.budgetPerHour ? Number(v.budgetPerHour) : undefined,
        message: v.message.trim(),
      }).unwrap();
      toast.success('Request sent. You will be notified when the tutor responds.');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Request ${tutor.fullName}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Select label="Subject" {...register('subjectId', { required: true })}>
          {tutor.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {tutor.teachingMode === 'BOTH' && (
          <Select label="Teaching mode" {...register('mode')}>
            <option value="HOME">At home</option>
            <option value="ONLINE">Online</option>
          </Select>
        )}
        {mode === 'HOME' && (
          <Select
            label="Your area"
            {...register('areaId', { required: 'Choose an area' })}
            error={errors.areaId?.message}
          >
            {tutor.areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        )}
        <Input
          label="Budget per hour (PKR, optional)"
          type="number"
          min={100}
          max={20000}
          {...register('budgetPerHour')}
        />
        <Textarea
          label="Message"
          placeholder="Tell the tutor your class, goals and preferred schedule"
          error={errors.message?.message}
          {...register('message', {
            validate: (v) => v.trim().length >= 10 || 'Write at least 10 characters',
            maxLength: { value: 1000, message: 'Maximum 1000 characters' },
          })}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={isLoading}>
          Send request
        </Button>
      </form>
    </Modal>
  );
}
