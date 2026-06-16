import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const host = process.env.SMTP_HOST;

    if (!host || process.env.NODE_ENV !== 'production') {
      // Mode dev : logs console uniquement
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT ?? 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
  }

  private layout(body: string, frontendUrl: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8F6F3;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F3;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#0f2044;padding:32px 40px;">
            <p style="margin:0;color:#c8a96e;font-size:22px;font-weight:700;letter-spacing:.5px;">Prestige Immobilier</p>
          </td>
        </tr>
        <tr><td style="padding:40px;">${body}</td></tr>
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Prestige Immobilier · Dakar, Sénégal<br>
              <a href="${frontendUrl}" style="color:#94a3b8;">prestige-immobilier.sn</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }

  private btn(href: string, label: string): string {
    return `<a href="${href}" style="display:inline-block;background:#0f2044;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">${label}</a>`;
  }

  private p(text: string): string {
    return `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">${text}</p>`;
  }

  private h(text: string): string {
    return `<p style="margin:0 0 16px;color:#0f2044;font-size:18px;font-weight:600;">${text}</p>`;
  }

  async sendLeaseCreated(opts: {
    to: string;
    tenantName: string;
    agentName: string;
    monthlyRent: number;
    startDate: Date;
    propertyAddress: string | null;
  }): Promise<void> {
    const {
      to,
      tenantName,
      agentName,
      monthlyRent,
      startDate,
      propertyAddress,
    } = opts;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';
    const dateStr = startDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const rentStr = new Intl.NumberFormat('fr-FR').format(monthlyRent);

    const body = `
      ${this.h(`Bonjour ${tenantName},`)}
      ${this.p(`Votre contrat de location a bien été enregistré${propertyAddress ? ` pour le bien situé au <strong>${propertyAddress}</strong>` : ''}. Vous trouverez ci-dessous les informations clés de votre bail :`)}
      <table style="width:100%;border-collapse:collapse;margin:0 0 24px;">
        <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;width:40%;">Montant mensuel</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:14px;color:#0f2044;">${rentStr} FCFA / mois</td></tr>
        <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:14px;">Début du bail</td>
            <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;font-weight:600;font-size:14px;color:#0f2044;">${dateStr}</td></tr>
        <tr><td style="padding:10px 0;color:#64748b;font-size:14px;">Propriétaire / Gérant</td>
            <td style="padding:10px 0;font-weight:600;font-size:14px;color:#0f2044;">${agentName}</td></tr>
      </table>
      ${this.p(`Pour toute question, n'hésitez pas à contacter votre gestionnaire.`)}`;

    const info = await this.transporter.sendMail({
      from: `"Prestige Immobilier" <${process.env.SMTP_FROM ?? 'noreply@prestige-immobilier.sn'}>`,
      to,
      subject: `📋 Votre contrat de location est enregistré — Prestige Immobilier`,
      html: this.layout(body, frontendUrl),
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] Email "bail créé" → ${to} | ${info.messageId}`);
    }
  }

  async sendLatePaymentAlert(opts: {
    to: string;
    firstName: string;
    lateCount: number;
  }): Promise<void> {
    const { to, firstName, lateCount } = opts;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';

    const body = `
      ${this.h(`Bonjour ${firstName},`)}
      ${this.p(`Votre portefeuille locatif comporte actuellement <strong style="color:#dc2626;">${lateCount} loyer${lateCount > 1 ? 's' : ''} en retard</strong>. Une action de votre part est recommandée pour régulariser la situation.`)}
      <div style="margin:0 0 24px;">${this.btn(`${frontendUrl}/account/leases`, 'Voir mes baux →')}</div>
      ${this.p(`<span style="font-size:13px;color:#94a3b8;">Vous recevez cet email car vous gérez des biens sur Prestige Immobilier.</span>`)}`;

    const info = await this.transporter.sendMail({
      from: `"Prestige Immobilier" <${process.env.SMTP_FROM ?? 'noreply@prestige-immobilier.sn'}>`,
      to,
      subject: `⚠️ ${lateCount} loyer${lateCount > 1 ? 's' : ''} en retard dans votre portefeuille`,
      html: this.layout(body, frontendUrl),
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `[DEV] Email "loyers en retard (${lateCount})" → ${to} | ${info.messageId}`,
      );
    }
  }

  async sendNewAppointment(opts: {
    to: string;
    agentFirstName: string;
    clientName: string;
    date: Date;
  }): Promise<void> {
    const { to, agentFirstName, clientName, date } = opts;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';
    const dateStr = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const body = `
      ${this.h(`Bonjour ${agentFirstName},`)}
      ${this.p(`<strong>${clientName}</strong> a demandé un rendez-vous avec vous :`)}
      <div style="background:#f1f5f9;border-radius:10px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:16px;font-weight:600;color:#0f2044;">📅 ${dateStr} à ${timeStr}</p>
      </div>
      ${this.p(`Connectez-vous à votre espace pour confirmer ou proposer un autre créneau.`)}
      <div style="margin:0 0 24px;">${this.btn(`${frontendUrl}/account/appointments`, 'Voir le rendez-vous →')}</div>`;

    const info = await this.transporter.sendMail({
      from: `"Prestige Immobilier" <${process.env.SMTP_FROM ?? 'noreply@prestige-immobilier.sn'}>`,
      to,
      subject: `📅 Nouveau rendez-vous de ${clientName}`,
      html: this.layout(body, frontendUrl),
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] Email "nouveau RDV" → ${to} | ${info.messageId}`);
    }
  }

  async sendAppointmentConfirmed(opts: {
    to: string;
    clientFirstName: string;
    agentName: string;
    date: Date;
  }): Promise<void> {
    const { to, clientFirstName, agentName, date } = opts;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';
    const dateStr = date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const body = `
      ${this.h(`Bonjour ${clientFirstName},`)}
      ${this.p(`Votre rendez-vous a été <strong style="color:#16a34a;">confirmé</strong> par <strong>${agentName}</strong>. Notez bien la date et l'heure :`)}
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px;margin:0 0 24px;">
        <p style="margin:0;font-size:16px;font-weight:600;color:#15803d;">✅ ${dateStr} à ${timeStr}</p>
      </div>
      ${this.p(`En cas d'imprévu, vous pouvez modifier votre rendez-vous depuis votre espace personnel.`)}
      <div style="margin:0 0 24px;">${this.btn(`${frontendUrl}/account/appointments`, 'Voir mes rendez-vous →')}</div>`;

    const info = await this.transporter.sendMail({
      from: `"Prestige Immobilier" <${process.env.SMTP_FROM ?? 'noreply@prestige-immobilier.sn'}>`,
      to,
      subject: `✅ Rendez-vous confirmé — ${dateStr}`,
      html: this.layout(body, frontendUrl),
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[DEV] Email "RDV confirmé" → ${to} | ${info.messageId}`);
    }
  }

  async sendSubscriptionExpiringSoon(opts: {
    to: string;
    firstName: string;
    planName: string;
    expiresAt: Date;
    daysLeft: number;
  }): Promise<void> {
    const { to, firstName, planName, expiresAt, daysLeft } = opts;
    const expiryStr = expiresAt.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3002';

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8F6F3;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F6F3;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0f2044;padding:32px 40px;">
            <p style="margin:0;color:#c8a96e;font-size:22px;font-weight:700;letter-spacing:.5px;">Prestige Immobilier</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="margin:0 0 16px;color:#0f2044;font-size:18px;font-weight:600;">Bonjour ${firstName},</p>
            <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
              Votre abonnement <strong style="color:#0f2044;">${planName}</strong> expire dans
              <strong style="color:#ea580c;">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>, le <strong>${expiryStr}</strong>.
            </p>
            <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.6;">
              Pour continuer à publier vos annonces sans interruption, renouvelez votre abonnement dès maintenant.
            </p>
            <a href="${frontendUrl}/pricing"
               style="display:inline-block;background:#0f2044;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
              Renouveler mon abonnement →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;color:#94a3b8;font-size:12px;">
              Prestige Immobilier · Dakar, Sénégal<br>
              <a href="${frontendUrl}/account/billing" style="color:#94a3b8;">Gérer mon abonnement</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const info = await this.transporter.sendMail({
      from: `"Prestige Immobilier" <${process.env.SMTP_FROM ?? 'noreply@prestige-immobilier.sn'}>`,
      to,
      subject: `⏳ Votre abonnement ${planName} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
      html,
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(
        `[DEV] Email "expiration J-${daysLeft}" → ${to} | messageId: ${info.messageId}`,
      );
    }
  }
}
