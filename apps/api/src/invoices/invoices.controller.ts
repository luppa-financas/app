import {
  BadRequestException,
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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import { InvoicesService } from './invoices.service';
import {
  InvoicesQueryService,
  InvoiceListItemDto,
  HistoryItemDto,
  SummaryDto,
} from './invoices-query.service';
import { InvoiceDetailResponseDto } from './dto/invoice-detail-response.dto';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

const MAX_FILE_SIZE = 24 * 1024 * 1024; // 24MB — ~32MB base64, alinhado com o limite de request da Anthropic

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly invoicesQueryService: InvoicesQueryService,
  ) {}

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
  async findAll(
    @CurrentUser() userId: string,
    @Query('month') month?: string,
    @Query('bank') bank?: string,
    @Query('status') status?: string,
  ): Promise<InvoiceListItemDto[]> {
    return this.invoicesQueryService.list(userId, { month, bank, status });
  }

  @Get('history')
  async history(
    @CurrentUser() userId: string,
    @Query('months') months?: number,
  ): Promise<HistoryItemDto[]> {
    return this.invoicesQueryService.history(userId, months ?? 6);
  }

  @Get('summary')
  async summary(
    @CurrentUser() userId: string,
    @Query('month') month: string,
  ): Promise<SummaryDto> {
    if (!month) throw new BadRequestException('month query param is required');
    return this.invoicesQueryService.summary(userId, month);
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
