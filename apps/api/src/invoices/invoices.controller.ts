import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateInvoiceDto } from './dto/create-invoice.dto';

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB — ~32MB base64, alinhado com o limite de request da Anthropic

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
    @Body() _body: CreateInvoiceDto,
    @Body('password') password?: string,
  ): Promise<{ invoiceId: string }> {
    return this.invoicesService.create(userId, file, password);
  }

  @Get()
  async findAll(@CurrentUser() userId: string): Promise<InvoiceResponseDto[]> {
    const invoices = await this.invoicesService.findAll(userId);
    return invoices.map((i) => InvoiceResponseDto.from(i));
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.invoicesService.findById(id, userId);
    return InvoiceDetailResponseDto.from(invoice);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() userId: string,
  ): Promise<void> {
    await this.invoicesService.delete(id, userId);
  }
}
