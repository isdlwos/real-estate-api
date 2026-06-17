import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ParseUUIDPipe,
  Optional,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { ExtendLeaseDto } from './dto/extend-lease.dto';
import { SetAutoRenewDto } from './dto/set-auto-renew.dto';
import { UpdateLeaseNotesDto } from './dto/update-lease-notes.dto';
import { RentalLeasesService } from './rental-leases.service';

@ApiTags('Rental Leases')
@ApiBearerAuth()
@Controller('rental-leases')
export class RentalLeasesController {
  constructor(private readonly service: RentalLeasesService) {}

  @Post()
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Create a rental lease' })
  create(@Body() dto: CreateLeaseDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({
    summary: 'List rental leases (admin: all with filters, agent: own only)',
  })
  findAll(
    @Query() query: PaginationDto,
    @Query('status') status: string | undefined,
    @Query('agentId') agentId: string | undefined,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.findAll(
      userId,
      userRole,
      query.page,
      query.limit,
      status,
      agentId,
    );
  }

  @Get(':id')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Get lease detail with payments' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.findOne(id, userId, userRole);
  }

  @Get(':id/payments/:paymentId/receipt')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Download rent receipt PDF' })
  async downloadReceipt(
    @Param('id') leaseId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateReceiptPdf(
      leaseId,
      paymentId,
      userId,
      userRole,
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quittance-${paymentId}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Patch(':id/payments/:paymentId/toggle')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Toggle payment paid/unpaid' })
  togglePayment(
    @Param('id') leaseId: string,
    @Param('paymentId') paymentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.togglePayment(leaseId, paymentId, userId, userRole);
  }

  @Patch(':id/notes')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Update lease notes / exit report' })
  updateNotes(
    @Param('id') id: string,
    @Body() body: UpdateLeaseNotesDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.updateNotes(id, body, userId, userRole);
  }

  @Patch(':id/terminate')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Terminate a lease' })
  terminate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.terminate(id, userId, userRole);
  }

  @Patch(':id/auto-renew')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Enable or disable automatic renewal for a lease' })
  setAutoRenew(
    @Param('id') id: string,
    @Body() body: SetAutoRenewDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.setAutoRenew(id, body.autoRenew, userId, userRole);
  }

  @Patch(':id/extend')
  @Roles(Role.AGENT, Role.ADMIN)
  @ApiOperation({ summary: 'Extend a lease by N months' })
  extend(
    @Param('id') id: string,
    @Body() body: ExtendLeaseDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.extend(id, body.months ?? 6, userId, userRole);
  }

  @Post('dev/trigger-auto-renew')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: '[DEV] Déclenche manuellement le cron de reconduction automatique',
  })
  async triggerAutoRenew() {
    if (process.env.NODE_ENV === 'production') {
      return { message: 'Non disponible en production' };
    }
    await this.service.autoRenewLeases();
    return { message: 'Cron de reconduction automatique exécuté' };
  }
}
