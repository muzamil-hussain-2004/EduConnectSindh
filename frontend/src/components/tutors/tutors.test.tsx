import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import authReducer, { credentialsSet } from '@/features/auth/authSlice';
import { baseApi } from '@/services/api/baseApi';
import { ProtectedRoute } from '@/components/layout/RouteGuards';
import { TutorCard } from '@/components/tutors/TutorCard';
import type { Role, TutorSummary } from '@/types/api';

const store = () =>
  configureStore({
    reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (g) => g().concat(baseApi.middleware),
  });

const tutor: TutorSummary = {
  id: 't1',
  fullName: 'Ayesha Khan',
  headline: 'Maths and physics specialist',
  qualification: 'MSc Physics',
  experienceYears: 4,
  hourlyRate: 1500,
  teachingMode: 'BOTH',
  verificationStatus: 'VERIFIED',
  ratingAvg: 4.5,
  ratingCount: 8,
  subjects: [{ id: 's1', name: 'Physics' }],
  areas: [],
};

function renderWith(routes: Parameters<typeof createMemoryRouter>[0], path: string, role?: Role) {
  const s = store();
  if (role)
    s.dispatch(
      credentialsSet({
        accessToken: 'x',
        user: {
          id: 'u1',
          email: 'a@b.c',
          fullName: 'U',
          phone: null,
          role,
          status: 'ACTIVE',
          emailVerified: false,
          createdAt: '',
        },
      }),
    );
  render(
    <Provider store={s}>
      <RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />
    </Provider>,
  );
}

describe('role-based routing', () => {
  const routes = [
    { path: '/dashboard', element: <div>overview</div> },
    {
      element: <ProtectedRoute roles={['ADMIN']} />,
      children: [{ path: '/admin', element: <div>admin area</div> }],
    },
  ];

  it('sends a student away from admin pages', () => {
    renderWith(routes, '/admin', 'STUDENT');
    expect(screen.getByText('overview')).toBeInTheDocument();
  });

  it('lets an admin in', () => {
    renderWith(routes, '/admin', 'ADMIN');
    expect(screen.getByText('admin area')).toBeInTheDocument();
  });
});

describe('TutorCard', () => {
  it('shows key tutor facts and links to the profile', () => {
    renderWith([{ path: '/', element: <TutorCard tutor={tutor} /> }], '/');
    expect(screen.getByRole('link', { name: 'Ayesha Khan' })).toHaveAttribute('href', '/tutors/t1');
    expect(screen.getByText('Physics')).toBeInTheDocument();
    expect(screen.getByText(/PKR 1,500/)).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });
});
