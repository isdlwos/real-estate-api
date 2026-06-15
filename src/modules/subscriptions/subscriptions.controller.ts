import {
  Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { PropertiesService } from '../properties/properties.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '../../common/enums/role.enum';
import { SkipThrottle } from '@nestjs/throttler';
import type { Request } from 'express';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly propertiesService: PropertiesService,
  ) {}

  @Public()
  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Roles(Role.AGENT, Role.ADMIN)
  @Get('me')
  getMySubscription(@CurrentUser('id') agentId: string) {
    return this.subscriptionsService.getMySubscription(agentId);
  }

  @Roles(Role.AGENT, Role.ADMIN)
  @Get('quota')
  getQuota(@CurrentUser('id') userId: string) {
    return this.propertiesService.getQuotaInfo(userId);
  }

  @Roles(Role.AGENT, Role.ADMIN)
  @Post('checkout')
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser('id') agentId: string,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.subscriptionsService.createCheckout(agentId, dto.planSlug, baseUrl);
  }

  @Roles(Role.AGENT, Role.ADMIN)
  @Get('confirm/:subscriptionId')
  confirmPayment(
    @Param('subscriptionId') subscriptionId: string,
    @CurrentUser('id') agentId: string,
  ) {
    return this.subscriptionsService.confirmPayment(subscriptionId, agentId);
  }

  @Public()
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: Record<string, any>) {
    return this.subscriptionsService.handleWebhook(body);
  }
}
