import 'server-only';
import type { InsuranceType } from '@prisma/client';
import { prisma } from '@/lib/db';
import { INSURANCE_TYPES, insuranceLabel } from '@/lib/domain';

/** Creates the default configuration a new workspace needs to be usable. */
export async function bootstrapWorkspace(workspaceId: string) {
  await prisma.compliancePolicy.upsert({
    where: { workspaceId },
    update: {},
    create: { workspaceId },
  });

  const products: InsuranceType[] = ['AUTO', 'MOTO', 'HABITATION', 'SANTE', 'PREVOYANCE', 'RC_PRO'];
  await prisma.insuranceProduct.createMany({
    data: INSURANCE_TYPES.map((type) => ({
      workspaceId,
      type,
      label: insuranceLabel(type, 'fr'),
      active: products.includes(type),
    })),
    skipDuplicates: true,
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.dailyGoal.upsert({
    where: { workspaceId_date: { workspaceId, date: today } },
    update: {},
    create: { workspaceId, date: today, minTarget: 10, stretchTarget: 20 },
  });

  await prisma.emailAccount.create({
    data: {
      workspaceId,
      provider: 'DEMO',
      label: 'Expéditeur de test (DEMO)',
      fromEmail: 'demo@exemple.fr',
      fromName: 'Service Assurance',
      status: 'CONNECTED',
      statusMessage: "Fournisseur DEMO — aucun email réel n'est délivré.",
      dailyLimit: 2000,
      hourlyLimit: 500,
      warmupEnabled: false,
    },
  });

  await seedDefaultAutomations(workspaceId);
}

/** The automation rules that make the funnel work out of the box. */
export async function seedDefaultAutomations(workspaceId: string) {
  const existing = await prisma.automationRule.count({ where: { workspaceId } });
  if (existing > 0) return;

  await prisma.automationRule.createMany({
    data: [
      {
        workspaceId,
        name: 'Désinscription → suppression immédiate',
        description: "Ajoute le contact à la liste de suppression dès qu'il se désinscrit.",
        trigger: 'UNSUBSCRIBE',
        conditions: [],
        actions: [{ type: 'SUPPRESS_CONTACT', reason: 'UNSUBSCRIBED' }],
      },
      {
        workspaceId,
        name: 'Rebond définitif → suppression',
        description: 'Supprime les adresses en rebond définitif pour protéger la réputation.',
        trigger: 'HARD_BOUNCE',
        conditions: [],
        actions: [{ type: 'SUPPRESS_CONTACT', reason: 'HARD_BOUNCE' }],
      },
      {
        workspaceId,
        name: 'Nouveau lead → notifier l’équipe',
        description: 'Notifie l’équipe commerciale à chaque nouveau lead créé.',
        trigger: 'LEAD_CREATED',
        conditions: [],
        actions: [{ type: 'NOTIFY_TEAM', level: 'INFO' }, { type: 'ASSIGN_LEAD', strategy: 'ROUND_ROBIN' }],
      },
      {
        workspaceId,
        name: 'Lead chaud (score ≥ 80) → tâche d’appel urgente',
        description: 'Crée une tâche d’appel urgente et alerte le commercial assigné.',
        trigger: 'LEAD_SCORE_ABOVE',
        conditions: [{ field: 'score', operator: 'gte', value: 80 }],
        actions: [
          { type: 'CREATE_TASK', title: 'Appeler le lead chaud', taskType: 'CALL', priority: 'URGENT', dueInMinutes: 15 },
          { type: 'NOTIFY_OWNER', level: 'CRITICAL' },
        ],
      },
      {
        workspaceId,
        name: 'Lead non contacté après 10 min → alerter le manager',
        description: 'Surveille le speed-to-lead et alerte en cas de retard.',
        trigger: 'LEAD_NOT_CONTACTED',
        conditions: [{ field: 'minutes', operator: 'gte', value: 10 }],
        actions: [{ type: 'NOTIFY_MANAGERS', level: 'WARNING' }],
      },
      {
        workspaceId,
        name: 'Lead gagné → arrêter les campagnes marketing',
        description: 'Annule les envois marketing programmés pour un client signé.',
        trigger: 'LEAD_WON',
        conditions: [],
        actions: [{ type: 'CANCEL_SCHEDULED_SENDS' }],
      },
    ],
  });
}
