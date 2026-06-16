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
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(private appointmentsService: AppointmentsService) {}

  @Post()
  @Roles(Role.CLIENT, Role.ADMIN)
  @ApiOperation({ summary: 'Book an appointment' })
  create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser('id') clientId: string,
  ) {
    return this.appointmentsService.create(dto, clientId);
  }

  @Get()
  @ApiOperation({ summary: 'List appointments (filtered by role, paginated)' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Query() pagination: PaginationDto,
  ) {
    return this.appointmentsService.findAll(
      userId,
      userRole,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get appointment detail' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.appointmentsService.findOne(id, userId, userRole);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Reschedule appointment — changes date, resets status to pending (client: own pending, admin: any)',
  })
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.appointmentsService.reschedule(id, dto, userId, userRole);
  }

  @Patch(':id/status')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({
    summary: 'Update appointment status (agent: own, admin: any)',
  })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.appointmentsService.updateStatus(id, dto, userId, userRole);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Cancel appointment (client: own pending, admin: any)',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.appointmentsService.remove(id, userId, userRole);
  }
}
