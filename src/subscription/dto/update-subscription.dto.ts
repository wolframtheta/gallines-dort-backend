import { IsBoolean, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  clientName?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  mitgesDotzenes?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPerMonth?: number | null;
}
