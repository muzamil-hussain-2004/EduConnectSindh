import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { AuthShell } from '@/components/layout/AuthShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getErrorMessage } from '@/services/api/baseApi';
import { useLoginMutation } from '@/features/auth/authApi';
import { loginSchema, type LoginInput } from '@/features/auth/auth.schemas';

export function LoginForm() {
  const [login, { isLoading }] = useLoginMutation();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/dashboard';
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginInput) => {
    try {
      await login(values).unwrap();
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Login failed'));
    }
  };

  return (
    <AuthShell
      image="/auth-login.jpg"
      headline="Learn from verified tutors"
      subline="Pick up right where you left off"
    >
      <h1 className="sr-only">Log in</h1>
      <p className="mb-6 text-sm text-slate-600">
        Log in to find tutors, manage your requests and keep learning.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="Enter your email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" className="w-3/5" loading={isLoading}>
            Login
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
