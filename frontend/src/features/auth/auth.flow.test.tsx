import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import authReducer, { credentialsSet, loggedOut } from './authSlice';
import { baseApi } from '@/services/api/baseApi';
import { GuestRoute, ProtectedRoute } from '@/components/layout/RouteGuards';
import { LoginForm } from './LoginForm';

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, [baseApi.reducerPath]: baseApi.reducer },
    middleware: (g) => g().concat(baseApi.middleware),
  });
}

function renderAt(path: string, store = makeStore()) {
  const router = createMemoryRouter(
    [
      { element: <GuestRoute />, children: [{ path: '/login', element: <LoginForm /> }] },
      {
        element: <ProtectedRoute />,
        children: [{ path: '/dashboard', element: <div>secret</div> }],
      },
    ],
    { initialEntries: [path] },
  );
  render(
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>,
  );
  return store;
}

describe('route guards', () => {
  it('redirects guests from /dashboard to /login', () => {
    const store = makeStore();
    store.dispatch(loggedOut());
    renderAt('/dashboard', store);
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
  });

  it('lets authenticated users into /dashboard', () => {
    const store = makeStore();
    store.dispatch(
      credentialsSet({
        accessToken: 't',
        user: {
          id: '1',
          email: 'a@b.com',
          fullName: 'A',
          phone: null,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerified: false,
          createdAt: '',
        },
      }),
    );
    renderAt('/dashboard', store);
    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});

describe('LoginForm', () => {
  it('shows validation errors for empty submit', async () => {
    const store = makeStore();
    store.dispatch(loggedOut());
    renderAt('/login', store);
    await userEvent.click(screen.getByRole('button', { name: /^login$/i }));
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });
});
