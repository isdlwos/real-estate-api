import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class MyPropertiesFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;
}
