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

export { EMAIL_PROVIDER_FIELDS } from '@/lib/email-provider-fields';
