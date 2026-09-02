import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

export type SmtpConfig = {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  password?: string;
};

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  readonly simulated = false;
  private transporter: Transporter;

  constructor(private config: SmtpConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? config.port === 465,
      auth: config.user ? { user: config.user, pass: config.password } : undefined,
      pool: true,
      maxConnections: 3,
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const info = await this.transporter.sendMail({
      to: input.toName ? { name: input.toName, address: input.to } : input.to,
      from: { name: input.fromName, address: input.from },
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
      text: input.text,
      headers: {
        ...input.headers,
        'X-Assurlead-Key': input.idempotencyKey,
        ...(input.listUnsubscribeUrl
          ? {
              'List-Unsubscribe': `<${input.listUnsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            }
          : {}),
      },
    });
    return { providerMessageId: info.messageId, accepted: (info.accepted?.length ?? 0) > 0, simulated: false };
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { ok: true, message: 'Connexion SMTP établie.' };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : 'Connexion SMTP impossible' };
    }
  }
}
