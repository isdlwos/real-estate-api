import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommissionCheckoutDto {
  @ApiProperty()
  @IsUUID()
  invoiceId: string;
}
