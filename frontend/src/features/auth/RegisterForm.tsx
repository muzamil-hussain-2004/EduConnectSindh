import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage, getFieldErrors } from '@/services/api/baseApi';
import { useRegisterMutation } from '@/features/auth/authApi';
import { registerSchema, type RegisterInput } from '@/features/auth/auth.schemas';

const ROLES = [
  { value: 'STUDENT', label: 'Student' },
  { value: 'PARENT', label: 'Parent' },
  { value: 'TUTOR', label: 'Tutor' },
] as const;

export function RegisterForm() {
  const [registerUser, { isLoading }] = useRegisterMutation();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'STUDENT', phone: '' },
  });

  const onSubmit = async ({ phone, ...rest }: RegisterInput) => {
    try {
      await registerUser({ ...rest, phone: phone || undefined }).unwrap();
      toast.success('Account created');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const fields = getFieldErrors(err);
      const names = Object.keys(fields) as (keyof RegisterInput)[];
      if (names.length) names.forEach((n) => setError(n, { message: fields[n] }));
      else toast.error(getErrorMessage(err, 'Registration failed'));
    }
  };

  return (
    <AuthShell
      image="/auth-register.jpg"
      headline="Find your perfect tutor"
      subline="Join students and parents across Sindh"
    >
      <h1 className="sr-only">Create your account</h1>
      <p className="mb-6 text-sm text-ink-soft">Find or become a verified tutor in Sindh.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">I am a</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="cursor-pointer rounded-md border border-brand-500 px-3 py-2 text-center text-sm has-checked:bg-brand-500 has-checked:text-white"
              >
                <input type="radio" value={r.value} className="sr-only" {...register('role')} />
                {r.label}
              </label>
            ))}
          </div>
        </fieldset>
        <Input label="Full name" error={errors.fullName?.message} {...register('fullName')} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Phone (optional)"
          placeholder="03XXXXXXXXX"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" className="w-3/5" loading={isLoading}>
            Register
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
