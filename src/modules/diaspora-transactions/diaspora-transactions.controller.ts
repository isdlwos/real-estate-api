import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DiasporaTransactionsService } from './diaspora-transactions.service';

@ApiTags('diaspora-transactions')
@ApiBearerAuth()
@Controller('diaspora-transactions')
export class DiasporaTransactionsController {
  constructor(private service: DiasporaTransactionsService) {}

  @Post()
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Create a diaspora transaction dossier' })
  create(@Body() dto: CreateTransactionDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'List transactions (own for agent, all for admin)' })
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Query() pagination: PaginationDto,
  ) {
    return this.service.findAll(userId, userRole, pagination.page, pagination.limit);
  }

  @Get(':id')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Get a transaction dossier' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.findOne(id, userId, userRole);
  }

  @Patch(':id/steps/:stepId')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Toggle a checklist step' })
  toggleStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stepId') stepId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.toggleStep(id, stepId, userId, userRole);
  }

  @Patch(':id/notes')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Update notes on a dossier' })
  updateNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.updateNotes(id, notes, userId, userRole);
  }

  @Delete(':id')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Cancel a transaction dossier' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.cancel(id, userId, userRole);
  }
}
