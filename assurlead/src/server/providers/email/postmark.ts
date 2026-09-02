import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

export class PostmarkEmailProvider implements EmailProvider {
  readonly name = 'postmark';
  readonly simulated = false;

  constructor(private serverToken: string, private messageStream = 'broadcast') {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Postmark-Server-Token': this.serverToken },
      body: JSON.stringify({
        From: `${input.fromName} <${input.from}>`,
        To: input.to,
        ReplyTo: input.replyTo,
        Subject: input.subject,
        HtmlBody: input.html,
        TextBody: input.text,
        MessageStream: this.messageStream,
        Headers: [
          { Name: 'X-Assurlead-Key', Value: input.idempotencyKey },
          ...(input.listUnsubscribeUrl ? [{ Name: 'List-Unsubscribe', Value: `<${input.listUnsubscribeUrl}>` }] : []),
        ],
      }),
    });
    if (!res.ok) throw new Error(`Postmark error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as { MessageID?: string };
    return { providerMessageId: json.MessageID ?? input.idempotencyKey, accepted: true, simulated: false };
  }

  async verifyConnection() {
    const res = await fetch('https://api.postmarkapp.com/server', {
      headers: { 'X-Postmark-Server-Token': this.serverToken },
    });
    return res.ok
      ? { ok: true, message: 'Serveur Postmark accessible.' }
      : { ok: false, message: `Postmark a répondu ${res.status}.` };
  }
}
