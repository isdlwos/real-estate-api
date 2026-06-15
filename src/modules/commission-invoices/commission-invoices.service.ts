import {
  BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Role } from '../../common/enums/role.enum';
import { PaginatedResponse } from '../../common/pagination/paginated.response';
import { PaydunyaService } from '../subscriptions/paydunya.service';
import { Agent } from '../users/entities/agent.entity';
import { RentPayment, PaymentStatus } from '../rental-leases/entities/rent-payment.entity';
import { CommissionInvoice, CommissionInvoiceStatus } from './entities/commission-invoice.entity';

@Injectable()
export class CommissionInvoicesService {
  private readonly logger = new Logger(CommissionInvoicesService.name);

  constructor(
    @InjectRepository(CommissionInvoice) private invoiceRepo: Repository<CommissionInvoice>,
    @InjectRepository(RentPayment)       private paymentRepo: Repository<RentPayment>,
    @InjectRepository(Agent)             private agentRepo: Repository<Agent>,
    private paydunyaService: PaydunyaService,
  ) {}

  // ── Cron : 1er de chaque mois à 6h ──────────────────────────────────────────
  @Cron('0 6 1 * *')
  async generateMonthlyInvoices(): Promise<void> {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    this.logger.log(`Génération des factures de commission pour ${month}`);

    // Trouver tous les loyers PAID du mois précédent sans facture
    const payments = await this.paymentRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.lease', 'lease')
      .where('p.status = :status', { status: PaymentStatus.PAID })
      .andWhere('p.month = :month', { month })
      .andWhere('p."commissionInvoiceId" IS NULL')
      .andWhere('p."commissionAmount" IS NOT NULL')
      .getMany();

    if (!payments.length) {
      this.logger.log(`Aucun loyer éligible pour ${month}`);
      return;
    }

    // Grouper par agentId
    const byAgent = new Map<string, typeof payments>();
    for (const p of payments) {
      const id = p.lease.agentId;
      if (!byAgent.has(id)) byAgent.set(id, []);
      byAgent.get(id)!.push(p);
    }

    for (const [agentId, agentPayments] of byAgent) {
      const existing = await this.invoiceRepo.findOneBy({ agentId, month });
      if (existing) continue;

      const totalRent = agentPayments.reduce((s, p) => s + Number(p.amount), 0);
      const totalCommission = agentPayments.reduce((s, p) => s + Number(p.commissionAmount), 0);
      const rate = Number(agentPayments[0].lease.commissionRate);

      const invoice = await this.invoiceRepo.save(
        this.invoiceRepo.create({
          agentId,
          month,
          paymentsCount: agentPayments.length,
          totalRentCollected: totalRent,
          commissionRate: rate,
          commissionAmount: Math.round(totalCommission),
        }),
      );

      // Lier les paiements à la facture
      await this.paymentRepo
        .createQueryBuilder()
        .update(RentPayment)
        .set({ commissionInvoiceId: invoice.id })
        .where('id IN (:...ids)', { ids: agentPayments.map((p) => p.id) })
        .execute();

      this.logger.log(`Facture ${invoice.id} créée pour agent ${agentId} — ${Math.round(totalCommission)} FCFA`);
    }
  }

  async findAll(
    userId: string,
    userRole: Role,
    page = 1,
    limit = 20,
    status?: string,
    month?: string,
  ): Promise<PaginatedResponse<CommissionInvoice>> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'user')
      .orderBy('inv.month', 'DESC')
      .addOrderBy('inv.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userRole !== Role.ADMIN) {
      const agent = await this.agentRepo.findOneBy({ userId });
      if (!agent) return new PaginatedResponse([], 0, page, limit);
      qb.where('inv.agentId = :agentId', { agentId: agent.id });
    } else {
      if (status) qb.andWhere('inv.status = :status', { status });
      if (month)  qb.andWhere('inv.month = :month', { month });
    }

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string, userId: string, userRole: Role): Promise<CommissionInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: { agent: { user: true } },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    await this.checkAccess(invoice, userId, userRole);
    return invoice;
  }

  async adminStats(month?: string): Promise<{
    totalPending: number;
    totalPaid: number;
    amountPending: number;
    amountPaid: number;
  }> {
    const qb = this.invoiceRepo.createQueryBuilder('inv');
    if (month) qb.where('inv.month = :month', { month });

    const rows = await qb
      .select('inv.status', 'status')
      .addSelect('COUNT(inv.id)', 'count')
      .addSelect('SUM(inv."commissionAmount")', 'amount')
      .groupBy('inv.status')
      .getRawMany<{ status: string; count: string; amount: string }>();

    const pending = rows.find((r) => r.status === CommissionInvoiceStatus.PENDING);
    const paid    = rows.find((r) => r.status === CommissionInvoiceStatus.PAID);

    return {
      totalPending:  Number(pending?.count  ?? 0),
      totalPaid:     Number(paid?.count     ?? 0),
      amountPending: Number(pending?.amount ?? 0),
      amountPaid:    Number(paid?.amount    ?? 0),
    };
  }

  async createCheckout(invoiceId: string, userId: string, userRole: Role) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: { agent: { user: true } },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    await this.checkAccess(invoice, userId, userRole);
    if (invoice.status !== CommissionInvoiceStatus.PENDING) {
      throw new BadRequestException('Cette facture n\'est pas en attente de paiement');
    }

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';
    const apiUrl      = process.env.API_URL      ?? 'http://localhost:3001';

    const paydunya = await this.paydunyaService.createInvoice({
      amount: Math.round(invoice.commissionAmount),
      description: `Commission gestion locative ${invoice.month} — Prestige Immobilier`,
      callbackUrl: `${apiUrl}/api/v1/commission-invoices/webhook`,
      returnUrl:   `${frontendUrl}/account/commissions?status=success&inv=${invoice.id}`,
      cancelUrl:   `${frontendUrl}/account/commissions?status=cancelled`,
      customData: { invoice_id: invoice.id },
    });

    invoice.paydunyaToken = paydunya.token;
    await this.invoiceRepo.save(invoice);

    return { checkoutUrl: paydunya.checkoutUrl, invoiceId: invoice.id };
  }

  async handleWebhook(body: Record<string, any>): Promise<void> {
    const token = body.data?.invoice?.token ?? body.token;
    if (!token) return;

    const status = await this.paydunyaService.getInvoiceStatus(token);
    if (status !== 'completed') return;

    const invoice = await this.invoiceRepo.findOneBy({ paydunyaToken: token });
    if (!invoice || invoice.status === CommissionInvoiceStatus.PAID) return;

    invoice.status = CommissionInvoiceStatus.PAID;
    invoice.paidAt = new Date();
    await this.invoiceRepo.save(invoice);
    this.logger.log(`Commission invoice ${invoice.id} marquée comme PAID`);
  }

  async confirmPayment(invoiceId: string, userId: string, userRole: Role) {
    const invoice = await this.invoiceRepo.findOneBy({ id: invoiceId });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    await this.checkAccess(invoice, userId, userRole);

    if (!invoice.paydunyaToken) throw new BadRequestException('Aucun paiement initié');
    const status = await this.paydunyaService.getInvoiceStatus(invoice.paydunyaToken);

    if (status === 'completed' && invoice.status !== CommissionInvoiceStatus.PAID) {
      invoice.status = CommissionInvoiceStatus.PAID;
      invoice.paidAt = new Date();
      await this.invoiceRepo.save(invoice);
    }

    return { status: invoice.status, invoice };
  }

  private async checkAccess(invoice: CommissionInvoice, userId: string, userRole: Role): Promise<void> {
    if (userRole === Role.ADMIN) return;
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent || invoice.agentId !== agent.id) throw new ForbiddenException();
  }
}
