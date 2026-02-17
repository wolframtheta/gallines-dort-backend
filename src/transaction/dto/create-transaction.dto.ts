import { IsString, IsNumber, IsIn, IsOptional, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  clientName?: string;

  @IsIn(['expense', 'income'])
  type: 'expense' | 'income';

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  orderId?: string;
}
