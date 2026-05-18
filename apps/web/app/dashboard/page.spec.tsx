/**
 * @jest-environment jsdom
 */
import DashboardPage from './page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

import { redirect } from 'next/navigation';

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;

describe('DashboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /mvp', () => {
    mockRedirect.mockImplementation(() => { throw new Error('REDIRECT'); });

    expect(() => DashboardPage()).toThrow('REDIRECT');
    expect(mockRedirect).toHaveBeenCalledWith('/mvp');
  });
});
