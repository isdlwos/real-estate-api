import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../users/entities/agent.entity';
import { RentPayment } from './entities/rent-payment.entity';
import { RentalLease } from './entities/rental-lease.entity';
import { RentalLeasesController } from './rental-leases.controller';
import { RentalLeasesService } from './rental-leases.service';

@Module({
  imports: [TypeOrmModule.forFeature([RentalLease, RentPayment, Agent])],
  controllers: [RentalLeasesController],
  providers: [RentalLeasesService],
})
export class RentalLeasesModule {}
