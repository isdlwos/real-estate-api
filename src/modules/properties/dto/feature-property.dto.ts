import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FeaturePropertyDto {
  @ApiPropertyOptional({ example: 1, description: 'Nombre de mois en coup de cœur (1-6)', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(6)
  @Type(() => Number)
  months?: number;
}
