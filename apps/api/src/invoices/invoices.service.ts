import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { StorageService } from '../storage/storage.service';
import { INVOICES_BUCKET } from '../storage/storage.constants';
import {
  InvoicesRepository,
  InvoiceWithDebits,
  InvoiceWithTransactions,
} from './invoices.repository';
import { InvoiceCreatedEvent } from './events/invoice-created.event';
import {
  PdfDecryptionService,
  WrongPasswordError,
} from './pdf-decryption.service';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly invoicesRepository: InvoicesRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly pdfDecryptionService: PdfDecryptionService,
  ) {}

  private isEncryptedPdf(buffer: Buffer): boolean {
    return buffer.toString('latin1').includes('/Encrypt');
  }

  async create(
    userId: string,
    file: Express.Multer.File,
    password?: string,
  ): Promise<{ invoiceId: string }> {
    let buffer = file.buffer;

    if (this.isEncryptedPdf(buffer)) {
      if (!password) {
        throw new UnprocessableEntityException(
          'PDF protegido por senha. Remova a senha antes de enviar.',
        );
      }
      try {
        buffer = await this.pdfDecryptionService.decrypt(buffer, password);
      } catch (err) {
        if (err instanceof WrongPasswordError) {
          throw new UnprocessableEntityException({
            message: 'Senha incorreta',
            code: 'WRONG_PASSWORD',
          });
        }
        throw err;
      }
    }

    const storagePath = await this.storageService.upload(
      INVOICES_BUCKET,
      `${userId}/${Date.now()}-${file.originalname}`,
      buffer,
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

  async findAll(userId: string): Promise<InvoiceWithDebits[]> {
    return this.invoicesRepository.findAllByUserIdWithDebits(userId);
  }

  async findById(id: string, userId: string): Promise<InvoiceWithTransactions> {
    const invoice = await this.invoicesRepository.findByIdWithTransactions(
      id,
      userId,
    );
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async delete(id: string, userId: string): Promise<void> {
    const invoice = await this.invoicesRepository.findById(id, userId);
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);

    const { storagePath } = invoice;
    await this.invoicesRepository.deleteById(id, userId);

    try {
      await this.storageService.delete(INVOICES_BUCKET, storagePath);
    } catch (err) {
      this.logger.error(
        `Failed to delete storage file for invoice ${id}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
