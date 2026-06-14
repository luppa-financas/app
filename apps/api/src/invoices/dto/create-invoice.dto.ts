import { IsDateString, IsOptional } from 'class-validator';

export class CreateInvoiceDto {
  // Kept for backward compatibility with the MVP front-end, which still
  // sends this value. The backend ignores it — `billingMonth` is now
  // extracted from the invoice PDF itself by the listener.
  @IsOptional()
  @IsDateString()
  billingMonth?: string;
}
