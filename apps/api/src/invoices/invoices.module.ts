import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesRepository } from './invoices.repository';
import { PdfDecryptionService } from './pdf-decryption.service';

@Module({
  imports: [StorageModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, InvoicesRepository, PdfDecryptionService],
  exports: [InvoicesRepository],
})
export class InvoicesModule {}
