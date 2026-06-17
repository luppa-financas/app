import { Test, TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { InvoicesQueryService } from './invoices-query.service';
import { InvoicesRepository } from './invoices.repository';

const mockInvoicesRepository = {
  findAllWithFilters: jest.fn(),
  findHistory: jest.fn(),
  findSummaryByMonth: jest.fn(),
};

describe('InvoicesQueryService', () => {
  let service: InvoicesQueryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesQueryService,
        { provide: InvoicesRepository, useValue: mockInvoicesRepository },
      ],
    }).compile();

    service = module.get(InvoicesQueryService);
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('passes userId and filters to repository', async () => {
      mockInvoicesRepository.findAllWithFilters.mockResolvedValue([]);

      await service.list('user-1', { month: '2026-05', bank: 'itau' });

      expect(mockInvoicesRepository.findAllWithFilters).toHaveBeenCalledWith(
        'user-1',
        { month: '2026-05', bank: 'itau' },
      );
    });

    it('maps repository result to InvoiceListItemDto shape', async () => {
      mockInvoicesRepository.findAllWithFilters.mockResolvedValue([
        {
          id: 'inv-1',
          filename: 'fatura.pdf',
          status: 'DONE',
          bank: 'itau',
          billingMonth: new Date('2026-05-01T00:00:00.000Z'),
          invoiceTotal: new Decimal('8102.44'),
          createdAt: new Date('2026-05-20T00:00:00.000Z'),
          _count: { transactions: 42 },
          transactions: [],
        },
      ]);

      const result = await service.list('user-1', {});

      expect(result).toEqual([
        {
          id: 'inv-1',
          filename: 'fatura.pdf',
          status: 'DONE',
          bank: 'itau',
          billingMonth: new Date('2026-05-01T00:00:00.000Z'),
          invoiceTotal: 8102.44,
          total: 8102.44,
          transactionCount: 42,
          createdAt: new Date('2026-05-20T00:00:00.000Z'),
        },
      ]);
    });

    it('handles null bank and invoiceTotal', async () => {
      mockInvoicesRepository.findAllWithFilters.mockResolvedValue([
        {
          id: 'inv-2',
          filename: 'pending.pdf',
          status: 'PENDING',
          bank: null,
          billingMonth: null,
          invoiceTotal: null,
          createdAt: new Date('2026-05-20T00:00:00.000Z'),
          _count: { transactions: 0 },
          transactions: [],
        },
      ]);

      const result = await service.list('user-1', {});

      expect(result[0]).toMatchObject({
        bank: null,
        billingMonth: null,
        invoiceTotal: null,
        transactionCount: 0,
      });
    });
  });

  describe('history', () => {
    it('calls repository with userId and months', async () => {
      mockInvoicesRepository.findHistory.mockResolvedValue([]);

      await service.history('user-1', 6);

      expect(mockInvoicesRepository.findHistory).toHaveBeenCalledWith(
        'user-1',
        6,
      );
    });

    it('aggregates invoiceTotals by YYYY-MM month string and bank', async () => {
      mockInvoicesRepository.findHistory.mockResolvedValue([
        {
          billingMonth: new Date('2026-05-01'),
          bank: 'itau',
          invoiceTotal: new Decimal('8000'),
        },
        {
          billingMonth: new Date('2026-05-01'),
          bank: 'nubank',
          invoiceTotal: new Decimal('1200'),
        },
        {
          billingMonth: new Date('2026-04-01'),
          bank: 'itau',
          invoiceTotal: new Decimal('7500'),
        },
      ]);

      const result = await service.history('user-1', 6);

      expect(result).toHaveLength(2);
      expect(result).toContainEqual({
        month: '2026-05',
        byBank: { itau: 8000, nubank: 1200 },
      });
      expect(result).toContainEqual({
        month: '2026-04',
        byBank: { itau: 7500 },
      });
    });

    it('orders months chronologically (oldest first)', async () => {
      mockInvoicesRepository.findHistory.mockResolvedValue([
        {
          billingMonth: new Date('2026-05-01'),
          bank: 'itau',
          invoiceTotal: new Decimal('8000'),
        },
        {
          billingMonth: new Date('2026-03-01'),
          bank: 'itau',
          invoiceTotal: new Decimal('6000'),
        },
        {
          billingMonth: new Date('2026-04-01'),
          bank: 'itau',
          invoiceTotal: new Decimal('7000'),
        },
      ]);

      const result = await service.history('user-1', 6);

      expect(result.map((r) => r.month)).toEqual([
        '2026-03',
        '2026-04',
        '2026-05',
      ]);
    });

    it('skips invoices with null billingMonth or null bank', async () => {
      mockInvoicesRepository.findHistory.mockResolvedValue([
        {
          billingMonth: null,
          bank: 'itau',
          invoiceTotal: new Decimal('8000'),
        },
        {
          billingMonth: new Date('2026-05-01'),
          bank: null,
          invoiceTotal: new Decimal('1200'),
        },
        {
          billingMonth: new Date('2026-05-01'),
          bank: 'nubank',
          invoiceTotal: new Decimal('950'),
        },
      ]);

      const result = await service.history('user-1', 6);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        month: '2026-05',
        byBank: { nubank: 950 },
      });
    });
  });

  describe('summary', () => {
    it('calls findSummaryByMonth with userId and month', async () => {
      mockInvoicesRepository.findSummaryByMonth.mockResolvedValue([]);

      await service.summary('user-1', '2026-05');

      expect(mockInvoicesRepository.findSummaryByMonth).toHaveBeenCalledWith(
        'user-1',
        '2026-05',
      );
    });

    it('returns total as sum of all category amounts', async () => {
      mockInvoicesRepository.findSummaryByMonth.mockResolvedValue([
        {
          category: 'Alimentação',
          subcategory: 'Delivery',
          _sum: { amount: new Decimal('216.00') },
        },
        {
          category: 'Transporte',
          subcategory: null,
          _sum: { amount: new Decimal('150.00') },
        },
      ]);

      const result = await service.summary('user-1', '2026-05');

      expect(result.total).toBeCloseTo(366, 2);
    });

    it('sorts byCategory by amount descending', async () => {
      mockInvoicesRepository.findSummaryByMonth.mockResolvedValue([
        {
          category: 'Transporte',
          subcategory: null,
          _sum: { amount: new Decimal('150.00') },
        },
        {
          category: 'Alimentação',
          subcategory: 'Delivery',
          _sum: { amount: new Decimal('800.00') },
        },
        {
          category: 'Outros',
          subcategory: null,
          _sum: { amount: new Decimal('50.00') },
        },
      ]);

      const result = await service.summary('user-1', '2026-05');

      expect(result.byCategory.map((c) => c.category)).toEqual([
        'Alimentação',
        'Transporte',
        'Outros',
      ]);
    });

    it('returns empty summary when no groups found for the month', async () => {
      mockInvoicesRepository.findSummaryByMonth.mockResolvedValue([]);

      const result = await service.summary('user-1', '2026-05');

      expect(result).toEqual({ total: 0, byCategory: [] });
    });

    it('maps Decimal amounts to numbers in byCategory', async () => {
      mockInvoicesRepository.findSummaryByMonth.mockResolvedValue([
        {
          category: 'Alimentação',
          subcategory: 'Supermercado',
          _sum: { amount: new Decimal('1080.50') },
        },
      ]);

      const result = await service.summary('user-1', '2026-05');

      expect(typeof result.byCategory[0].amount).toBe('number');
      expect(result.byCategory[0].amount).toBeCloseTo(1080.5, 2);
    });
  });
});
