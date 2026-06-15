import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../users/entities/agent.entity';
import { Property } from './entities/property.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  imports: [TypeOrmModule.forFeature([Property, Agent, Subscription])],
  controllers: [PropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
