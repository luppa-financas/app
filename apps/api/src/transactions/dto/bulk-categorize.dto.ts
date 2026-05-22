import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class BulkCategorizeDto {
  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  subcategory?: string | null;
}
