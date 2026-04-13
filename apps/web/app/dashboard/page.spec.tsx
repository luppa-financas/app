/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

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

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user email when authenticated', async () => {
    mockCurrentUser.mockResolvedValue({
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    } as any);

    render(await DashboardPage());

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('redirects to /sign-in when not authenticated', async () => {
    mockCurrentUser.mockResolvedValue(null);
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });

    await expect(DashboardPage()).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/sign-in');
  });
});
