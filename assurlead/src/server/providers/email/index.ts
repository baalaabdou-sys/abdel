import 'server-only';
import type { EmailAccount } from '@prisma/client';
import { decryptConfig } from '@/lib/crypto';
import type { EmailProvider } from './types';
import { DemoEmailProvider } from './demo';
import { SmtpEmailProvider } from './smtp';
import { BrevoEmailProvider } from './brevo';
import { MailgunEmailProvider } from './mailgun';
import { SesEmailProvider } from './ses';
import { PostmarkEmailProvider } from './postmark';

export type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

/**
 * Builds the transport for a stored email account. Any account whose
 * credentials are missing or unusable falls back to the DEMO transport rather
 * than silently pretending an email was delivered.
 */
export function getEmailProvider(account: EmailAccount): EmailProvider {
  const cfg = decryptConfig(account.credentials as Record<string, unknown>);
  const str = (k: string) => String(cfg[k] ?? '');

  switch (account.provider) {
    case 'SMTP':
      if (str('host')) {
        return new SmtpEmailProvider({
          host: str('host'),
          port: Number(cfg.port ?? 587),
          secure: Boolean(cfg.secure),
          user: str('user') || undefined,
          password: str('password') || undefined,
        });
      }
      break;
    case 'BREVO':
      if (str('apiKey')) return new BrevoEmailProvider(str('apiKey'));
      break;
    case 'MAILGUN':
      if (str('apiKey') && str('domain')) {
        return new MailgunEmailProvider(str('apiKey'), str('domain'), (str('region') as 'us' | 'eu') || 'eu');
      }
      break;
    case 'SES':
      if (str('accessKeyId') && str('secretAccessKey')) {
        return new SesEmailProvider(str('accessKeyId'), str('secretAccessKey'), str('region') || 'eu-west-1');
      }
      break;
    case 'POSTMARK':
      if (str('serverToken')) return new PostmarkEmailProvider(str('serverToken'), str('messageStream') || 'broadcast');
      break;
    case 'DEMO':
    default:
      break;
  }
  return new DemoEmailProvider(account.workspaceId);
}

export const EMAIL_PROVIDER_FIELDS: Record<string, { key: string; label: string; type: 'text' | 'password' | 'number' | 'boolean'; placeholder?: string }[]> = {
  DEMO: [],
  SMTP: [
    { key: 'host', label: 'Serveur SMTP', type: 'text', placeholder: 'smtp.exemple.fr' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '587' },
    { key: 'secure', label: 'TLS implicite (port 465)', type: 'boolean' },
    { key: 'user', label: 'Utilisateur', type: 'text' },
    { key: 'password', label: 'Mot de passe', type: 'password' },
  ],
  BREVO: [{ key: 'apiKey', label: 'Clé API Brevo', type: 'password' }],
  MAILGUN: [
    { key: 'apiKey', label: 'Clé API Mailgun', type: 'password' },
    { key: 'domain', label: 'Domaine Mailgun', type: 'text', placeholder: 'mg.exemple.fr' },
    { key: 'region', label: 'Région (eu / us)', type: 'text', placeholder: 'eu' },
  ],
  SES: [
    { key: 'accessKeyId', label: 'AWS Access Key ID', type: 'text' },
    { key: 'secretAccessKey', label: 'AWS Secret Access Key', type: 'password' },
    { key: 'region', label: 'Région AWS', type: 'text', placeholder: 'eu-west-1' },
  ],
  POSTMARK: [
    { key: 'serverToken', label: 'Server Token', type: 'password' },
    { key: 'messageStream', label: 'Message stream', type: 'text', placeholder: 'broadcast' },
  ],
};
