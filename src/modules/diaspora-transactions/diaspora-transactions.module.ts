import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agent } from '../users/entities/agent.entity';
import { DiasporaTransaction } from './entities/diaspora-transaction.entity';
import { DiasporaTransactionsController } from './diaspora-transactions.controller';
import { DiasporaTransactionsService } from './diaspora-transactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([DiasporaTransaction, Agent])],
  controllers: [DiasporaTransactionsController],
  providers: [DiasporaTransactionsService],
})
export class DiasporaTransactionsModule {}
