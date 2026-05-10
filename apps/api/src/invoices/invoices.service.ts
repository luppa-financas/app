import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StorageService } from '../storage/storage.service';
import { InvoicesRepository } from './invoices.repository';
import { InvoiceCreatedEvent } from './events/invoice-created.event';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly storageService: StorageService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(userId: string, file: Express.Multer.File): Promise<{ invoiceId: string }> {
    const storagePath = await this.storageService.upload(
      'invoices',
      `${userId}/${Date.now()}-${file.originalname}`,
      file.buffer,
      file.mimetype,
    );

    const invoice = await this.invoicesRepository.create({
      userId,
      filename: file.originalname,
      storagePath,
    });

    this.eventEmitter.emit('invoice.created', new InvoiceCreatedEvent(invoice.id, userId, storagePath));

    return { invoiceId: invoice.id };
  }
}
