import { ArrowRight, BadgeCheck, MessagesSquare, Search } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAppSelector } from '@/app/hooks';
import { TutorCard } from '@/components/tutors/TutorCard';
import { Button, buttonClass } from '@/components/ui/Button';
import { useGetSubjectsQuery } from '@/features/catalog/catalogApi';
import { useSearchTutorsQuery } from '@/features/tutors/tutorsApi';

const TINTS = [
  'bg-brand-50 text-brand-500',
  'bg-accent-100 text-accent-500',
  'bg-green-50 text-success',
  'bg-orange-50 text-warning',
  'bg-red-50 text-danger',
  'bg-surface text-ink-soft',
];

const STEPS = [
  {
    icon: Search,
    title: 'Search & filter',
    text: 'Browse tutors by subject, area, price, rating and teaching mode.',
  },
  {
    icon: BadgeCheck,
    title: 'Check verification',
    text: 'Tutors upload CNIC and degree documents that our admins review.',
  },
  {
    icon: MessagesSquare,
    title: 'Send a request',
    text: 'Request lessons; contact details unlock only when the tutor accepts.',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [q, setQ] = useState('');
  const { data: subjects = [] } = useGetSubjectsQuery();
  const { data: top } = useSearchTutorsQuery({ sort: 'rating', limit: 6 });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    navigate(q.trim() ? `/tutors?q=${encodeURIComponent(q.trim())}` : '/tutors');
  };

  return (
    <>
      <section className="bg-brand-50">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-3xl leading-tight font-semibold sm:text-4xl lg:text-5xl">
              Find the right tutor in Jamshoro and across Sindh
            </h1>
            <p className="mt-4 max-w-lg text-ink-soft">
              Verified home and online tutors for every subject, with transparent rates and real
              reviews from students and parents.
            </p>
            <form onSubmit={onSearch} className="mt-6 flex max-w-lg gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search subject or tutor"
                placeholder="What do you want to learn?"
                className="h-12 min-w-0 flex-1 rounded-md border border-line bg-white px-4 text-sm outline-none focus:border-brand-500"
              />
              <Button type="submit" size="lg">
                Search
              </Button>
            </form>
            {!user && (
              <Link
                to="/register"
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-500"
              >
                Or become a tutor <ArrowRight className="size-4" />
              </Link>
            )}
          </div>
          <img
            src="/auth-register.jpg"
            alt="Student learning with a tutor"
            className="aspect-4/3 w-full rounded-2xl object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-2xl font-semibold">Browse by subject</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {subjects.slice(0, 12).map((s, i) => (
            <Link
              key={s.id}
              to={`/tutors?subjectId=${s.id}`}
              className={`rounded-md p-4 text-sm font-semibold transition hover:shadow-md ${TINTS[i % TINTS.length]}`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      {top && top.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl font-semibold">Top rated tutors</h2>
            <Link to="/tutors?sort=rating" className="text-sm font-medium text-brand-500">
              See all
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {top.items.map((t) => (
              <TutorCard key={t.id} tutor={t} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <h2 className="text-center text-2xl font-semibold">How it works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-md bg-white p-6">
                <span className="grid size-12 place-items-center rounded-md bg-brand-100 text-brand-500">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center">
          <div className="text-white">
            <h2 className="text-2xl font-semibold">Are you a tutor?</h2>
            <p className="mt-1 text-white/70">
              Create a profile, get verified and receive requests from students nearby.
            </p>
          </div>
          <Link to="/register" className={buttonClass('primary', 'lg')}>
            Become a tutor
          </Link>
        </div>
      </section>
    </>
  );
}
