import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

export class MailgunEmailProvider implements EmailProvider {
  readonly name = 'mailgun';
  readonly simulated = false;

  constructor(
    private apiKey: string,
    private domain: string,
    private region: 'us' | 'eu' = 'eu',
  ) {}

  private base() {
    return this.region === 'eu' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const body = new URLSearchParams({
      from: `${input.fromName} <${input.from}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      'h:X-Assurlead-Key': input.idempotencyKey,
    });
    if (input.replyTo) body.set('h:Reply-To', input.replyTo);
    if (input.listUnsubscribeUrl) body.set('h:List-Unsubscribe', `<${input.listUnsubscribeUrl}>`);

    const res = await fetch(`${this.base()}/${this.domain}/messages`, {
      method: 'POST',
      headers: { authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}` },
      body,
    });
    if (!res.ok) throw new Error(`Mailgun error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as { id?: string };
    return { providerMessageId: json.id ?? input.idempotencyKey, accepted: true, simulated: false };
  }

  async verifyConnection() {
    const res = await fetch(`${this.base()}/domains/${this.domain}`, {
      headers: { authorization: `Basic ${Buffer.from(`api:${this.apiKey}`).toString('base64')}` },
    });
    return res.ok
      ? { ok: true, message: `Domaine Mailgun ${this.domain} accessible.` }
      : { ok: false, message: `Mailgun a répondu ${res.status}.` };
  }
}
