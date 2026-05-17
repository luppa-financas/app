import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Invoice } from '@prisma/client';
import { StorageService } from '../storage/storage.service';
import { INVOICES_BUCKET } from '../storage/storage.constants';
import { InvoicesRepository, InvoiceWithTransactions } from './invoices.repository';
import { InvoiceCreatedEvent } from './events/invoice-created.event';

@Injectable()
export class InvoicesService {
  private readonly envPrefix: string;

  constructor(
    private readonly storageService: StorageService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly eventEmitter: EventEmitter2,
    config: ConfigService,
  ) {
    this.envPrefix =
      config.get<string>('NODE_ENV') === 'production' ? 'prod' : 'dev';
  }

  async create(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ invoiceId: string }> {
    const storagePath = await this.storageService.upload(
      INVOICES_BUCKET,
      `${this.envPrefix}/${userId}/${Date.now()}-${file.originalname}`,
      file.buffer,
      file.mimetype,
    );

    const invoice = await this.invoicesRepository.create({
      userId,
      filename: file.originalname,
      storagePath,
    });

    this.eventEmitter.emit(
      'invoice.created',
      new InvoiceCreatedEvent(invoice.id, userId, storagePath),
    );

    return { invoiceId: invoice.id };
  }

  async findAll(userId: string): Promise<Invoice[]> {
    return this.invoicesRepository.findAllByUserId(userId);
  }

  async findById(id: string, userId: string): Promise<InvoiceWithTransactions> {
    const invoice = await this.invoicesRepository.findByIdWithTransactions(id, userId);
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }
}
