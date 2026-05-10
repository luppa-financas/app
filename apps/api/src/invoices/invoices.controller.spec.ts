import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

const mockInvoicesService = { create: jest.fn() };

describe('InvoicesController', () => {
  let controller: InvoicesController;

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        { provide: InvoicesService, useValue: mockInvoicesService },
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

    it('should return invoiceId for a valid PDF', async () => {
      mockInvoicesService.create.mockResolvedValue({ invoiceId: 'inv-1' });

      const result = await controller.create('user-1', pdfFile);

      expect(result).toEqual({ invoiceId: 'inv-1' });
      expect(mockInvoicesService.create).toHaveBeenCalledWith('user-1', pdfFile);
    });
  });
});
