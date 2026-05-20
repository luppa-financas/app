import { IsDateString, IsNotEmpty } from 'class-validator';

export class CreateInvoiceDto {
  @IsNotEmpty()
  @IsDateString()
  billingMonth: string;
}
