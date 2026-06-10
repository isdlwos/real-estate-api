import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from '../appointments/entities/appointment.entity';
import { Property } from '../properties/entities/property.entity';
import { Agent } from '../users/entities/agent.entity';
import { User } from '../users/entities/user.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Agent, Property, Appointment])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
