import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InvoiceStatus } from '@prisma/client';
import { InvoiceCreatedEvent } from '../invoices/events/invoice-created.event';
import { StorageService } from '../storage/storage.service';
import { INVOICES_BUCKET } from '../storage/storage.constants';
import { ExtractionService } from '../extraction/extraction.service';
import { CategorizationService } from '../categorization/categorization.service';
import { TransactionsRepository } from './transactions.repository';
import { InvoicesRepository } from '../invoices/invoices.repository';

@Injectable()
export class TransactionsListener {
  private readonly logger = new Logger(TransactionsListener.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly extractionService: ExtractionService,
    private readonly categorizationService: CategorizationService,
    private readonly transactionsRepository: TransactionsRepository,
    private readonly invoicesRepository: InvoicesRepository,
  ) {}

  @OnEvent('invoice.created')
  async handleInvoiceCreated(event: InvoiceCreatedEvent): Promise<void> {
    try {
      const pdf = await this.storageService.download(
        INVOICES_BUCKET,
        event.storagePath,
      );
      const extracted = await this.extractionService.extract(pdf, event.billingMonth);
      const classifications =
        await this.categorizationService.classifyMany(extracted);
      const transactions = extracted.map((t, i) => ({
        ...t,
        ...classifications[i],
      }));
      await this.transactionsRepository.createMany(
        event.invoiceId,
        transactions,
      );
      await this.invoicesRepository.updateStatus(
        event.invoiceId,
        InvoiceStatus.DONE,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process invoice ${event.invoiceId}`,
        error instanceof Error ? error.stack : String(error),
      );
      await this.invoicesRepository.updateStatus(
        event.invoiceId,
        InvoiceStatus.FAILED,
      );
    }
  }
}
