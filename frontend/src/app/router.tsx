import { createBrowserRouter } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { GuestRoute, ProtectedRoute } from '@/components/layout/RouteGuards';
import { AdminReviewsPage } from '@/pages/dashboard/AdminReviewsPage';
import { AdminVerificationPage } from '@/pages/dashboard/AdminVerificationPage';
import { NotificationsPage } from '@/pages/dashboard/NotificationsPage';
import { OverviewPage } from '@/pages/dashboard/OverviewPage';
import { IncomingRequestsPage, MyRequestsPage } from '@/pages/dashboard/RequestsPages';
import { ShortlistPage } from '@/pages/dashboard/ShortlistPage';
import { TutorProfilePage } from '@/pages/dashboard/TutorProfilePage';
import { VerificationPage } from '@/pages/dashboard/VerificationPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { TutorDetailPage } from '@/pages/TutorDetailPage';
import { TutorsPage } from '@/pages/TutorsPage';

export const routes = [
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/tutors', element: <TutorsPage /> },
      { path: '/tutors/:id', element: <TutorDetailPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/dashboard',
            element: <DashboardLayout />,
            children: [
              { index: true, element: <OverviewPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              {
                element: <ProtectedRoute roles={['STUDENT', 'PARENT']} />,
                children: [
                  { path: 'requests', element: <MyRequestsPage /> },
                  { path: 'shortlist', element: <ShortlistPage /> },
                ],
              },
              {
                element: <ProtectedRoute roles={['TUTOR']} />,
                children: [
                  { path: 'incoming', element: <IncomingRequestsPage /> },
                  { path: 'profile', element: <TutorProfilePage /> },
                  { path: 'verification', element: <VerificationPage /> },
                ],
              },
              {
                element: <ProtectedRoute roles={['ADMIN']} />,
                children: [
                  { path: 'admin/verification', element: <AdminVerificationPage /> },
                  { path: 'admin/reviews', element: <AdminReviewsPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
