import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class BoostPropertyDto {
  @ApiPropertyOptional({ example: 1, description: 'Nombre de semaines de boost (1-12)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  weeks?: number;
}
