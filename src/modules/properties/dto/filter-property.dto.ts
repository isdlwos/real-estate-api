import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';
import { PropertyCategory } from '../../../common/enums/property-category.enum';
import { PropertyStatus } from '../../../common/enums/property-status.enum';
import { PropertyType } from '../../../common/enums/property-type.enum';

export class FilterPropertyDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Full-text search on title, description, address and city' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  type?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyCategory })
  @IsOptional()
  @IsEnum(PropertyCategory)
  category?: PropertyCategory;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minRooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minSurface?: number;

  @ApiPropertyOptional({ enum: ['price', 'createdAt', 'surface'] })
  @IsOptional()
  @IsString()
  sortBy?: 'price' | 'createdAt' | 'surface';

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Show only featured (Coup de cœur) properties' })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  featured?: boolean;
}
