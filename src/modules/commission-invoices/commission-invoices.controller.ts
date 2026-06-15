import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query,
} from '@nestjs/common';
import { CommissionInvoicesService } from './commission-invoices.service';
import { CreateCommissionCheckoutDto } from './dto/create-commission-checkout.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('commission-invoices')
export class CommissionInvoicesController {
  constructor(private readonly service: CommissionInvoicesService) {}

  @Roles(Role.AGENT, Role.ADMIN)
  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('month') month?: string,
  ) {
    return this.service.findAll(userId, userRole, Number(page), Number(limit), status, month);
  }

  @Roles(Role.ADMIN)
  @Get('admin/stats')
  adminStats(@Query('month') month?: string) {
    return this.service.adminStats(month);
  }

  @Roles(Role.AGENT, Role.ADMIN)
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.findOne(id, userId, userRole);
  }

  @Roles(Role.AGENT, Role.ADMIN)
  @Post('checkout')
  createCheckout(
    @Body() dto: CreateCommissionCheckoutDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.createCheckout(dto.invoiceId, userId, userRole);
  }

  @Roles(Role.AGENT, Role.ADMIN)
  @Get('confirm/:invoiceId')
  confirmPayment(
    @Param('invoiceId') invoiceId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
  ) {
    return this.service.confirmPayment(invoiceId, userId, userRole);
  }

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: Record<string, any>) {
    return this.service.handleWebhook(body);
  }
}
