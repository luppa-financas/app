import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  subcategory?: string | null;
}
