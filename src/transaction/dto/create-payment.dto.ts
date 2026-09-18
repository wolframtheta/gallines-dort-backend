import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  fromUserId: string;

  @IsString()
  toUserId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isSettlement?: boolean;

  @IsOptional()
  @IsString()
  splitGroupId?: string;
}
