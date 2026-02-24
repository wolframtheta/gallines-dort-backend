import { IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @MinLength(1, { message: 'Indica el nom de la persona clienta' })
  clientName: string;

  @IsNumber()
  @Min(0.5, { message: 'Mínim 0.5 mitja dotzena' })
  mitgesDotzenes: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPerMonth?: number;
}
