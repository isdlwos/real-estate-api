import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Plan } from './entities/plan.entity';
import { Subscription } from './entities/subscription.entity';
import { Payment } from './entities/payment.entity';
import { Property } from '../properties/entities/property.entity';
import { Agent } from '../users/entities/agent.entity';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsTask } from './subscriptions.task';
import { PaydunyaService } from './paydunya.service';
import { PropertiesModule } from '../properties/properties.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Plan, Subscription, Payment, Property, Agent, User]),
    HttpModule,
    PropertiesModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PaydunyaService, SubscriptionsTask],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
