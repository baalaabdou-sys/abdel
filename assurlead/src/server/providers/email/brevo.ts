import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

const API = 'https://api.brevo.com/v3';

export class BrevoEmailProvider implements EmailProvider {
  readonly name = 'brevo';
  readonly simulated = false;

  constructor(private apiKey: string) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await fetch(`${API}/smtp/email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'api-key': this.apiKey },
      body: JSON.stringify({
        sender: { email: input.from, name: input.fromName },
        to: [{ email: input.to, name: input.toName }],
        replyTo: input.replyTo ? { email: input.replyTo } : undefined,
        subject: input.subject,
        htmlContent: input.html,
        textContent: input.text,
        headers: {
          ...input.headers,
          'X-Assurlead-Key': input.idempotencyKey,
          ...(input.listUnsubscribeUrl ? { 'List-Unsubscribe': `<${input.listUnsubscribeUrl}>` } : {}),
        },
        tags: ['assurlead'],
      }),
    });
    if (!res.ok) throw new Error(`Brevo error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as { messageId?: string };
    return { providerMessageId: json.messageId ?? input.idempotencyKey, accepted: true, simulated: false };
  }

  async verifyConnection() {
    const res = await fetch(`${API}/account`, { headers: { 'api-key': this.apiKey } });
    return res.ok
      ? { ok: true, message: 'Compte Brevo accessible.' }
      : { ok: false, message: `Brevo a répondu ${res.status}.` };
  }
}
