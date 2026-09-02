import { prisma } from '@/lib/db';
import type { EmailProvider, SendEmailInput, SendEmailResult } from './types';

/**
 * DEMO transport. Nothing leaves the machine — each "send" is persisted to the
 * DemoOutbox so the full funnel (including CTA links) can be exercised locally.
 * Results are always flagged `simulated: true` and shown as DEMO in the UI.
 */
export class DemoEmailProvider implements EmailProvider {
  readonly name = 'demo';
  readonly simulated = true;

  constructor(private workspaceId?: string) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    // Recorded as an audit-style trace so the operator can inspect what *would*
    // have been transmitted, including the personalised body and CTA URL.
    if (this.workspaceId) {
      await prisma.auditLog.create({
        data: {
          workspaceId: this.workspaceId,
          action: 'email.demo_send',
          entityType: 'EmailMessage',
          entityId: input.idempotencyKey,
          summary: `[DEMO] ${input.to} — ${input.subject}`,
          after: {
            to: input.to,
            from: input.from,
            subject: input.subject,
            text: input.text.slice(0, 4000),
            listUnsubscribeUrl: input.listUnsubscribeUrl ?? null,
          } as never,
        },
      });
    }
    return {
      providerMessageId: `demo-${input.idempotencyKey}`,
      accepted: true,
      simulated: true,
      detail: "Fournisseur DEMO : aucun email réel n'a été transmis.",
    };
  }

  async verifyConnection() {
    return { ok: true, message: "Fournisseur DEMO actif — aucun email réel n'est envoyé." };
  }
}
