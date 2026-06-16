import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Role } from '../../common/enums/role.enum';
import { PaginatedResponse } from '../../common/pagination/paginated.response';
import { MailService } from '../mail/mail.service';
import { Agent } from '../users/entities/agent.entity';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { LeaseStatus, RentalLease } from './entities/rental-lease.entity';
import { PaymentStatus, RentPayment } from './entities/rent-payment.entity';

function addOneMonth(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const nextM = (m % 12) + 1;
  const nextY = m === 12 ? y + 1 : y;
  const lastDay = new Date(nextY, nextM, 0).getDate();
  return `${nextY}-${String(nextM).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

@Injectable()
export class RentalLeasesService {
  constructor(
    @InjectRepository(RentalLease) private leaseRepo: Repository<RentalLease>,
    @InjectRepository(RentPayment) private paymentRepo: Repository<RentPayment>,
    @InjectRepository(Agent) private agentRepo: Repository<Agent>,
    private mailService: MailService,
  ) {}

  async create(dto: CreateLeaseDto, userId: string): Promise<RentalLease> {
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent) throw new ForbiddenException('Agent profile required');

    const existing = await this.leaseRepo.findOneBy({
      agentId: agent.id,
      tenantEmail: dto.tenantEmail,
      status: LeaseStatus.ACTIVE,
    });
    if (existing)
      throw new ConflictException(
        'Un bail actif existe déjà pour ce locataire',
      );

    const lease = await this.leaseRepo.save(
      this.leaseRepo.create({
        agentId: agent.id,
        propertyId: dto.propertyId ?? null,
        tenantName: dto.tenantName,
        tenantEmail: dto.tenantEmail,
        tenantPhone: dto.tenantPhone ?? null,
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
        monthlyRent: dto.monthlyRent,
        deposit: dto.deposit ?? 0,
        entryNotes: dto.entryNotes ?? null,
        notes: dto.notes ?? null,
        autoRenew: dto.autoRenew ?? true,
      }),
    );

    // Générer les échéances jusqu'à la fin ou sur 12 mois
    await this.generatePayments(lease);
    const full = (await this.leaseRepo.findOne({
      where: { id: lease.id },
      relations: { payments: true, property: true },
    })) as RentalLease;
    this.notifyTenantLeaseCreated(full, agent).catch(() => {});
    return full;
  }

  private async generatePayments(lease: RentalLease): Promise<void> {
    const start = new Date(lease.startDate);
    const end = lease.endDate
      ? new Date(lease.endDate)
      : new Date(start.getFullYear(), start.getMonth() + 12, 1);
    const payments: Partial<RentPayment>[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);

    while (cur <= end) {
      const month = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      const now = new Date();
      const isPast = cur < new Date(now.getFullYear(), now.getMonth(), 1);
      payments.push({
        leaseId: lease.id,
        month,
        amount: lease.monthlyRent,
        status: isPast ? PaymentStatus.LATE : PaymentStatus.PENDING,
      });
      cur.setMonth(cur.getMonth() + 1);
    }

    await this.paymentRepo.save(payments);
  }

  async findAll(
    userId: string,
    userRole: Role,
    page = 1,
    limit = 20,
    status?: string,
    agentId?: string,
  ): Promise<PaginatedResponse<RentalLease>> {
    const qb = this.leaseRepo
      .createQueryBuilder('lease')
      .leftJoinAndSelect('lease.property', 'property')
      .leftJoinAndSelect('property.images', 'images')
      .leftJoinAndSelect('lease.agent', 'agent')
      .leftJoinAndSelect('agent.user', 'agentUser')
      .orderBy('lease.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userRole !== Role.ADMIN) {
      const agentRecord = await this.agentRepo.findOneBy({ userId });
      if (!agentRecord) return new PaginatedResponse([], 0, page, limit);
      qb.where('lease.agentId = :agentId', { agentId: agentRecord.id });
    } else {
      if (status) qb.andWhere('lease.status = :status', { status });
      if (agentId) qb.andWhere('lease.agentId = :agentId', { agentId });
    }

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResponse(data, total, page, limit);
  }

  async findOne(
    id: string,
    userId: string,
    userRole: Role,
  ): Promise<RentalLease> {
    const lease = await this.leaseRepo.findOne({
      where: { id },
      relations: { property: { images: true }, payments: true },
      order: { payments: { month: 'ASC' } },
    });
    if (!lease) throw new NotFoundException('Bail non trouvé');
    await this.checkAccess(lease, userId, userRole);
    return lease;
  }

  async togglePayment(
    leaseId: string,
    paymentId: string,
    userId: string,
    userRole: Role,
  ): Promise<RentPayment> {
    const lease = await this.leaseRepo.findOneBy({ id: leaseId });
    if (!lease) throw new NotFoundException('Bail non trouvé');
    await this.checkAccess(lease, userId, userRole);

    const payment = await this.paymentRepo.findOneBy({
      id: paymentId,
      leaseId,
    });
    if (!payment) throw new NotFoundException('Paiement non trouvé');

    if (payment.status === PaymentStatus.PAID) {
      payment.status = PaymentStatus.PENDING;
      payment.paidAt = null;
      payment.commissionAmount = null;
    } else {
      payment.status = PaymentStatus.PAID;
      payment.paidAt = new Date();
      payment.commissionAmount =
        Math.round(Number(payment.amount) * Number(lease.commissionRate)) / 100;
    }
    return this.paymentRepo.save(payment);
  }

  async updateNotes(
    id: string,
    body: { notes?: string; exitNotes?: string; entryNotes?: string },
    userId: string,
    userRole: Role,
  ): Promise<RentalLease> {
    const lease = await this.leaseRepo.findOneBy({ id });
    if (!lease) throw new NotFoundException('Bail non trouvé');
    await this.checkAccess(lease, userId, userRole);
    if (body.notes !== undefined) lease.notes = body.notes;
    if (body.exitNotes !== undefined) lease.exitNotes = body.exitNotes;
    if (body.entryNotes !== undefined) lease.entryNotes = body.entryNotes;
    return this.leaseRepo.save(lease);
  }

  async terminate(
    id: string,
    userId: string,
    userRole: Role,
  ): Promise<RentalLease> {
    const lease = await this.leaseRepo.findOneBy({ id });
    if (!lease) throw new NotFoundException('Bail non trouvé');
    await this.checkAccess(lease, userId, userRole);
    lease.status = LeaseStatus.TERMINATED;
    lease.endDate = new Date().toISOString().split('T')[0];
    return this.leaseRepo.save(lease);
  }

  async extend(
    id: string,
    months: number,
    userId: string,
    userRole: Role,
  ): Promise<RentalLease> {
    const lease = await this.leaseRepo.findOne({
      where: { id },
      relations: { payments: true },
    });
    if (!lease) throw new NotFoundException('Bail non trouvé');
    await this.checkAccess(lease, userId, userRole);
    if (lease.status === LeaseStatus.TERMINATED)
      throw new BadRequestException('Bail résilié');

    const currentEnd = lease.endDate ? new Date(lease.endDate) : new Date();
    const newEnd = new Date(currentEnd);
    newEnd.setMonth(newEnd.getMonth() + months);
    lease.endDate = newEnd.toISOString().split('T')[0];
    await this.leaseRepo.save(lease);

    // Generate payment rows for the extended period (after the last existing month)
    const lastMonth = lease.payments.reduce(
      (max, p) => (p.month > max ? p.month : max),
      '0000-00',
    );
    if (lastMonth !== '0000-00') {
      const [ly, lm] = lastMonth.split('-').map(Number);
      const cur = new Date(ly, lm, 1); // one month after the last existing row
      const endDate = new Date(newEnd.getFullYear(), newEnd.getMonth(), 1);
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const newPayments: Partial<RentPayment>[] = [];
      while (cur <= endDate) {
        const month = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
        newPayments.push({
          leaseId: lease.id,
          month,
          amount: lease.monthlyRent,
          status:
            cur < currentMonthStart
              ? PaymentStatus.LATE
              : PaymentStatus.PENDING,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
      if (newPayments.length > 0) await this.paymentRepo.save(newPayments);
    }

    return this.leaseRepo.findOne({
      where: { id },
      relations: { payments: true, property: true },
      order: { payments: { month: 'ASC' } },
    }) as Promise<RentalLease>;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markLatePayments(): Promise<void> {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const result = await this.paymentRepo.update(
      { status: PaymentStatus.PENDING, month: LessThan(currentMonth) },
      { status: PaymentStatus.LATE },
    );
    if (result.affected) {
      this.notifyAgentsLatePayments().catch(() => {});
    }
  }

  private async notifyTenantLeaseCreated(
    lease: RentalLease,
    agent: Agent,
  ): Promise<void> {
    if (!lease.tenantEmail) return;
    const agentWithUser = await this.agentRepo.findOne({
      where: { id: agent.id },
      relations: { user: true },
    });
    const agentName = agentWithUser?.user
      ? `${agentWithUser.user.firstName} ${agentWithUser.user.lastName}`
      : 'Votre gestionnaire';
    await this.mailService.sendLeaseCreated({
      to: lease.tenantEmail,
      tenantName: lease.tenantName,
      agentName,
      monthlyRent: Number(lease.monthlyRent),
      startDate: new Date(lease.startDate),
      propertyAddress: lease.property?.address ?? null,
    });
  }

  private async notifyAgentsLatePayments(): Promise<void> {
    const lateByAgent = await this.paymentRepo
      .createQueryBuilder('p')
      .select('lease.agentId', 'agentId')
      .addSelect('COUNT(p.id)', 'lateCount')
      .innerJoin('p.lease', 'lease')
      .where('p.status = :status', { status: PaymentStatus.LATE })
      .groupBy('lease.agentId')
      .getRawMany<{ agentId: string; lateCount: string }>();

    for (const { agentId, lateCount } of lateByAgent) {
      const agent = await this.agentRepo.findOne({
        where: { id: agentId },
        relations: { user: true },
      });
      if (agent?.user?.email) {
        await this.mailService
          .sendLatePaymentAlert({
            to: agent.user.email,
            firstName: agent.user.firstName,
            lateCount: Number(lateCount),
          })
          .catch(() => {});
      }
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async autoRenewLeases(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    const leases = await this.leaseRepo.find({
      where: { status: LeaseStatus.ACTIVE, autoRenew: true },
    });

    const expiring = leases.filter(
      (l) => l.endDate !== null && l.endDate <= today,
    );
    if (!expiring.length) return;

    for (const lease of expiring) {
      const newEndDate = addOneMonth(lease.endDate!);
      await this.leaseRepo.update(lease.id, { endDate: newEndDate });

      const [y, m] = newEndDate.split('-').map(Number);
      const newMonth = `${y}-${String(m).padStart(2, '0')}`;
      const existing = await this.paymentRepo.findOneBy({
        leaseId: lease.id,
        month: newMonth,
      });
      if (!existing) {
        await this.paymentRepo.save({
          leaseId: lease.id,
          month: newMonth,
          amount: lease.monthlyRent,
          status: PaymentStatus.PENDING,
        });
      }
    }
  }

  async setAutoRenew(
    id: string,
    autoRenew: boolean,
    userId: string,
    userRole: Role,
  ): Promise<RentalLease> {
    const lease = await this.leaseRepo.findOneBy({ id });
    if (!lease) throw new NotFoundException('Bail non trouvé');
    await this.checkAccess(lease, userId, userRole);
    await this.leaseRepo.update(id, { autoRenew });
    return this.leaseRepo.findOneBy({ id }) as Promise<RentalLease>;
  }

  async generateReceiptPdf(
    leaseId: string,
    paymentId: string,
    userId: string,
    userRole: Role,
  ): Promise<Buffer> {
    const lease = await this.leaseRepo.findOne({
      where: { id: leaseId },
      relations: { property: true, agent: { user: true }, payments: true },
    });
    if (!lease) throw new NotFoundException('Bail non trouvé');
    await this.checkAccess(lease, userId, userRole);

    const payment = lease.payments.find((p) => p.id === paymentId);
    if (!payment) throw new NotFoundException('Paiement non trouvé');
    if (payment.status !== PaymentStatus.PAID)
      throw new BadRequestException("Ce paiement n'est pas encore encaissé");

    return this.buildReceiptPdf(lease, payment);
  }

  private buildReceiptPdf(
    lease: RentalLease,
    payment: RentPayment,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: { Title: 'Quittance de loyer', Author: 'Prestige Immobilier' },
      });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ── Layout grid ──────────────────────────────────────────────────────────
      const L = 50; // left margin
      const R = 545; // right margin  (595 − 50)
      const W = R - L; // usable width = 495
      const P = 14; // inner padding inside boxes
      const GAP = 10; // gap between two-column blocks
      const cW = (W - GAP) / 2; // column width
      const c2 = L + cW + GAP; // second column start x

      // ── Colors ───────────────────────────────────────────────────────────────
      const navy = '#0f2044';
      const gold = '#c8a96e';
      const gray = '#64748b';
      const light = '#f8f6f3';
      const border = '#e2e8f0';
      const silver = '#94a3b8';

      // ── Helpers ──────────────────────────────────────────────────────────────
      // toLocaleString('fr-FR') uses   (narrow no-break space) as thousands
      // separator — Helvetica doesn't have it and PDFKit renders it as '/'.
      const fcfa = (n: number) =>
        Math.round(n)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';

      // ── Data ─────────────────────────────────────────────────────────────────
      const [yr, mn] = payment.month.split('-').map(Number);
      const MONTHS = [
        'janvier',
        'février',
        'mars',
        'avril',
        'mai',
        'juin',
        'juillet',
        'août',
        'septembre',
        'octobre',
        'novembre',
        'décembre',
      ];
      const amount = Number(payment.amount);
      const refNum = `${payment.id.split('-')[0].toUpperCase()}-${payment.month}`;
      const todayStr = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const paidStr = payment.paidAt
        ? new Date(payment.paidAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '—';
      const startStr = new Date(lease.startDate).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const property = lease.property;
      const addr = property
        ? [property.address, property.city, property.country]
            .filter(Boolean)
            .join(', ')
        : '';

      // ── Helpers ──────────────────────────────────────────────────────────────
      // Draw a filled + stroked box, return the inner top-left Y for content.
      const box = (
        x: number,
        y: number,
        w: number,
        h: number,
        fill = light,
      ) => {
        doc.rect(x, y, w, h).fill(fill);
        doc.rect(x, y, w, h).stroke(border);
        return y + P; // first content Y
      };

      // Section label (small gold caps) above a block
      const sectionLabel = (text: string, x: number, y: number) => {
        doc.fillColor(gold).fontSize(7).font('Helvetica-Bold').text(text, x, y);
        return y + 11;
      };

      // Right-aligned text within [L, R]
      const right = (text: string, y: number, opts: object = {}) => {
        doc.text(text, L, y, { width: W, align: 'right', ...opts });
      };

      let curY = 50;

      // ── 1. Header ─────────────────────────────────────────────────────────────
      const hH = 74;
      doc.rect(L, curY, W, hH).fill(navy);

      // Left side: brand
      doc
        .fillColor('white')
        .fontSize(17)
        .font('Helvetica-Bold')
        .text('PRESTIGE IMMOBILIER', L + P, curY + 16, {
          width: W / 2 - P * 2,
          lineBreak: false,
        });
      doc
        .fillColor(gold)
        .fontSize(9)
        .font('Helvetica')
        .text('Agence immobilière · Dakar, Sénégal', L + P, curY + 38, {
          width: W / 2 - P * 2,
        });

      // Right side: document type
      doc
        .fillColor('white')
        .fontSize(15)
        .font('Helvetica-Bold')
        .text('QUITTANCE DE LOYER', L + W / 2, curY + 16, {
          width: W / 2 - P,
          align: 'right',
        });
      doc
        .fillColor(gold)
        .fontSize(9)
        .font('Helvetica')
        .text(`Réf. ${refNum}`, L + W / 2, curY + 39, {
          width: W / 2 - P,
          align: 'right',
        });

      curY += hH + 10;

      // ── 2. Issue date ─────────────────────────────────────────────────────────
      doc.fillColor(gray).fontSize(8).font('Helvetica');
      right(`Émise le ${todayStr}`, curY);
      curY += 18;

      // ── 3. Declarative paragraph ──────────────────────────────────────────────
      const declText =
        `Je soussigné(e), Prestige Immobilier, agissant en qualité de bailleur, ` +
        `reconnais avoir reçu de M./Mme ${lease.tenantName} la somme de ` +
        `${fcfa(amount).replace(' FCFA', '')} francs CFA, au titre du loyer du bien désigné ` +
        `ci-dessous pour la période du 1er ${MONTHS[mn - 1]} ${yr} ` +
        `au ${new Date(yr, mn, 0).getDate()} ${MONTHS[mn - 1]} ${yr}.`;

      const declH =
        doc.heightOfString(declText, { width: W - P * 2, lineGap: 4 }) + P * 2;
      box(L, curY, W, declH);
      doc
        .fillColor(navy)
        .fontSize(9.5)
        .font('Helvetica')
        .text(declText, L + P, curY + P, { width: W - P * 2, lineGap: 4 });
      curY += declH + 12;

      // ── 4. Bailleur / Locataire ───────────────────────────────────────────────
      // Measure locataire block height dynamically
      const tenantLines = [
        `M./Mme ${lease.tenantName}`,
        lease.tenantEmail,
        ...(lease.tenantPhone ? [lease.tenantPhone] : []),
      ];
      const partyH = P + 11 + 14 * tenantLines.length + P;

      // Bailleur
      box(L, curY, cW, partyH);
      let cy = sectionLabel('BAILLEUR', L + P, curY + P);
      doc
        .fillColor(navy)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('Prestige Immobilier', L + P, cy, { width: cW - P * 2 });
      cy += 14;
      doc
        .fillColor(gray)
        .fontSize(8)
        .font('Helvetica')
        .text('Dakar, Sénégal', L + P, cy, { width: cW - P * 2 });

      // Locataire
      box(c2, curY, cW, partyH);
      cy = sectionLabel('LOCATAIRE', c2 + P, curY + P);
      doc
        .fillColor(navy)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`M./Mme ${lease.tenantName}`, c2 + P, cy, { width: cW - P * 2 });
      cy += 14;
      doc
        .fillColor(gray)
        .fontSize(8)
        .font('Helvetica')
        .text(lease.tenantEmail, c2 + P, cy, { width: cW - P * 2 });
      if (lease.tenantPhone) {
        cy += 13;
        doc.text(lease.tenantPhone, c2 + P, cy, { width: cW - P * 2 });
      }
      curY += partyH + 12;

      // ── 5. Bien loué ──────────────────────────────────────────────────────────
      const propTitle =
        property?.title ?? `Bail ${lease.id.split('-')[0].toUpperCase()}`;
      const propH = P + 11 + 14 + (addr ? 14 : 0) + P;
      box(L, curY, W, propH);
      cy = sectionLabel('BIEN LOUÉ', L + P, curY + P);
      doc
        .fillColor(navy)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(propTitle, L + P, cy, { width: W - P * 2 });
      if (addr) {
        cy += 14;
        doc
          .fillColor(gray)
          .fontSize(8)
          .font('Helvetica')
          .text(addr, L + P, cy, { width: W - P * 2 });
      }
      curY += propH + 12;

      // ── 6. Settlement table ───────────────────────────────────────────────────
      doc
        .fillColor(gold)
        .fontSize(7)
        .font('Helvetica-Bold')
        .text('DÉTAIL DU RÈGLEMENT', L, curY);
      curY += 12;

      const rowH = 24;
      const tableRows: [string, string][] = [
        ['Loyer mensuel', fcfa(amount)],
        ['Charges', '0 FCFA'],
      ];
      for (const [label, value] of tableRows) {
        box(L, curY, W, rowH);
        doc
          .fillColor(gray)
          .fontSize(9)
          .font('Helvetica')
          .text(label, L + P, curY + 8);
        doc
          .fillColor(navy)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(value, L, curY + 8, { width: W - P, align: 'right' });
        curY += rowH;
      }
      // Total row — navy background
      const totH = 28;
      doc.rect(L, curY, W, totH).fill(navy).stroke(navy);
      doc
        .fillColor('white')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('TOTAL REÇU', L + P, curY + 9);
      doc
        .fillColor(gold)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(fcfa(amount), L, curY + 9, { width: W - P, align: 'right' });
      curY += totH + 16;

      // ── 7. Payment meta ───────────────────────────────────────────────────────
      const metaH = P * 2 + 22;
      doc.rect(L, curY, W, metaH).stroke(border);
      const midX = L + W / 2;
      // Left cell
      doc
        .fillColor(gray)
        .fontSize(7.5)
        .font('Helvetica')
        .text('DATE DE PAIEMENT', L + P, curY + P);
      doc
        .fillColor(navy)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(paidStr, L + P, curY + P + 11, { width: W / 2 - P * 2 });
      // Vertical divider
      doc
        .moveTo(midX, curY + 8)
        .lineTo(midX, curY + metaH - 8)
        .stroke(border);
      // Right cell
      doc
        .fillColor(gray)
        .fontSize(7.5)
        .font('Helvetica')
        .text('BAIL DEPUIS LE', midX + P, curY + P);
      doc
        .fillColor(navy)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(startStr, midX + P, curY + P + 11, { width: W / 2 - P * 2 });
      curY += metaH + 16;

      // ── 8. Signature area ─────────────────────────────────────────────────────
      const sigH = 88;
      // Left: signature box
      doc.rect(L, curY, cW, sigH).stroke(silver);
      doc
        .fillColor(gray)
        .fontSize(7)
        .font('Helvetica')
        .text('Signature et cachet du bailleur', L + P, curY + P, {
          width: cW - P * 2,
        });
      // "Prestige Immobilier" faint
      doc
        .fillColor(silver)
        .fontSize(8)
        .text('Prestige Immobilier', L + P, curY + sigH - 20, {
          width: cW - P * 2,
        });

      // Right: legal disclaimer
      doc
        .fillColor(gray)
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          "Cette quittance ne vaut reçu que sous réserve d'encaissement effectif des fonds.\n" +
            'Document généré par Prestige Immobilier · Non soumis à TVA.',
          c2 + P,
          curY + P,
          { width: cW - P * 2, lineGap: 3 },
        );
      curY += sigH + 16;

      // ── 9. Footer ─────────────────────────────────────────────────────────────
      const footerY = doc.page.height - 40;
      doc.rect(L, footerY - 8, W, 1).fill(border);
      doc
        .fillColor(silver)
        .fontSize(7)
        .font('Helvetica')
        .text(
          `Prestige Immobilier · Dakar, Sénégal · Réf. ${refNum}`,
          L,
          footerY,
          { width: W, align: 'center' },
        );

      doc.end();
    });
  }

  private async checkAccess(
    lease: RentalLease,
    userId: string,
    userRole: Role,
  ): Promise<void> {
    if (userRole === Role.ADMIN) return;
    const agent = await this.agentRepo.findOneBy({ userId });
    if (!agent || lease.agentId !== agent.id) throw new ForbiddenException();
  }
}
