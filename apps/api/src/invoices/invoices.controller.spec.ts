import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

const mockInvoicesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  delete: jest.fn(),
};

const billingMonthDto: CreateInvoiceDto = {
  billingMonth: '2025-09-01T00:00:00.000Z',
};

describe('InvoicesController', () => {
  let controller: InvoicesController;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: InvoicesService, useValue: mockInvoicesService }],
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

    it('should return invoiceId for a valid PDF', async () => {
      mockInvoicesService.create.mockResolvedValue({ invoiceId: 'inv-1' });

      const result = await controller.create(
        'user-1',
        pdfFile,
        billingMonthDto,
      );

      expect(result).toEqual({ invoiceId: 'inv-1' });
      expect(mockInvoicesService.create).toHaveBeenCalledWith(
        'user-1',
        pdfFile,
        new Date('2025-09-01T00:00:00.000Z'),
        undefined,
      );
    });

    it('should forward password from body to service', async () => {
      mockInvoicesService.create.mockResolvedValue({ invoiceId: 'inv-1' });

      await controller.create('user-1', pdfFile, billingMonthDto, 's3cret');

      expect(mockInvoicesService.create).toHaveBeenCalledWith(
        'user-1',
        pdfFile,
        new Date('2025-09-01T00:00:00.000Z'),
        's3cret',
      );
    });
  });

  describe('GET /invoices', () => {
    it('should return list of invoices for the authenticated user', async () => {
      const invoices = [
        {
          id: 'inv-1',
          filename: 'fatura.pdf',
          status: 'DONE',
          billingMonth: new Date('2025-09-01'),
        },
      ];
      mockInvoicesService.findAll.mockResolvedValue(invoices);

      const result = await controller.findAll('user-1');

      expect(mockInvoicesService.findAll).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(invoices);
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
