import { Link } from 'react-router';
import { BadgeCheck, Search, Star } from 'lucide-react';

const FEATURES = [
  {
    icon: Search,
    title: 'Find tutors nearby',
    text: 'Filter by subject, area and budget in Jamshoro.',
  },
  { icon: BadgeCheck, title: 'Verified profiles', text: 'Every tutor is reviewed by our admins.' },
  { icon: Star, title: 'Honest reviews', text: 'Ratings come from students who actually learned.' },
];

export function HomePage() {
  return (
    <div className="space-y-12">
      <section className="py-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Find the right <span className="text-brand-600">verified tutor</span> in Sindh
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          EduConnect connects students and parents with trusted tutors, then helps you learn online
          or in person.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/register"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Get started
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-slate-100"
          >
            Log in
          </Link>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-white p-5">
            <Icon className="mb-3 size-6 text-brand-600" />
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-slate-600">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
