import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CreatePropertyDto } from './dto/create-property.dto';
import { FilterPropertyDto } from './dto/filter-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

@ApiTags('properties')
@Controller('properties')
export class PropertiesController {
  constructor(private propertiesService: PropertiesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Search and list properties with filters' })
  findAll(@Query() filters: FilterPropertyDto) {
    return this.propertiesService.findAll(filters);
  }

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Aggregated stats for homepage filters (counts by city/category/type, price range)' })
  getStats() {
    return this.propertiesService.getStats();
  }

  @Public()
  @Get('cities')
  @ApiOperation({ summary: 'List cities that have available properties, sorted by count' })
  getCities() {
    return this.propertiesService.getCities();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get property detail' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findOne(id);
  }

  @Public()
  @Get(':id/similar')
  @ApiOperation({ summary: 'Get similar properties (same category/type, ±30% price)' })
  findSimilar(@Param('id', ParseUUIDPipe) id: string) {
    return this.propertiesService.findSimilar(id);
  }

  @Post()
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a property (agent/admin)' })
  create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertiesService.create(dto, userId, userRole);
  }

  @Patch(':id')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a property (agent: own only, admin: any)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertiesService.update(id, dto, userId, userRole);
  }

  @Delete(':id')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a property (agent: own only, admin: any)' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.propertiesService.remove(id, userId, userRole);
  }
}
