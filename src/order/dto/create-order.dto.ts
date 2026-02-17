import { IsNumber, IsString, Min, MinLength } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @MinLength(1, { message: 'Indica el nom de la persona clienta' })
  clientName: string;

  @IsNumber()
  @Min(0.5, { message: 'Mínim 0.5 mitja dotzena' })
  mitgesDotzenes: number;
}
