import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, In, Repository } from 'typeorm';
import { Subscription, SubscriptionStatus } from './entities/subscription.entity';
import { Property } from '../properties/entities/property.entity';
import { Agent } from '../users/entities/agent.entity';
import { PropertyStatus } from '../../common/enums/property-status.enum';
import { MailService } from '../mail/mail.service';

@Injectable()
export class SubscriptionsTask {
  private readonly logger = new Logger(SubscriptionsTask.name);

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Property)
    private propertyRepo: Repository<Property>,
    @InjectRepository(Agent)
    private agentRepo: Repository<Agent>,
    private mailService: MailService,
  ) {}

  // Toutes les heures : expire les abonnements échus et dépublie leurs annonces
  @Cron(CronExpression.EVERY_HOUR)
  async expireSubscriptions(): Promise<void> {
    // 1. Identifier les abonnements à expirer (avant de les mettre à jour)
    const toExpire = await this.subscriptionRepo
      .createQueryBuilder('s')
      .select('s.agentId', 'agentId')
      .where('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('s."expiresAt" < NOW()')
      .andWhere('s."expiresAt" IS NOT NULL')
      .getRawMany<{ agentId: string }>();

    if (toExpire.length === 0) return;

    const userIds = toExpire.map((r) => r.agentId);

    // 2. Résoudre userId → agent.id
    const agents = await this.agentRepo.findBy({ userId: In(userIds) });
    const agentIds = agents.map((a) => a.id);

    // 3. Passer les abonnements en EXPIRED
    await this.subscriptionRepo
      .createQueryBuilder()
      .update(Subscription)
      .set({ status: SubscriptionStatus.EXPIRED })
      .where('status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('"expiresAt" < NOW()')
      .andWhere('"expiresAt" IS NOT NULL')
      .execute();

    this.logger.log(`${userIds.length} abonnement(s) expiré(s).`);

    // 4. Dépublier les annonces des agents dont l'abonnement vient d'expirer
    if (agentIds.length > 0) {
      const result = await this.propertyRepo
        .createQueryBuilder()
        .update(Property)
        .set({ status: PropertyStatus.DRAFT })
        .where('"agentId" IN (:...agentIds)', { agentIds })
        .andWhere('status = :status', { status: PropertyStatus.AVAILABLE })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`${result.affected} annonce(s) repassée(s) en brouillon suite à expiration d'abonnement.`);
      }
    }
  }

  // Chaque jour à 9h : notifie les agents dont l'abonnement expire dans 7 jours
  @Cron('0 9 * * *')
  async notifyExpiringSubscriptions(): Promise<void> {
    const in7days = new Date();
    in7days.setDate(in7days.getDate() + 7);

    // Fenêtre : entre J+7 00:00 et J+7 23:59
    const start = new Date(in7days);
    start.setHours(0, 0, 0, 0);
    const end = new Date(in7days);
    end.setHours(23, 59, 59, 999);

    const expiring = await this.subscriptionRepo.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: Between(start, end),
      },
      relations: { plan: true, agent: true },
    });

    if (expiring.length === 0) return;

    this.logger.log(`Envoi de ${expiring.length} notification(s) d'expiration J-7.`);

    for (const sub of expiring) {
      try {
        await this.mailService.sendSubscriptionExpiringSoon({
          to:        sub.agent.email,
          firstName: sub.agent.firstName,
          planName:  sub.plan.name,
          expiresAt: sub.expiresAt!,
          daysLeft:  7,
        });
      } catch (err) {
        this.logger.error(`Échec envoi email à ${sub.agent.email}`, err);
      }
    }
  }
}
