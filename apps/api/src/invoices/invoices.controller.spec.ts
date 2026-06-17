import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesQueryService } from './invoices-query.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

const mockInvoicesService = {
  create: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn(),
};

const mockInvoicesQueryService = {
  list: jest.fn(),
  history: jest.fn(),
  summary: jest.fn(),
};

const emptyDto: CreateInvoiceDto = {};

describe('InvoicesController', () => {
  let controller: InvoicesController;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        { provide: InvoicesService, useValue: mockInvoicesService },
        { provide: InvoicesQueryService, useValue: mockInvoicesQueryService },
      ],
    }).compile();

    controller = module.get<InvoicesController>(InvoicesController);
  });

  describe('POST /invoices', () => {
    const pdfFile = {
      originalname: 'fatura.pdf',
      buffer: Buffer.from('pdf'),
      mimetype: 'application/pdf',
      size: 1024,
    } as Express.Multer.File;

    it('should return invoiceId for a valid PDF without any billingMonth in the body', async () => {
      mockInvoicesService.create.mockResolvedValue({ invoiceId: 'inv-1' });

      const result = await controller.create('user-1', pdfFile, emptyDto);

      expect(result).toEqual({ invoiceId: 'inv-1' });
      expect(mockInvoicesService.create).toHaveBeenCalledWith(
        'user-1',
        pdfFile,
        undefined,
      );
    });

    it('should ignore billingMonth if the legacy MVP body still sends it', async () => {
      mockInvoicesService.create.mockResolvedValue({ invoiceId: 'inv-1' });

      await controller.create('user-1', pdfFile, {
        billingMonth: '2025-09-01T00:00:00.000Z',
      });

      expect(mockInvoicesService.create).toHaveBeenCalledWith(
        'user-1',
        pdfFile,
        undefined,
      );
    });

    it('should forward password from body to service', async () => {
      mockInvoicesService.create.mockResolvedValue({ invoiceId: 'inv-1' });

      await controller.create('user-1', pdfFile, emptyDto, 's3cret');

      expect(mockInvoicesService.create).toHaveBeenCalledWith(
        'user-1',
        pdfFile,
        's3cret',
      );
    });
  });

  describe('GET /invoices', () => {
    it('calls queryService.list with userId and filters', async () => {
      mockInvoicesQueryService.list.mockResolvedValue([]);

      await controller.findAll('user-1', '2026-05', 'itau', 'DONE');

      expect(mockInvoicesQueryService.list).toHaveBeenCalledWith('user-1', {
        month: '2026-05',
        bank: 'itau',
        status: 'DONE',
      });
    });

    it('passes undefined filters when not provided', async () => {
      mockInvoicesQueryService.list.mockResolvedValue([]);

      await controller.findAll('user-1');

      expect(mockInvoicesQueryService.list).toHaveBeenCalledWith('user-1', {
        month: undefined,
        bank: undefined,
        status: undefined,
      });
    });

    it('returns the list from queryService directly', async () => {
      const items = [{ id: 'inv-1', bank: 'itau', invoiceTotal: 8102.44 }];
      mockInvoicesQueryService.list.mockResolvedValue(items);

      const result = await controller.findAll('user-1');

      expect(result).toBe(items);
    });
  });

  describe('GET /invoices/history', () => {
    it('calls queryService.history with months param', async () => {
      mockInvoicesQueryService.history.mockResolvedValue([]);

      await controller.history('user-1', 3);

      expect(mockInvoicesQueryService.history).toHaveBeenCalledWith(
        'user-1',
        3,
      );
    });

    it('defaults to 6 months when months param is not provided', async () => {
      mockInvoicesQueryService.history.mockResolvedValue([]);

      await controller.history('user-1');

      expect(mockInvoicesQueryService.history).toHaveBeenCalledWith(
        'user-1',
        6,
      );
    });

    it('returns the history array from queryService', async () => {
      const data = [{ month: '2026-05', byBank: { itau: 8000 } }];
      mockInvoicesQueryService.history.mockResolvedValue(data);

      const result = await controller.history('user-1');

      expect(result).toBe(data);
    });
  });

  describe('GET /invoices/summary', () => {
    it('calls queryService.summary with month param', async () => {
      mockInvoicesQueryService.summary.mockResolvedValue({
        total: 0,
        byCategory: [],
      });

      await controller.summary('user-1', '2026-05');

      expect(mockInvoicesQueryService.summary).toHaveBeenCalledWith(
        'user-1',
        '2026-05',
      );
    });

    it('throws BadRequestException when month param is missing', async () => {
      await expect(
        controller.summary('user-1', undefined as unknown as string),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns the summary from queryService', async () => {
      const data = { total: 1000, byCategory: [] };
      mockInvoicesQueryService.summary.mockResolvedValue(data);

      const result = await controller.summary('user-1', '2026-05');

      expect(result).toBe(data);
    });
  });

  describe('GET /invoices/:id', () => {
    it('should return invoice detail with transactions mapped to DTO', async () => {
      const txDate = new Date('2026-04-05');
      const billingMonth = new Date('2025-09-01');
      const invoice = {
        id: 'inv-1',
        filename: 'fatura.pdf',
        status: 'DONE',
        billingMonth,
        transactions: [
          {
            id: 'tx-1',
            invoiceId: 'inv-1',
            date: txDate,
            description: 'UBER',
            alias: null,
            amount: 18.5,
            type: 'DEBIT',
            category: 'Other',
            subcategory: null,
            confidence: null,
            needsReview: false,
            createdAt: new Date(),
          },
        ],
      };
      mockInvoicesService.findById.mockResolvedValue(invoice);

      const result = await controller.findOne('inv-1', 'user-1');

      expect(mockInvoicesService.findById).toHaveBeenCalledWith(
        'inv-1',
        'user-1',
      );
      expect(result).toEqual({
        id: 'inv-1',
        filename: 'fatura.pdf',
        status: 'DONE',
        billingMonth,
        transactions: [
          {
            id: 'tx-1',
            date: txDate,
            description: 'UBER',
            alias: null,
            amount: 18.5,
            type: 'DEBIT',
            category: 'Other',
            subcategory: null,
            confidence: null,
            needsReview: false,
          },
        ],
      });
    });

    it('should propagate NotFoundException when invoice is not found', async () => {
      mockInvoicesService.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('inv-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('DELETE /invoices/:id', () => {
    it('should return undefined (204) when deletion succeeds', async () => {
      mockInvoicesService.delete.mockResolvedValue(undefined);

      const result = await controller.delete('inv-1', 'user-1');

      expect(mockInvoicesService.delete).toHaveBeenCalledWith(
        'inv-1',
        'user-1',
      );
      expect(result).toBeUndefined();
    });

    it('should propagate NotFoundException when invoice is not found', async () => {
      mockInvoicesService.delete.mockRejectedValue(new NotFoundException());

      await expect(controller.delete('inv-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
