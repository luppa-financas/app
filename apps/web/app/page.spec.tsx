/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import HomePage from './page';

jest.mock('@clerk/nextjs/server', () => ({
  currentUser: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const mockCurrentUser = currentUser as jest.MockedFunction<typeof currentUser>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /dashboard when authenticated', async () => {
    mockCurrentUser.mockResolvedValue({ id: 'user_123' } as any);
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });

    await expect(HomePage()).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('renders app name when not authenticated', async () => {
    mockCurrentUser.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByText('Luppa')).toBeInTheDocument();
  });

  it('renders sign-in link when not authenticated', async () => {
    mockCurrentUser.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/sign-in');
  });

  it('renders sign-up link when not authenticated', async () => {
    mockCurrentUser.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByRole('link', { name: /sign up/i })).toHaveAttribute('href', '/sign-up');
  });
});
