import crypto from 'crypto';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

/** Minimal SigV4 signer for the SES v2 SendEmail endpoint (no AWS SDK dependency). */
function sign(key: Buffer | string, msg: string): Buffer {
  return crypto.createHmac('sha256', key).update(msg, 'utf8').digest();
}

export class SesEmailProvider implements EmailProvider {
  readonly name = 'ses';
  readonly simulated = false;

  constructor(
    private accessKeyId: string,
    private secretAccessKey: string,
    private region = 'eu-west-1',
  ) {}

  private async request(path: string, payload: unknown) {
    const host = `email.${this.region}.amazonaws.com`;
    const body = JSON.stringify(payload);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';
    const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const scope = `${dateStamp}/${this.region}/ses/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      scope,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const signingKey = sign(sign(sign(sign(`AWS4${this.secretAccessKey}`, dateStamp), this.region), 'ses'), 'aws4_request');
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    return fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-amz-date': amzDate,
        authorization: `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body,
    });
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const res = await this.request('/v2/email/outbound-emails', {
      FromEmailAddress: `${input.fromName} <${input.from}>`,
      Destination: { ToAddresses: [input.to] },
      ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
      Content: {
        Simple: {
          Subject: { Data: input.subject, Charset: 'UTF-8' },
          Body: {
            Html: { Data: input.html, Charset: 'UTF-8' },
            Text: { Data: input.text, Charset: 'UTF-8' },
          },
        },
      },
    });
    if (!res.ok) throw new Error(`SES error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const json = (await res.json()) as { MessageId?: string };
    return { providerMessageId: json.MessageId ?? input.idempotencyKey, accepted: true, simulated: false };
  }

  async verifyConnection() {
    const res = await this.request('/v2/email/account', {});
    return res.ok || res.status === 400
      ? { ok: res.ok, message: res.ok ? 'Compte SES accessible.' : `SES a répondu ${res.status}.` }
      : { ok: false, message: `SES a répondu ${res.status}.` };
  }
}
