import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetAutoRenewDto {
  @IsBoolean()
  @ApiProperty({ type: Boolean })
  autoRenew: boolean;
}
