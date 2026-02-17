import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsBoolean()
  paid?: boolean;

  @IsOptional()
  @IsBoolean()
  delivered?: boolean;
}
