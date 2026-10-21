import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
    <Card className="mx-auto w-full max-w-md">
      <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
      <p className="mb-6 text-sm text-slate-500">Find or become a verified tutor in Sindh.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">I am a</legend>
          <div className="grid grid-cols-3 gap-2">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-center text-sm has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-700"
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
        <Button type="submit" className="w-full" loading={isLoading}>
          Create account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already registered?{' '}
        <Link to="/login" className="text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
