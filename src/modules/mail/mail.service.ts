import { Injectable, Logger } from '@nestjs/common';
import Mailjet from 'node-mailjet';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly mj: InstanceType<typeof Mailjet> | null;
  private readonly from: { Email: string; Name: string };
  private readonly frontendUrl: string;
  private readonly logoUrl: string;

  constructor() {
    const apiKey = process.env.MAILJET_API_KEY;
    const apiSecret = process.env.MAILJET_API_SECRET;

    this.from = {
      Email: process.env.MAIL_FROM_EMAIL ?? 'noreply@prestige-immobilier.sn',
      Name: process.env.MAIL_FROM_NAME ?? 'Prestige Immobilier',
    };
    this.frontendUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.FRONTEND_URL ?? 'http://localhost:3002';
    this.logoUrl =
      process.env.MAIL_LOGO_URL ??
      'https://raw.githubusercontent.com/isdlwos/real-estate-web/main/public/logo.svg';

    if (apiKey && apiSecret) {
      this.mj = new Mailjet({ apiKey, apiSecret });
      this.logger.log(`MailService prêt — expéditeur : ${this.from.Email}`);
    } else {
      this.mj = null;
      this.logger.warn('MAILJET_API_KEY / MAILJET_API_SECRET manquants — emails désactivés (logs seulement)');
    }
  }

  // ---------------------------------------------------------------------------
  // Envoi interne
  // ---------------------------------------------------------------------------

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.mj) {
      this.logger.log(`[DEV no-send] → ${to} | ${subject}`);
      return;
    }
    try {
      const res = await this.mj.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: this.from,
            To: [{ Email: to }],
            Subject: subject,
            HTMLPart: html,
          },
        ],
      });
      const status = (res.body as any)?.Messages?.[0]?.Status ?? 'unknown';
      this.logger.log(`Email envoyé → ${to} | ${subject} | status: ${status}`);
    } catch (err: any) {
      this.logger.error(`Échec envoi email → ${to} | ${subject} | ${err?.message ?? err}`);
    }
  }

  // Couleurs du thème
  private static readonly NAVY   = '#0f2044';
  private static readonly GOLD   = '#c8a96e';
  private static readonly CREAM  = '#F8F6F3';
  private static readonly TEXT   = '#1e293b';
  private static readonly MUTED  = '#64748b';

  // ---------------------------------------------------------------------------
  // Layout principal
  // ---------------------------------------------------------------------------

  private layout(body: string): string {
    const { NAVY, GOLD, CREAM } = MailService;

    const logo = `<img src="${this.logoUrl}" alt="Prestige Immobilier" width="220" height="46" style="display:block;margin:0 auto;border:0;" />`;

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Prestige Immobilier</title>
</head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ══ EN-TÊTE ══ -->
          <tr>
            <td style="background-color:${NAVY};border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
              ${logo}
              <div style="height:1px;background:linear-gradient(to right,transparent,${GOLD},transparent);margin:18px 0 14px;"></div>
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:rgba(200,169,110,0.5);">Biens d'exception</p>
            </td>
          </tr>

          <!-- ══ BANDE OR ══ -->
          <tr>
            <td style="height:3px;background:linear-gradient(to right,${NAVY},${GOLD},${NAVY});font-size:3px;line-height:3px;">&nbsp;</td>
          </tr>

          <!-- ══ CONTENU ══ -->
          <tr>
            <td style="background-color:#ffffff;padding:48px 40px;">
              ${body}
            </td>
          </tr>

          <!-- ══ PIED DE PAGE ══ -->
          <tr>
            <td style="background-color:${NAVY};border-radius:0 0 12px 12px;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 8px;font-family:'Inter',Arial,sans-serif;font-size:12px;color:${GOLD};letter-spacing:2px;text-transform:uppercase;font-weight:500;">Prestige Immobilier</p>
              <p style="margin:0 0 16px;font-family:'Inter',Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.45);">Dakar, Sénégal</p>
              <div style="height:1px;background:rgba(200,169,110,0.3);margin-bottom:16px;"></div>
              <p style="margin:0;font-family:'Inter',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.3);">
                Vous recevez cet email car vous êtes inscrit sur
                <a href="${this.frontendUrl}" style="color:${GOLD};text-decoration:none;">prestige-immobilier.sn</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // ---------------------------------------------------------------------------
  // Composants HTML réutilisables
  // ---------------------------------------------------------------------------

  private btn(href: string, label: string): string {
    return `<table cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
      <tr>
        <td style="background-color:${MailService.GOLD};border-radius:6px;">
          <a href="${href}" style="display:inline-block;padding:14px 32px;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.5px;">${label}</a>
        </td>
      </tr>
    </table>`;
  }

  private p(text: string): string {
    return `<p style="margin:0 0 16px;font-family:'Inter',Arial,sans-serif;font-size:15px;line-height:1.7;color:${MailService.TEXT};">${text}</p>`;
  }

  private h(text: string): string {
    return `<h1 style="margin:0 0 8px;font-family:'Gilda Display',Georgia,serif;font-size:28px;font-weight:400;color:${MailService.NAVY};line-height:1.3;">${text}</h1>`;
  }

  private divider(): string {
    return `<div style="height:1px;background:linear-gradient(to right,${MailService.GOLD},transparent);margin:24px 0;"></div>`;
  }

  private note(text: string): string {
    return `<p style="margin:24px 0 0;font-family:'Inter',Arial,sans-serif;font-size:12px;color:${MailService.MUTED};line-height:1.6;border-left:3px solid ${MailService.GOLD};padding-left:12px;">${text}</p>`;
  }

  private infoBox(rows: { label: string; value: string }[]): string {
    const { CREAM, MUTED, TEXT } = MailService;
    const trs = rows
      .map(
        (r) =>
          `<tr>
            <td style="padding:10px 16px;font-family:'Inter',Arial,sans-serif;font-size:13px;color:${MUTED};font-weight:500;width:40%;border-bottom:1px solid #f1f5f9;">${r.label}</td>
            <td style="padding:10px 16px;font-family:'Inter',Arial,sans-serif;font-size:13px;color:${TEXT};font-weight:600;border-bottom:1px solid #f1f5f9;">${r.value}</td>
          </tr>`,
      )
      .join('');
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};border-radius:8px;border:1px solid #e2e8f0;margin:24px 0;">${trs}</table>`;
  }

  // ---------------------------------------------------------------------------
  // Emails — Baux locatifs
  // ---------------------------------------------------------------------------

  async sendLeaseCreated(opts: {
    to: string;
    tenantName: string;
    agentName: string;
    monthlyRent: number;
    startDate: Date;
    propertyAddress: string | null;
  }): Promise<void> {
    const { to, tenantName, agentName, monthlyRent, startDate, propertyAddress } = opts;
    const dateStr = startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const rentStr = new Intl.NumberFormat('fr-FR').format(monthlyRent);

    const body = `
      ${this.h('Votre bail est enregistré')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${tenantName}</strong>,`)}
      ${this.p(`Votre contrat de location a bien été enregistré${propertyAddress ? ` pour le bien situé au <strong>${propertyAddress}</strong>` : ''}. Voici les informations clés :`)}
      ${this.infoBox([
        { label: 'Montant mensuel', value: `${rentStr} FCFA / mois` },
        { label: 'Début du bail', value: dateStr },
        { label: 'Gestionnaire', value: agentName },
      ])}
      ${this.note('Pour toute question, contactez directement votre gestionnaire depuis votre espace personnel.')}`;

    await this.send(to, `📋 Votre contrat de location est enregistré — Prestige Immobilier`, this.layout(body));
  }

  async sendLatePaymentAlert(opts: {
    to: string;
    firstName: string;
    lateCount: number;
  }): Promise<void> {
    const { to, firstName, lateCount } = opts;

    const body = `
      ${this.h('Loyers en retard')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${firstName}</strong>,`)}
      ${this.p(`Votre portefeuille locatif comporte actuellement <strong style="color:#dc2626;">${lateCount} loyer${lateCount > 1 ? 's' : ''} en retard</strong>. Nous vous invitons à régulariser la situation au plus tôt.`)}
      ${this.btn(`${this.frontendUrl}/account/leases`, 'Gérer mes baux')}
      ${this.note('Vous recevez cet email car vous gérez des biens sur Prestige Immobilier.')}`;

    await this.send(
      to,
      `⚠️ ${lateCount} loyer${lateCount > 1 ? 's' : ''} en retard dans votre portefeuille`,
      this.layout(body),
    );
  }

  // ---------------------------------------------------------------------------
  // Emails — Rendez-vous
  // ---------------------------------------------------------------------------

  async sendNewAppointment(opts: {
    to: string;
    agentFirstName: string;
    clientName: string;
    date: Date;
  }): Promise<void> {
    const { to, agentFirstName, clientName, date } = opts;
    const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const body = `
      ${this.h('Nouveau rendez-vous')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${agentFirstName}</strong>,`)}
      ${this.p(`<strong>${clientName}</strong> a demandé un rendez-vous avec vous pour visiter un de vos biens.`)}
      ${this.infoBox([
        { label: 'Client', value: clientName },
        { label: 'Date', value: `${dateStr} à ${timeStr}` },
      ])}
      ${this.btn(`${this.frontendUrl}/account/appointments`, 'Gérer mes rendez-vous')}
      ${this.note('Confirmez ou proposez un autre créneau depuis votre espace agent.')}`;

    await this.send(to, `📅 Nouveau rendez-vous de ${clientName}`, this.layout(body));
  }

  async sendAppointmentConfirmed(opts: {
    to: string;
    clientFirstName: string;
    agentName: string;
    date: Date;
  }): Promise<void> {
    const { to, clientFirstName, agentName, date } = opts;
    const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const body = `
      ${this.h('Rendez-vous confirmé')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${clientFirstName}</strong>,`)}
      ${this.p(`Votre rendez-vous a été <strong style="color:#16a34a;">confirmé</strong> par <strong>${agentName}</strong>.`)}
      ${this.infoBox([
        { label: 'Agent', value: agentName },
        { label: 'Date', value: `${dateStr} à ${timeStr}` },
      ])}
      ${this.btn(`${this.frontendUrl}/account/appointments`, 'Voir mes rendez-vous')}
      ${this.note('En cas d\'imprévu, vous pouvez annuler ou reporter depuis votre espace personnel.')}`;

    await this.send(to, `✅ Rendez-vous confirmé — ${dateStr}`, this.layout(body));
  }

  async sendAppointmentCancelled(opts: {
    to: string;
    recipientName: string;
    date: Date;
    cancelledBy: 'client' | 'agent';
  }): Promise<void> {
    const { to, recipientName, date, cancelledBy } = opts;
    const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const body = `
      ${this.h('Rendez-vous annulé')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${recipientName}</strong>,`)}
      ${this.p(`Le rendez-vous du <strong>${dateStr} à ${timeStr}</strong> a été <strong style="color:#dc2626;">annulé</strong> par ${cancelledBy === 'client' ? 'le client' : "l'agent"}.`)}
      ${this.btn(`${this.frontendUrl}/account/appointments`, 'Voir mes rendez-vous')}
      ${this.note('Vous pouvez programmer un nouveau rendez-vous depuis votre espace personnel.')}`;

    await this.send(to, `❌ Rendez-vous annulé — ${dateStr}`, this.layout(body));
  }

  async sendAppointmentRescheduled(opts: {
    to: string;
    recipientName: string;
    newDate: Date;
  }): Promise<void> {
    const { to, recipientName, newDate } = opts;
    const dateStr = newDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const timeStr = newDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const body = `
      ${this.h('Rendez-vous reporté')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${recipientName}</strong>,`)}
      ${this.p('Votre rendez-vous a été reporté à une nouvelle date.')}
      ${this.infoBox([
        { label: 'Nouvelle date', value: `${dateStr} à ${timeStr}` },
      ])}
      ${this.btn(`${this.frontendUrl}/account/appointments`, 'Voir mes rendez-vous')}
      ${this.note('Si ce créneau ne vous convient pas, vous pouvez en proposer un autre depuis votre espace.')}`;

    await this.send(to, `🗓️ Rendez-vous reporté — ${dateStr}`, this.layout(body));
  }

  // ---------------------------------------------------------------------------
  // Emails — Abonnements
  // ---------------------------------------------------------------------------

  async sendSubscriptionExpiringSoon(opts: {
    to: string;
    firstName: string;
    planName: string;
    expiresAt: Date;
    daysLeft: number;
  }): Promise<void> {
    const { to, firstName, planName, expiresAt, daysLeft } = opts;
    const expiryStr = expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const body = `
      ${this.h('Votre abonnement expire bientôt')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${firstName}</strong>,`)}
      ${this.p(`Votre abonnement <strong>${planName}</strong> expire dans <strong style="color:#ea580c;">${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.`)}
      ${this.infoBox([
        { label: 'Formule', value: planName },
        { label: 'Date d\'expiration', value: expiryStr },
      ])}
      ${this.btn(`${this.frontendUrl}/pricing`, 'Renouveler mon abonnement')}
      ${this.note(`Après expiration, vos annonces actives seront masquées. <a href="${this.frontendUrl}/account/billing" style="color:${MailService.GOLD};">Gérer mon abonnement</a>`)}`;

    await this.send(
      to,
      `⏳ Votre abonnement ${planName} expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
      this.layout(body),
    );
  }

  async sendSubscriptionActivated(opts: {
    to: string;
    firstName: string;
    planName: string;
    expiresAt: Date;
  }): Promise<void> {
    const { to, firstName, planName, expiresAt } = opts;
    const expiryStr = expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const body = `
      ${this.h('Abonnement activé')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${firstName}</strong>,`)}
      ${this.p(`Votre abonnement <strong>${planName}</strong> est maintenant <strong style="color:#16a34a;">actif</strong>. Vous pouvez publier vos annonces sans restriction.`)}
      ${this.infoBox([
        { label: 'Formule', value: planName },
        { label: 'Valide jusqu\'au', value: expiryStr },
      ])}
      ${this.btn(`${this.frontendUrl}/account`, 'Accéder à mon espace')}
      ${this.note('Merci de votre confiance. Notre équipe reste disponible pour vous accompagner.')}`;

    await this.send(to, `🎉 Abonnement ${planName} activé — Prestige Immobilier`, this.layout(body));
  }

  // ---------------------------------------------------------------------------
  // Emails — Bienvenue / Auth
  // ---------------------------------------------------------------------------

  async sendWelcome(opts: { to: string; firstName: string }): Promise<void> {
    const { to, firstName } = opts;

    const body = `
      ${this.h(`Bienvenue, ${firstName}`)}
      ${this.divider()}
      ${this.p('Votre compte a été créé avec succès sur <strong>Prestige Immobilier</strong>. Nous sommes ravis de vous accueillir.')}
      ${this.p("Vous pouvez dès maintenant explorer notre catalogue de biens d'exception et prendre rendez-vous avec nos agents.")}
      ${this.btn(`${this.frontendUrl}/properties`, 'Découvrir nos propriétés')}
      ${this.note("Si vous n'êtes pas à l'origine de cette inscription, vous pouvez ignorer cet email.")}`;

    await this.send(to, `Bienvenue sur Prestige Immobilier`, this.layout(body));
  }

  async sendPasswordReset(opts: { to: string; firstName: string; resetUrl: string }): Promise<void> {
    const { to, firstName, resetUrl } = opts;

    const body = `
      ${this.h('Réinitialisation de mot de passe')}
      ${this.divider()}
      ${this.p(`Bonjour <strong>${firstName}</strong>,`)}
      ${this.p('Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour en définir un nouveau.')}
      ${this.btn(resetUrl, 'Réinitialiser mon mot de passe')}
      ${this.note("Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email — votre mot de passe ne sera pas modifié.")}`;

    await this.send(to, `Réinitialisation de votre mot de passe`, this.layout(body));
  }
}
