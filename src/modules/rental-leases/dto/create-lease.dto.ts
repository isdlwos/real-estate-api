import { IsBoolean, IsDateString, IsEmail, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateLeaseDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsString()
  @MinLength(2)
  tenantName: string;

  @IsEmail()
  tenantEmail: string;

  @IsOptional()
  @IsString()
  tenantPhone?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsNumber()
  @IsPositive()
  monthlyRent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @IsOptional()
  @IsString()
  entryNotes?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
