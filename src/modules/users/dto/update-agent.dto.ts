import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAgentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDiasporaSpecialist?: boolean;
}
