import { Link } from 'react-router';
import { Logo } from './Logo';

const YEAR = new Date().getFullYear();

export function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3 lg:col-span-2">
          <Logo light />
          <p className="max-w-sm text-sm">
            Find verified tutors in Jamshoro and across Sindh, for home tutoring or online lessons.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Explore</p>
          <Link to="/tutors" className="block hover:text-white">
            Find tutors
          </Link>
          <Link to="/register" className="block hover:text-white">
            Become a tutor
          </Link>
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-white">Account</p>
          <Link to="/login" className="block hover:text-white">
            Sign in
          </Link>
          <Link to="/dashboard" className="block hover:text-white">
            Dashboard
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs">
        © {YEAR} EduConnect Sindh. A University of Sindh final year project.
      </div>
    </footer>
  );
}
