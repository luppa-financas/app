import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { StorageService } from '../storage/storage.service';
import { InvoiceCreatedEvent } from './events/invoice-created.event';
import {
  PdfDecryptionService,
  WrongPasswordError,
} from './pdf-decryption.service';

const mockStorageService = { upload: jest.fn(), delete: jest.fn() };
const mockInvoicesRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findAllByUserId: jest.fn(),
  findByIdWithTransactions: jest.fn(),
  deleteById: jest.fn(),
};
const mockEventEmitter = { emit: jest.fn() };
const mockPdfDecryptionService = { decrypt: jest.fn() };

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
      { provide: PdfDecryptionService, useValue: mockPdfDecryptionService },
      {
        provide: ConfigService,
        useValue: { get: jest.fn().mockReturnValue(nodeEnv) },
      },
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
      mockInvoicesRepository.create.mockResolvedValue({
        id: 'inv-1',
        userId: 'user-1',
        storagePath: 'dev/user-1/fatura.pdf',
      });
      const billingMonth = new Date('2025-09-01');

      const result = await service.create('user-1', file, billingMonth);

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
        billingMonth,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'invoice.created',
        expect.any(InvoiceCreatedEvent),
      );
      expect(result).toEqual({ invoiceId: 'inv-1' });
    });

    it('should not create invoice if upload fails', async () => {
      mockStorageService.upload.mockRejectedValue(
        new InternalServerErrorException('upload failed'),
      );

      await expect(
        service.create('user-1', file, new Date('2025-09-01')),
      ).rejects.toThrow(InternalServerErrorException);
      expect(mockInvoicesRepository.create).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should not emit event if repository create fails', async () => {
      mockStorageService.upload.mockResolvedValue('dev/user-1/fatura.pdf');
      mockInvoicesRepository.create.mockRejectedValue(new Error('db error'));

      await expect(
        service.create('user-1', file, new Date('2025-09-01')),
      ).rejects.toThrow();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('create — encrypted PDF', () => {
    let service: InvoicesService;
    const encryptedBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Encrypt 2 0 R >>\nendobj',
    );
    const encryptedFile = {
      ...file,
      buffer: encryptedBuffer,
    } as Express.Multer.File;

    beforeEach(async () => {
      service = await createService('development');
    });

    it('should throw UnprocessableEntityException when no password is provided', async () => {
      await expect(
        service.create('user-1', encryptedFile, new Date('2025-09-01')),
      ).rejects.toThrow(UnprocessableEntityException);
      expect(mockStorageService.upload).not.toHaveBeenCalled();
      expect(mockPdfDecryptionService.decrypt).not.toHaveBeenCalled();
    });

    it('should decrypt and upload the decrypted buffer when password is correct', async () => {
      const decrypted = Buffer.from('decrypted-pdf');
      mockPdfDecryptionService.decrypt.mockResolvedValue(decrypted);
      mockStorageService.upload.mockResolvedValue('dev/user-1/fatura.pdf');
      mockInvoicesRepository.create.mockResolvedValue({
        id: 'inv-1',
        userId: 'user-1',
        storagePath: 'dev/user-1/fatura.pdf',
      });

      const result = await service.create(
        'user-1',
        encryptedFile,
        new Date('2025-09-01'),
        's3cret',
      );

      expect(mockPdfDecryptionService.decrypt).toHaveBeenCalledWith(
        encryptedBuffer,
        's3cret',
      );
      expect(mockStorageService.upload).toHaveBeenCalledWith(
        'invoices',
        expect.stringMatching(/^dev\/user-1\//),
        decrypted,
        'application/pdf',
      );
      expect(result).toEqual({ invoiceId: 'inv-1' });
    });

    it('should throw 422 with code WRONG_PASSWORD when password is wrong', async () => {
      mockPdfDecryptionService.decrypt.mockRejectedValue(
        new WrongPasswordError(),
      );

      const err = await service
        .create('user-1', encryptedFile, new Date('2025-09-01'), 'wrong')
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(UnprocessableEntityException);
      expect((err as UnprocessableEntityException).getResponse()).toMatchObject(
        {
          message: 'Senha incorreta',
          code: 'WRONG_PASSWORD',
        },
      );
      expect(mockStorageService.upload).not.toHaveBeenCalled();
    });

    it('should propagate non-WrongPassword errors from decryption', async () => {
      mockPdfDecryptionService.decrypt.mockRejectedValue(
        new Error('qpdf exited with code 3: corrupt'),
      );

      await expect(
        service.create(
          'user-1',
          encryptedFile,
          new Date('2025-09-01'),
          's3cret',
        ),
      ).rejects.toThrow(/qpdf/);
      expect(mockStorageService.upload).not.toHaveBeenCalled();
    });
  });

  describe('create (production)', () => {
    let service: InvoicesService;

    beforeEach(async () => {
      service = await createService('production');
    });

    it('should upload under prod/ prefix', async () => {
      mockStorageService.upload.mockResolvedValue('prod/user-1/fatura.pdf');
      mockInvoicesRepository.create.mockResolvedValue({
        id: 'inv-1',
        userId: 'user-1',
        storagePath: 'prod/user-1/fatura.pdf',
      });

      await service.create('user-1', file, new Date('2025-09-01'));

      expect(mockStorageService.upload).toHaveBeenCalledWith(
        'invoices',
        expect.stringMatching(/^prod\/user-1\//),
        file.buffer,
        'application/pdf',
      );
    });
  });

  describe('findAll', () => {
    let service: InvoicesService;

    beforeEach(async () => {
      service = await createService('development');
    });

    it('should return invoices for the given userId', async () => {
      const invoices = [{ id: 'inv-1', userId: 'user-1' }];
      mockInvoicesRepository.findAllByUserId.mockResolvedValue(invoices);

      const result = await service.findAll('user-1');

      expect(mockInvoicesRepository.findAllByUserId).toHaveBeenCalledWith(
        'user-1',
      );
      expect(result).toBe(invoices);
    });
  });

  describe('findById', () => {
    let service: InvoicesService;

    beforeEach(async () => {
      service = await createService('development');
    });

    it('should return the invoice with transactions when found', async () => {
      const invoice = { id: 'inv-1', userId: 'user-1', transactions: [] };
      mockInvoicesRepository.findByIdWithTransactions.mockResolvedValue(
        invoice,
      );

      const result = await service.findById('inv-1', 'user-1');

      expect(
        mockInvoicesRepository.findByIdWithTransactions,
      ).toHaveBeenCalledWith('inv-1', 'user-1');
      expect(result).toBe(invoice);
    });

    it('should throw NotFoundException when invoice is not found', async () => {
      mockInvoicesRepository.findByIdWithTransactions.mockResolvedValue(null);

      await expect(service.findById('inv-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    let service: InvoicesService;

    beforeEach(async () => {
      service = await createService('development');
    });

    it('should throw NotFoundException when invoice is not found', async () => {
      mockInvoicesRepository.findById.mockResolvedValue(null);

      await expect(service.delete('inv-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call deleteById and storageService.delete on success', async () => {
      mockInvoicesRepository.findById.mockResolvedValue({
        id: 'inv-1',
        storagePath: 'dev/user-1/fatura.pdf',
      });
      mockInvoicesRepository.deleteById.mockResolvedValue(undefined);
      mockStorageService.delete.mockResolvedValue(undefined);

      await service.delete('inv-1', 'user-1');

      expect(mockInvoicesRepository.deleteById).toHaveBeenCalledWith(
        'inv-1',
        'user-1',
      );
      expect(mockStorageService.delete).toHaveBeenCalledWith(
        'invoices',
        'dev/user-1/fatura.pdf',
      );
    });

    it('should not throw when storageService.delete fails', async () => {
      mockInvoicesRepository.findById.mockResolvedValue({
        id: 'inv-1',
        storagePath: 'dev/user-1/fatura.pdf',
      });
      mockInvoicesRepository.deleteById.mockResolvedValue(undefined);
      mockStorageService.delete.mockRejectedValue(new Error('storage error'));

      await expect(service.delete('inv-1', 'user-1')).resolves.toBeUndefined();
    });

    it('should log error when storageService.delete fails', async () => {
      mockInvoicesRepository.findById.mockResolvedValue({
        id: 'inv-1',
        storagePath: 'dev/user-1/fatura.pdf',
      });
      mockInvoicesRepository.deleteById.mockResolvedValue(undefined);
      mockStorageService.delete.mockRejectedValue(new Error('storage error'));
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      await service.delete('inv-1', 'user-1');

      expect(loggerSpy).toHaveBeenCalled();
    });
  });
});
