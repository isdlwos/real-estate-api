import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTransactionDto {
  @ApiProperty()
  @IsString()
  clientName: string;

  @ApiProperty()
  @IsEmail()
  clientEmail: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
