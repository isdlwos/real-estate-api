import { Controller, Get, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MailService } from './mail.service';

type Res = any;

const FAKE = {
  agentEmail: 'aminata.diallo@prestige-immobilier.sn',
  agentFirstName: 'Aminata',
  agentName: 'Aminata Diallo',
  clientName: 'Ibrahima Fall',
  clientFirstName: 'Ibrahima',
  tenantName: 'Ousmane Diop',
  propertyAddress: 'Villa 12, Résidence Les Palmiers, Almadies',
  planName: 'Premium',
  date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // dans 3 jours
  startDate: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // dans 7 jours
  monthlyRent: 1_500_000,
  daysLeft: 7,
  lateCount: 3,
};

@ApiTags('mail-preview')
@Public()
@Controller('mail-preview')
export class MailPreviewController {
  constructor(private readonly mailService: MailService) {}

  private async render(res: Res, html: string) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get()
  @ApiOperation({ summary: 'Index de tous les aperçus d\'email' })
  index(@Res() res: Res) {
    const routes = [
      ['welcome', 'Bienvenue (inscription)'],
      ['password-reset', 'Réinitialisation du mot de passe'],
      ['appointment-new', 'Nouveau rendez-vous (agent)'],
      ['appointment-confirmed', 'Rendez-vous confirmé (client)'],
      ['appointment-cancelled', 'Rendez-vous annulé'],
      ['appointment-rescheduled', 'Rendez-vous reporté'],
      ['lease-created', 'Bail créé (locataire)'],
      ['late-payment', 'Loyers en retard (agent)'],
      ['subscription-expiring', 'Abonnement expire bientôt'],
      ['subscription-activated', 'Abonnement activé'],
    ];

    const links = routes
      .map(
        ([slug, label]) =>
          `<li><a href="/api/v1/mail-preview/${slug}" style="color:#0f2044;font-size:15px;text-decoration:none;display:flex;align-items:center;gap:10px;padding:12px 16px;border-radius:8px;border:1px solid #e2e8f0;margin-bottom:8px;background:#fff;transition:background .15s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='#fff'">
            <span style="font-size:18px;">✉️</span>
            <span>${label}</span>
            <span style="margin-left:auto;color:#94a3b8;font-size:12px;">/mail-preview/${slug}</span>
          </a></li>`,
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Aperçu des emails — Prestige Immobilier</title>
</head>
<body style="margin:0;padding:40px 20px;background:#F8F6F3;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;">
    <div style="background:#0f2044;border-radius:12px;padding:28px 32px;margin-bottom:32px;">
      <p style="margin:0;color:#c8a96e;font-size:22px;font-weight:700;">Prestige Immobilier</p>
      <p style="margin:6px 0 0;color:#8899bb;font-size:13px;">Aperçus des templates d'email</p>
    </div>
    <ul style="list-style:none;margin:0;padding:0;">${links}</ul>
    <p style="margin-top:24px;color:#94a3b8;font-size:12px;text-align:center;">
      Dev only — ces pages ne sont pas accessibles en production
    </p>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('welcome')
  @ApiOperation({ summary: 'Aperçu — email de bienvenue' })
  async welcome(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendWelcome({ to: 'preview', firstName: FAKE.clientFirstName }),
    );
    await this.render(res, html);
  }

  @Get('password-reset')
  @ApiOperation({ summary: 'Aperçu — réinitialisation mot de passe' })
  async passwordReset(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendPasswordReset({
        to: 'preview',
        firstName: FAKE.clientFirstName,
        resetUrl: 'http://localhost:3002/reset-password?token=FAKE_TOKEN_PREVIEW',
      }),
    );
    await this.render(res, html);
  }

  @Get('appointment-new')
  @ApiOperation({ summary: 'Aperçu — nouveau rendez-vous (agent)' })
  async appointmentNew(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendNewAppointment({
        to: 'preview',
        agentFirstName: FAKE.agentFirstName,
        clientName: FAKE.clientName,
        date: FAKE.date,
      }),
    );
    await this.render(res, html);
  }

  @Get('appointment-confirmed')
  @ApiOperation({ summary: 'Aperçu — rendez-vous confirmé (client)' })
  async appointmentConfirmed(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendAppointmentConfirmed({
        to: 'preview',
        clientFirstName: FAKE.clientFirstName,
        agentName: FAKE.agentName,
        date: FAKE.date,
      }),
    );
    await this.render(res, html);
  }

  @Get('appointment-cancelled')
  @ApiOperation({ summary: 'Aperçu — rendez-vous annulé' })
  async appointmentCancelled(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendAppointmentCancelled({
        to: 'preview',
        recipientName: FAKE.clientFirstName,
        date: FAKE.date,
        cancelledBy: 'client',
      }),
    );
    await this.render(res, html);
  }

  @Get('appointment-rescheduled')
  @ApiOperation({ summary: 'Aperçu — rendez-vous reporté' })
  async appointmentRescheduled(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendAppointmentRescheduled({
        to: 'preview',
        recipientName: FAKE.agentFirstName,
        newDate: FAKE.date,
      }),
    );
    await this.render(res, html);
  }

  @Get('lease-created')
  @ApiOperation({ summary: 'Aperçu — bail créé (locataire)' })
  async leaseCreated(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendLeaseCreated({
        to: 'preview',
        tenantName: FAKE.tenantName,
        agentName: FAKE.agentName,
        monthlyRent: FAKE.monthlyRent,
        startDate: FAKE.startDate,
        propertyAddress: FAKE.propertyAddress,
      }),
    );
    await this.render(res, html);
  }

  @Get('late-payment')
  @ApiOperation({ summary: 'Aperçu — loyers en retard (agent)' })
  async latePayment(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendLatePaymentAlert({
        to: 'preview',
        firstName: FAKE.agentFirstName,
        lateCount: FAKE.lateCount,
      }),
    );
    await this.render(res, html);
  }

  @Get('subscription-expiring')
  @ApiOperation({ summary: 'Aperçu — abonnement expire bientôt' })
  async subscriptionExpiring(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendSubscriptionExpiringSoon({
        to: 'preview',
        firstName: FAKE.agentFirstName,
        planName: FAKE.planName,
        expiresAt: FAKE.expiresAt,
        daysLeft: FAKE.daysLeft,
      }),
    );
    await this.render(res, html);
  }

  @Get('subscription-activated')
  @ApiOperation({ summary: 'Aperçu — abonnement activé' })
  async subscriptionActivated(@Res() res: Res) {
    const html = await this.capture(() =>
      this.mailService.sendSubscriptionActivated({
        to: 'preview',
        firstName: FAKE.agentFirstName,
        planName: FAKE.planName,
        expiresAt: FAKE.expiresAt,
      }),
    );
    await this.render(res, html);
  }

  // ---------------------------------------------------------------------------
  // Interception du HTML sans envoi réel
  // ---------------------------------------------------------------------------

  private async capture(fn: () => Promise<void>): Promise<string> {
    let captured = '';
    const originalSend = this.mailService['send'].bind(this.mailService);
    this.mailService['send'] = async (_to: string, _subject: string, html: string) => {
      captured = html;
    };
    await fn();
    this.mailService['send'] = originalSend;
    return captured;
  }
}
