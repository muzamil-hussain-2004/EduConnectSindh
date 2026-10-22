import {
  Atom,
  BookOpen,
  Calculator,
  Code2,
  FlaskConical,
  Globe2,
  Landmark,
  Languages,
  Leaf,
  Music,
  Palette,
  Star,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router';
import { subjectPhoto } from '@/lib/subjectPhoto';

const ICONS: [RegExp, LucideIcon][] = [
  [/math|algebra|calcul|stat/i, Calculator],
  [/phys/i, Atom],
  [/chem/i, FlaskConical],
  [/bio|science/i, Leaf],
  [/comput|program|it\b|code|software/i, Code2],
  [/english|urdu|sindhi|arabic|language/i, Languages],
  [/islam|history|civic|pakistan|study|studies/i, Landmark],
  [/geo/i, Globe2],
  [/art|draw/i, Palette],
  [/music/i, Music],
];

const GRADIENTS = [
  ['#ff6636', '#ffb199'],
  ['#564ffd', '#a9a5ff'],
  ['#1ea04a', '#8fe0a5'],
  ['#fd8e1f', '#ffd29a'],
  ['#e34444', '#ffa3a3'],
  ['#2b3a67', '#7d8fc7'],
];

const iconFor = (name: string) => ICONS.find(([re]) => re.test(name))?.[1] ?? BookOpen;

/** Course-style subject card: gradient banner, big title and small info pills. */
export function SubjectCard({ id, name, index }: { id: string; name: string; index: number }) {
  const Icon = iconFor(name);
  const [from, to] = GRADIENTS[index % GRADIENTS.length] as [string, string];
  const photo = subjectPhoto(name);

  return (
    <Link
      to={`/tutors?subjectId=${id}`}
      className="lift animate-fade-up group block overflow-hidden rounded-xl border border-line bg-white"
      style={{ ['--delay' as string]: `${Math.min(index, 8) * 60}ms` }}
    >
      <div
        className="relative grid h-36 place-items-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {photo ? (
          <img
            src={photo}
            alt={name}
            loading="lazy"
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            <span className="absolute -top-6 -right-6 size-28 rounded-full bg-white/15" />
            <span className="absolute -bottom-8 -left-4 size-24 rounded-full bg-white/10" />
            <Icon className="size-16 text-white/90 transition-transform duration-300 group-hover:scale-110" />
          </>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold">{name}</h3>
        <p className="mt-1 text-sm text-muted">Home &amp; online tutors across Sindh</p>
        <div className="mt-3 flex items-center gap-2 text-sm">
          <Star className="size-4 fill-warning text-warning" />
          <span className="font-semibold">Top rated</span>
          <span className="text-muted">·</span>
          <span className="text-muted">All levels</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-500">
            Verified tutors
          </span>
          <span className="rounded-full bg-accent-100 px-3 py-1 text-xs font-semibold text-accent-500">
            Request a free intro
          </span>
        </div>
      </div>
    </Link>
  );
}
