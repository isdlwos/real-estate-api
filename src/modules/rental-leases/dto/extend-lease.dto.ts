import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class ExtendLeaseDto {
  @ApiProperty({ example: 6, description: 'Nombre de mois de prolongation (1-24)' })
  @IsInt()
  @Min(1)
  @Max(24)
  @Type(() => Number)
  months: number;
}
