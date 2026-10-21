import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-slate-600">That page does not exist.</p>
      <Link to="/" className="mt-4 inline-block text-brand-600 hover:underline">
        Back home
      </Link>
    </div>
  );
}
