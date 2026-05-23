/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { InvoiceBarChart } from './invoice-bar-chart';

jest.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
}));

const done = (billingMonth: string, total: number) => ({
  id: billingMonth,
  billingMonth,
  status: 'DONE' as const,
  total,
});

describe('InvoiceBarChart', () => {
  it('renders nothing when there are no invoices', () => {
    const { container } = render(<InvoiceBarChart invoices={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there is only one DONE invoice', () => {
    const { container } = render(
      <InvoiceBarChart invoices={[done('2025-01-01', 1200)]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the chart when there are two or more DONE invoices', () => {
    render(
      <InvoiceBarChart
        invoices={[done('2025-01-01', 1200), done('2025-02-01', 980)]}
      />,
    );
    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('excludes PENDING and FAILED invoices from the chart', () => {
    const invoices = [
      done('2025-01-01', 1200),
      { id: 'p', billingMonth: '2025-02-01', status: 'PENDING' as const, total: 0 },
      { id: 'f', billingMonth: '2025-03-01', status: 'FAILED' as const, total: 0 },
    ];
    const { container } = render(<InvoiceBarChart invoices={invoices} />);
    expect(container).toBeEmptyDOMElement();
  });
});
