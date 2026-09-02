import { prisma } from '@/lib/db';
import { dispatchCampaignBatch, sendRecipient } from '@/server/services/sending';
import { runAutomations } from '@/server/services/automations';
import { refreshSegmentCount } from '@/server/services/segments';
import { getVerificationProvider } from '@/server/providers/verification';
import { getEmailProvider } from '@/server/providers/email';
import { checkDomainAuthentication } from '@/server/services/deliverability';
import { refreshDailyGoal } from '@/server/services/lead-intake';
import type { ClaimedJob } from '@/server/services/queue';

export type JobHandler = (job: ClaimedJob) => Promise<void>;

export const handlers: Record<string, JobHandler> = {
  'campaign.dispatch': async (job) => {
    await dispatchCampaignBatch(String(job.payload.campaignId));
  },

  'campaign.send_recipient': async (job) => {
    await sendRecipient(String(job.payload.recipientId));
  },

  'contacts.import': async (job) => {
    const { runImport } = await import('@/server/services/import');
    await runImport(String(job.payload.batchId));
  },

  'segment.refresh': async (job) => {
    await refreshSegmentCount(String(job.payload.workspaceId), String(job.payload.segmentId));
  },

  'contacts.verify_batch': async (job) => {
    const workspaceId = String(job.payload.workspaceId);
    const ids = (job.payload.contactIds as string[]) ?? [];
    const provider = await getVerificationProvider(workspaceId);
    const contacts = await prisma.contact.findMany({
      where: { workspaceId, id: { in: ids } },
      select: { id: true, email: true },
    });
    const periodMonth = new Date().toISOString().slice(0, 7);
    for (const c of contacts) {
      try {
        const result = await provider.verify(c.email);
        await prisma.$transaction([
          prisma.contact.update({
            where: { id: c.id },
            data: {
              verificationStatus: result.status,
              verifiedAt: new Date(),
              verificationProvider: result.provider,
              verificationConfidence: result.confidence,
              ...(result.status === 'INVALID' ? { emailMarketingAllowed: false } : {}),
            },
          }),
          prisma.verificationResult.create({
            data: {
              contactId: c.id,
              provider: result.provider,
              status: result.status,
              confidence: result.confidence,
              raw: result.raw as never,
            },
          }),
          prisma.apiUsage.create({
            data: { workspaceId, kind: 'VERIFICATION', provider: result.provider, quantity: 1, periodMonth },
          }),
        ]);
      } catch (err) {
        console.error(`[verify] ${c.email}`, err);
      }
    }
  },

  'automation.speed_to_lead': async (job) => {
    const leadId = String(job.payload.leadId);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.firstActionAt || lead.contactedAt) return;
    const minutes = Math.round((Date.now() - lead.createdAt.getTime()) / 60_000);
    await runAutomations('LEAD_NOT_CONTACTED', {
      workspaceId: lead.workspaceId,
      leadId,
      minutes,
      dedupeSuffix: 'speed_10',
    });
  },

  'notification.email': async (job) => {
    const notification = await prisma.notification.findUnique({
      where: { id: String(job.payload.notificationId) },
      include: { user: true, workspace: true },
    });
    if (!notification || notification.emailSent || !notification.user) return;

    const account = await prisma.emailAccount.findFirst({
      where: { workspaceId: notification.workspaceId, active: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!account) return;

    const provider = getEmailProvider(account);
    const link = notification.link ? `${process.env.APP_URL ?? 'http://localhost:3000'}${notification.link}` : '';
    await provider.send({
      to: notification.user.email,
      from: account.fromEmail,
      fromName: account.fromName,
      subject: notification.title,
      idempotencyKey: `notif-${notification.id}`,
      text: `${notification.title}\n\n${notification.body}\n\n${link}`,
      html: `<p style="font-size:15px"><strong>${notification.title}</strong></p><p style="font-size:14px">${notification.body}</p>${link ? `<p><a href="${link}">Voir dans ASSURLEAD AI</a></p>` : ''}`,
    });
    await prisma.notification.update({ where: { id: notification.id }, data: { emailSent: true } });
  },

  'deliverability.check_domain': async (job) => {
    await checkDomainAuthentication(String(job.payload.domainId));
  },

  'goal.rollup': async (job) => {
    const workspaceId = job.payload.workspaceId ? String(job.payload.workspaceId) : null;
    const ids = workspaceId
      ? [workspaceId]
      : (await prisma.workspace.findMany({ select: { id: true } })).map((w) => w.id);
    for (const id of ids) await refreshDailyGoal(id);
  },
};
