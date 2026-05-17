import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceStatus } from '@prisma/client';
import { TransactionsListener } from './transactions.listener';
import { TransactionsRepository } from './transactions.repository';
import { InvoicesRepository } from '../invoices/invoices.repository';
import { StorageService } from '../storage/storage.service';
import { ExtractionService } from '../extraction/extraction.service';
import { InvoiceCreatedEvent } from '../invoices/events/invoice-created.event';
import { ExtractedTransaction } from '../extraction/extraction.types';

const mockTransactionsRepository = { createMany: jest.fn() };
const mockInvoicesRepository = { updateStatus: jest.fn() };
const mockStorageService = { download: jest.fn() };
const mockExtractionService = { extract: jest.fn() };

const event = new InvoiceCreatedEvent('inv-1', 'user-1', 'dev/user-1/fatura.pdf');
const pdfBuffer = Buffer.from('pdf');
const extracted: ExtractedTransaction[] = [
  { date: '2026-04-05', description: 'IFOOD', amount: 45.9, type: 'debit', category: 'Other' },
];

describe('TransactionsListener', () => {
  let listener: TransactionsListener;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsListener,
        { provide: TransactionsRepository, useValue: mockTransactionsRepository },
        { provide: InvoicesRepository, useValue: mockInvoicesRepository },
        { provide: StorageService, useValue: mockStorageService },
        { provide: ExtractionService, useValue: mockExtractionService },
      ],
    }).compile();

    listener = module.get<TransactionsListener>(TransactionsListener);
    jest.resetAllMocks();
  });

  it('should download PDF, extract transactions, save them and mark invoice as DONE', async () => {
    mockStorageService.download.mockResolvedValue(pdfBuffer);
    mockExtractionService.extract.mockResolvedValue(extracted);

    await listener.handleInvoiceCreated(event);

    expect(mockStorageService.download).toHaveBeenCalledWith('invoices', event.storagePath);
    expect(mockExtractionService.extract).toHaveBeenCalledWith(pdfBuffer);
    expect(mockTransactionsRepository.createMany).toHaveBeenCalledWith('inv-1', extracted);
    expect(mockInvoicesRepository.updateStatus).toHaveBeenCalledWith('inv-1', InvoiceStatus.DONE);
  });

  it('should mark invoice as FAILED and not save transactions when extraction throws', async () => {
    mockStorageService.download.mockResolvedValue(pdfBuffer);
    mockExtractionService.extract.mockRejectedValue(new Error('sum check failed'));

    await listener.handleInvoiceCreated(event);

    expect(mockTransactionsRepository.createMany).not.toHaveBeenCalled();
    expect(mockInvoicesRepository.updateStatus).toHaveBeenCalledWith('inv-1', InvoiceStatus.FAILED);
  });

  it('should mark invoice as FAILED when PDF download throws', async () => {
    mockStorageService.download.mockRejectedValue(new Error('storage error'));

    await listener.handleInvoiceCreated(event);

    expect(mockExtractionService.extract).not.toHaveBeenCalled();
    expect(mockTransactionsRepository.createMany).not.toHaveBeenCalled();
    expect(mockInvoicesRepository.updateStatus).toHaveBeenCalledWith('inv-1', InvoiceStatus.FAILED);
  });
});
