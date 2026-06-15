import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommissionInvoice } from './entities/commission-invoice.entity';
import { CommissionInvoicesService } from './commission-invoices.service';
import { CommissionInvoicesController } from './commission-invoices.controller';
import { RentPayment } from '../rental-leases/entities/rent-payment.entity';
import { Agent } from '../users/entities/agent.entity';
import { PaydunyaService } from '../subscriptions/paydunya.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommissionInvoice, RentPayment, Agent]),
    HttpModule,
  ],
  providers: [CommissionInvoicesService, PaydunyaService],
  controllers: [CommissionInvoicesController],
  exports: [CommissionInvoicesService],
})
export class CommissionInvoicesModule {}
