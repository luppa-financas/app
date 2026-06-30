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

jest.mock('./components/landing/analytics-chart', () => ({
  AnalyticsChart: () => <div data-testid="analytics-chart-stub" />,
}));

class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
}
global.IntersectionObserver = IntersectionObserverStub as unknown as typeof IntersectionObserver;

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

const mockCurrentUser = currentUser as jest.MockedFunction<typeof currentUser>;
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /dashboard when authenticated', async () => {
    mockCurrentUser.mockResolvedValue({ id: 'user_123' } as never);
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });

    await expect(HomePage()).rejects.toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('renders the landing page without crashing for unauthenticated users', async () => {
    mockCurrentUser.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getAllByText('luppa').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /entrar/i })).toHaveAttribute('href', '/sign-in');
    expect(screen.getAllByRole('link', { name: /começar grátis/i })[0]).toHaveAttribute('href', '/sign-up');
    expect(screen.getByRole('heading', { level: 1, name: /entenda pra onde/i })).toBeInTheDocument();
    expect(screen.getByText(/três passos\. sem complicação\./i)).toBeInTheDocument();
  });
});
