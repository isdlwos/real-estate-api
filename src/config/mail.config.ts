import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  apiKey: process.env.MAILJET_API_KEY ?? '',
  apiSecret: process.env.MAILJET_API_SECRET ?? '',
  fromEmail: process.env.MAIL_FROM_EMAIL ?? 'noreply@prestige-immobilier.sn',
  fromName: process.env.MAIL_FROM_NAME ?? 'Prestige Immobilier',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3002',
}));
