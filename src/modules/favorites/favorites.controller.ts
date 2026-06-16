import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private favoritesService: FavoritesService) {}

  @Post(':propertyId')
  @ApiOperation({ summary: 'Add property to favorites' })
  add(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.add(propertyId, userId);
  }

  @Delete(':propertyId')
  @ApiOperation({ summary: 'Remove property from favorites' })
  remove(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.remove(propertyId, userId);
  }

  @Get('check/:propertyId')
  @ApiOperation({ summary: 'Check if a property is in own favorites' })
  isFavorited(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.favoritesService.isFavorited(userId, propertyId);
  }

  @Get()
  @ApiOperation({
    summary: 'List own favorites with property details (paginated)',
  })
  findAll(
    @CurrentUser('id') userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.favoritesService.findAll(
      userId,
      pagination.page,
      pagination.limit,
    );
  }
}
