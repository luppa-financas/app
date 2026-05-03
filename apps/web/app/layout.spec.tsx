/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

jest.mock('@clerk/nextjs', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock('@clerk/localizations', () => ({
  ptBR: {},
}));

jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));

jest.mock('./globals.css', () => ({}));

describe('RootLayout', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('renders MaintenancePage when NEXT_PUBLIC_MAINTENANCE_MODE is true', () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = 'true';

    const { default: RootLayout } = require('./layout');

    render(
      <RootLayout>
        <div>normal content</div>
      </RootLayout>,
    );

    expect(screen.getByText('Luppa')).toBeInTheDocument();
    expect(screen.getByText(/em construção/i)).toBeInTheDocument();
    expect(screen.queryByText('normal content')).not.toBeInTheDocument();
  });

  it('renders children when NEXT_PUBLIC_MAINTENANCE_MODE is false', () => {
    process.env.NEXT_PUBLIC_MAINTENANCE_MODE = 'false';

    const { default: RootLayout } = require('./layout');

    render(
      <RootLayout>
        <div>normal content</div>
      </RootLayout>,
    );

    expect(screen.getByText('normal content')).toBeInTheDocument();
  });

  it('renders children when NEXT_PUBLIC_MAINTENANCE_MODE is not set', () => {
    delete process.env.NEXT_PUBLIC_MAINTENANCE_MODE;

    const { default: RootLayout } = require('./layout');

    render(
      <RootLayout>
        <div>normal content</div>
      </RootLayout>,
    );

    expect(screen.getByText('normal content')).toBeInTheDocument();
  });
});
