export type SendEmailInput = {
  to: string;
  toName?: string;
  from: string;
  fromName: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  /** Stable per-recipient key. Providers that support it receive it for dedupe. */
  idempotencyKey: string;
  headers?: Record<string, string>;
  listUnsubscribeUrl?: string;
};

export type SendEmailResult = {
  providerMessageId: string;
  accepted: boolean;
  /** True when nothing was actually transmitted to a mail server. */
  simulated: boolean;
  detail?: string;
};

export interface EmailProvider {
  readonly name: string;
  readonly simulated: boolean;
  send(input: SendEmailInput): Promise<SendEmailResult>;
  verifyConnection(): Promise<{ ok: boolean; message: string }>;
}
