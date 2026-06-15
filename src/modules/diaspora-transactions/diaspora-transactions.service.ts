import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { PaginatedResponse } from '../../common/pagination/paginated.response';
import { Agent } from '../users/entities/agent.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import {
  DEFAULT_STEPS,
  DiasporaTransaction,
  TransactionStatus,
} from './entities/diaspora-transaction.entity';

@Injectable()
export class DiasporaTransactionsService {
  constructor(
    @InjectRepository(DiasporaTransaction) private txRepo: Repository<DiasporaTransaction>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
  ) {}

  async create(dto: CreateTransactionDto, userId: string): Promise<DiasporaTransaction> {
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent) throw new ForbiddenException('Agent profile required');

    const existing = await this.txRepo.findOneBy({
      agentId: agent.id,
      clientEmail: dto.clientEmail,
      status: TransactionStatus.ACTIVE,
    });
    if (existing) throw new ConflictException('Un dossier actif existe déjà pour ce client');

    return this.txRepo.save(
      this.txRepo.create({
        agentId: agent.id,
        clientName: dto.clientName,
        clientEmail: dto.clientEmail,
        clientPhone: dto.clientPhone ?? null,
        clientCountry: dto.clientCountry ?? null,
        propertyId: dto.propertyId ?? null,
        notes: dto.notes ?? null,
        steps: DEFAULT_STEPS.map((s) => ({ ...s })),
      }),
    );
  }

  async findAll(userId: string, userRole: Role, page = 1, limit = 20): Promise<PaginatedResponse<DiasporaTransaction>> {
    const qb = this.txRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.property', 'property')
      .leftJoinAndSelect('property.images', 'images')
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userRole !== Role.ADMIN) {
      const agent = await this.agentRepo.findOneBy({ userId });
      if (!agent) return new PaginatedResponse([], 0, page, limit);
      qb.where('tx.agentId = :agentId', { agentId: agent.id });
    }

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, userId: string, userRole: Role): Promise<DiasporaTransaction> {
    const tx = await this.txRepo.findOne({
      where: { id },
      relations: { property: { images: true } },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.checkAccess(tx, userId, userRole);
    return tx;
  }

  async toggleStep(txId: string, stepId: string, userId: string, userRole: Role): Promise<DiasporaTransaction> {
    const tx = await this.txRepo.findOneBy({ id: txId });
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.checkAccess(tx, userId, userRole);

    const step = tx.steps.find((s) => s.id === stepId);
    if (!step) throw new NotFoundException('Step not found');

    step.completedAt = step.completedAt ? null : new Date().toISOString();

    const allDone = tx.steps.every((s) => s.completedAt !== null);
    if (allDone) tx.status = TransactionStatus.COMPLETED;
    else if (tx.status === TransactionStatus.COMPLETED) tx.status = TransactionStatus.ACTIVE;

    return this.txRepo.save(tx);
  }

  async updateNotes(txId: string, notes: string, userId: string, userRole: Role): Promise<DiasporaTransaction> {
    const tx = await this.txRepo.findOneBy({ id: txId });
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.checkAccess(tx, userId, userRole);
    tx.notes = notes;
    return this.txRepo.save(tx);
  }

  async cancel(txId: string, userId: string, userRole: Role): Promise<void> {
    const tx = await this.txRepo.findOneBy({ id: txId });
    if (!tx) throw new NotFoundException('Transaction not found');
    await this.checkAccess(tx, userId, userRole);
    tx.status = TransactionStatus.CANCELLED;
    await this.txRepo.save(tx);
  }

  private async checkAccess(tx: DiasporaTransaction, userId: string, userRole: Role): Promise<void> {
    if (userRole === Role.ADMIN) return;
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent || tx.agentId !== agent.id) throw new ForbiddenException();
  }
}
