import {
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvoicesService } from './invoices.service';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { InvoiceDetailResponseDto } from './dto/invoice-detail-response.dto';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<{ invoiceId: string }> {
    return this.invoicesService.create(userId, file);
  }

  @Get()
  async findAll(@CurrentUser() userId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoicesService.findAll(userId);
    return invoices.map(InvoiceResponseDto.from);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoicesService.findById(id, userId);
    return InvoiceDetailResponseDto.from(invoice);
  }
}
