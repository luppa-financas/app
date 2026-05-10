import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { StorageService } from '../storage/storage.service';
import { InvoiceCreatedEvent } from './events/invoice-created.event';

const mockStorageService = { upload: jest.fn() };
const mockInvoicesRepository = { create: jest.fn() };
const mockEventEmitter = { emit: jest.fn() };

const file = {
  originalname: 'fatura.pdf',
  buffer: Buffer.from('pdf'),
  mimetype: 'application/pdf',
} as Express.Multer.File;

async function createService(nodeEnv: string): Promise<InvoicesService> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      InvoicesService,
      { provide: StorageService, useValue: mockStorageService },
      { provide: InvoicesRepository, useValue: mockInvoicesRepository },
      { provide: EventEmitter2, useValue: mockEventEmitter },
      { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(nodeEnv) } },
    ],
  }).compile();
  return module.get<InvoicesService>(InvoicesService);
}

describe('InvoicesService', () => {
  beforeEach(() => jest.resetAllMocks());

  describe('create (development)', () => {
    let service: InvoicesService;

    beforeEach(async () => {
      service = await createService('development');
    });

    it('should upload under dev/ prefix, create invoice, emit event and return invoiceId', async () => {
      mockStorageService.upload.mockResolvedValue('dev/user-1/fatura.pdf');
      mockInvoicesRepository.create.mockResolvedValue({ id: 'inv-1', userId: 'user-1', storagePath: 'dev/user-1/fatura.pdf' });

      const result = await service.create('user-1', file);

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        'invoices',
        expect.stringMatching(/^dev\/user-1\//),
        file.buffer,
        'application/pdf',
      );
      expect(mockInvoicesRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        filename: 'fatura.pdf',
        storagePath: 'dev/user-1/fatura.pdf',
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'invoice.created',
        expect.any(InvoiceCreatedEvent),
      );
      expect(result).toEqual({ invoiceId: 'inv-1' });
    });

    it('should not create invoice if upload fails', async () => {
      mockStorageService.upload.mockRejectedValue(new InternalServerErrorException('upload failed'));

      await expect(service.create('user-1', file)).rejects.toThrow(InternalServerErrorException);
      expect(mockInvoicesRepository.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not emit event if repository create fails', async () => {
      mockStorageService.upload.mockResolvedValue('dev/user-1/fatura.pdf');
      mockInvoicesRepository.create.mockRejectedValue(new Error('db error'));

      await expect(service.create('user-1', file)).rejects.toThrow();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('create (production)', () => {
    let service: InvoicesService;

    beforeEach(async () => {
      service = await createService('production');
    });

    it('should upload under prod/ prefix', async () => {
      mockStorageService.upload.mockResolvedValue('prod/user-1/fatura.pdf');
      mockInvoicesRepository.create.mockResolvedValue({ id: 'inv-1', userId: 'user-1', storagePath: 'prod/user-1/fatura.pdf' });

      await service.create('user-1', file);

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        'invoices',
        expect.stringMatching(/^prod\/user-1\//),
        file.buffer,
        'application/pdf',
      );
    });
  });
});
