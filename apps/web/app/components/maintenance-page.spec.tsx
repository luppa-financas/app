/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MaintenancePage } from './maintenance-page';

describe('MaintenancePage', () => {
  it('renders the app name', () => {
    render(<MaintenancePage />);

    expect(screen.getByText('Luppa')).toBeInTheDocument();
  });

  it('renders a message informing the site is under construction', () => {
    render(<MaintenancePage />);

    expect(screen.getByText(/em construção/i)).toBeInTheDocument();
  });
});
