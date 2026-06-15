import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './entities/plan.entity';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PaydunyaService } from './paydunya.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Plan)
    private planRepo: Repository<Plan>,

    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,

    @InjectRepository(Payment)
    private paymentRepo: Repository<Payment>,

    private paydunyaService: PaydunyaService,
  ) {}

  async getPlans(): Promise<Plan[]> {
    return this.planRepo.findBy({ isActive: true });
  }

  async getMySubscription(agentId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({
      where: [
        { agentId, status: SubscriptionStatus.ACTIVE },
        { agentId, status: SubscriptionStatus.EXPIRED },
      ],
      relations: { plan: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createCheckout(agentId: string, planSlug: string, _baseUrl: string) {
    const plan = await this.planRepo.findOneBy({ slug: planSlug, isActive: true });
    if (!plan) throw new NotFoundException('Plan introuvable');

    // Annuler les souscriptions PENDING existantes pour éviter les doublons
    await this.subscriptionRepo.update(
      { agentId, status: SubscriptionStatus.PENDING },
      { status: SubscriptionStatus.CANCELLED },
    );

    // Créer un enregistrement de souscription en attente
    const subscription = this.subscriptionRepo.create({
      agentId,
      planId: plan.id,
      status: SubscriptionStatus.PENDING,
    });
    await this.subscriptionRepo.save(subscription);

    // Créer un paiement en attente
    const payment = this.paymentRepo.create({
      agentId,
      subscriptionId: subscription.id,
      amount: plan.price,
      status: PaymentStatus.PENDING,
    });
    await this.paymentRepo.save(payment);

    const apiUrl      = process.env.API_URL      ?? 'http://localhost:3001';
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';

    const invoice = await this.paydunyaService.createInvoice({
      amount:      plan.price,
      description: `Abonnement ${plan.name} — Prestige Immobilier`,
      callbackUrl: `${apiUrl}/api/v1/subscriptions/webhook`,
      returnUrl:   `${frontendUrl}/account/billing?status=success&sub=${subscription.id}`,
      cancelUrl:   `${frontendUrl}/account/billing?status=cancelled`,
      customData: {
        subscription_id: subscription.id,
        payment_id:      payment.id,
        agent_id:        agentId,
        plan_slug:       plan.slug,
      },
    });

    // Stocker le token PayDunya
    subscription.paydunyaToken = invoice.token;
    payment.paydunyaToken = invoice.token;
    await this.subscriptionRepo.save(subscription);
    await this.paymentRepo.save(payment);

    return {
      checkoutUrl:    invoice.checkoutUrl,
      subscriptionId: subscription.id,
    };
  }

  async handleWebhook(body: Record<string, any>): Promise<void> {
    const invoiceToken = body.data?.invoice?.token ?? body.token;
    if (!invoiceToken) {
      this.logger.warn('Webhook sans token', body);
      return;
    }

    const status = await this.paydunyaService.getInvoiceStatus(invoiceToken);
    if (status !== 'completed') return;

    const payment = await this.paymentRepo.findOneBy({ paydunyaToken: invoiceToken });
    if (!payment || payment.status === PaymentStatus.COMPLETED) return;

    payment.status = PaymentStatus.COMPLETED;
    await this.paymentRepo.save(payment);

    if (!payment.subscriptionId) return;

    const subscription = await this.subscriptionRepo.findOne({
      where: { id: payment.subscriptionId },
      relations: { plan: true },
    });
    if (!subscription) return;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    subscription.status    = SubscriptionStatus.ACTIVE;
    subscription.startDate = now;
    subscription.expiresAt = expiresAt;
    await this.subscriptionRepo.save(subscription);

    this.logger.log(`Abonnement activé: ${subscription.id} (agent: ${subscription.agentId})`);
  }

  async confirmPayment(subscriptionId: string, agentId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, agentId },
      relations: { plan: true },
    });
    if (!subscription) throw new NotFoundException('Souscription introuvable');

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return { status: 'active', subscription };
    }

    if (!subscription.paydunyaToken) {
      throw new BadRequestException('Aucun token de paiement associé');
    }

    const status = await this.paydunyaService.getInvoiceStatus(subscription.paydunyaToken);
    if (status === 'completed') {
      await this.handleWebhook({ token: subscription.paydunyaToken });
      const updated = await this.subscriptionRepo.findOne({
        where: { id: subscription.id },
        relations: { plan: true },
      });
      if (updated) Object.assign(subscription, updated);
    }

    return { status: subscription.status, subscription };
  }
}
