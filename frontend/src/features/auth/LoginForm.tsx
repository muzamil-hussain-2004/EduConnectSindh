import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
    <Card className="mx-auto w-full max-w-md">
      <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-slate-500">Log in to your EduConnect account.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" className="w-full" loading={isLoading}>
          Log in
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        No account?{' '}
        <Link to="/register" className="text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </Card>
  );
}
