import 'server-only';
import { prisma } from '@/lib/db';
import { evaluateAudience } from './sending';
import { segmentContactWhere } from './segments';
import { appUrl } from '@/lib/config';

/**
 * Campaign readiness check.
 *
 * Produces a 0–100 score plus itemised findings. Which findings block a launch
 * is decided by the workspace's CompliancePolicy, not by hardcoded rules.
 */

export type ReadinessCheck = {
  key: string;
  label: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'SKIP';
  detail: string;
  weight: number;
  blocking: boolean;
};

export type ReadinessReport = {
  score: number;
  checks: ReadinessCheck[];
  blocking: ReadinessCheck[];
  audience: { eligible: number; total: number; issues: Record<string, number> } | null;
  generatedAt: string;
};

export async function evaluateCampaignReadiness(campaignId: string): Promise<ReadinessReport> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      workspace: { include: { policy: true } },
      emailAccount: { include: { domain: true } },
      landingPage: { include: { form: { include: { fields: true } } } },
      segment: true,
      variants: true,
    },
  });
  if (!campaign) throw new Error('Campagne introuvable');

  const policy = campaign.workspace.policy ?? (await prisma.compliancePolicy.create({ data: { workspaceId: campaign.workspaceId } }));
  const checks: ReadinessCheck[] = [];
  const push = (c: ReadinessCheck) => checks.push(c);

  // ── Sender & authentication ───────────────────────────────────
  const account = campaign.emailAccount;
  push({
    key: 'sender',
    label: 'Compte expéditeur configuré',
    status: account && account.active ? 'PASS' : 'FAIL',
    detail: account ? `${account.fromName} <${account.fromEmail}> — ${account.provider}` : "Aucun compte d'envoi sélectionné.",
    weight: 12,
    blocking: !account || !account.active,
  });

  if (account?.provider === 'DEMO') {
    push({
      key: 'demo_provider',
      label: 'Fournisseur DEMO actif',
      status: 'WARN',
      detail: "Aucun email réel ne sera délivré. Connectez un fournisseur d'envoi pour une campagne de production.",
      weight: 0,
      blocking: false,
    });
  }

  const domain = account?.domain;
  for (const [key, label, value] of [
    ['spf', 'SPF', domain?.spf],
    ['dkim', 'DKIM', domain?.dkim],
    ['dmarc', 'DMARC', domain?.dmarc],
  ] as const) {
    push({
      key,
      label: `Authentification ${label}`,
      status: !domain ? 'SKIP' : value === 'CONFIGURED' ? 'PASS' : value === 'NEEDS_ATTENTION' ? 'WARN' : 'FAIL',
      detail: !domain
        ? "Aucun domaine d'envoi rattaché au compte — impossible de vérifier."
        : value === 'CONFIGURED'
          ? `${label} détecté sur ${domain.domain}.`
          : `${label} non conforme sur ${domain.domain}. La délivrabilité peut en souffrir.`,
      weight: 8,
      blocking: false,
    });
  }

  // ── Content ───────────────────────────────────────────────────
  const variant = campaign.variants[0];
  push({
    key: 'content',
    label: 'Contenu de l’email',
    status: variant && variant.subject.trim() && variant.bodyText.trim().length > 40 ? 'PASS' : 'FAIL',
    detail: variant ? `Objet : « ${variant.subject} »` : 'Aucun contenu rédigé.',
    weight: 12,
    blocking: !variant || !variant.subject.trim() || variant.bodyText.trim().length <= 40,
  });

  const spammy = variant ? detectSpammyLanguage(`${variant.subject} ${variant.bodyText}`) : [];
  push({
    key: 'content_quality',
    label: 'Qualité rédactionnelle',
    status: spammy.length === 0 ? 'PASS' : 'WARN',
    detail: spammy.length === 0
      ? "Aucune formulation à risque détectée (promesse chiffrée, urgence artificielle, majuscules excessives)."
      : `Formulations à revoir : ${spammy.join(', ')}.`,
    weight: 6,
    blocking: false,
  });

  // ── Links & landing page ──────────────────────────────────────
  const badLinks = variant ? findBrokenLinkSyntax(variant.bodyText) : [];
  push({
    key: 'links',
    label: 'Liens de l’email',
    status: badLinks.length === 0 ? 'PASS' : 'WARN',
    detail: badLinks.length === 0 ? 'Aucun lien malformé détecté.' : `Liens suspects : ${badLinks.join(', ')}`,
    weight: 4,
    blocking: false,
  });

  const page = campaign.landingPage;
  push({
    key: 'landing',
    label: 'Landing page publiée',
    status: page ? (page.status === 'PUBLISHED' ? 'PASS' : 'FAIL') : 'FAIL',
    detail: page
      ? page.status === 'PUBLISHED'
        ? `${appUrl()}/p/${page.slug}`
        : `« ${page.name} » est en brouillon : les destinataires arriveraient sur une page indisponible.`
      : 'Aucune landing page rattachée à la campagne.',
    weight: 12,
    blocking: !page || page.status !== 'PUBLISHED',
  });

  const form = page?.form;
  const requiredFields = form?.fields.filter((f) => f.required) ?? [];
  push({
    key: 'form',
    label: 'Formulaire opérationnel',
    status: form && form.fields.length >= 2 ? 'PASS' : 'FAIL',
    detail: form
      ? `${form.fields.length} champ(s), dont ${requiredFields.length} obligatoire(s).`
      : 'Aucun formulaire rattaché à la landing page : aucun lead ne pourra être créé.',
    weight: 12,
    blocking: !form || form.fields.length < 2,
  });

  const hasContactField = form?.fields.some((f) => ['email', 'tel'].includes(f.type)) ?? false;
  push({
    key: 'form_contact',
    label: 'Coordonnées collectées',
    status: hasContactField ? 'PASS' : 'FAIL',
    detail: hasContactField
      ? 'Le formulaire collecte au moins un moyen de contact.'
      : 'Le formulaire ne collecte ni email ni téléphone : les leads seraient inexploitables.',
    weight: 8,
    blocking: !hasContactField,
  });

  const hasConsentField = form?.fields.some((f) => f.type === 'checkbox') ?? false;
  push({
    key: 'form_consent',
    label: 'Case de consentement',
    status: hasConsentField ? 'PASS' : 'WARN',
    detail: hasConsentField
      ? 'Le formulaire comporte une case de consentement.'
      : "Aucune case de consentement : vérifiez que cela correspond à votre politique de collecte.",
    weight: 6,
    blocking: false,
  });

  // ── Unsubscribe ───────────────────────────────────────────────
  push({
    key: 'unsubscribe',
    label: 'Mécanisme de désinscription',
    status: 'PASS',
    detail: "Chaque email inclut un lien de désinscription et l'en-tête List-Unsubscribe.",
    weight: 10,
    blocking: false,
  });

  // ── Audience ──────────────────────────────────────────────────
  let audience: ReadinessReport['audience'] = null;
  if (campaign.segmentId) {
    const segWhere = await segmentContactWhere(campaign.workspaceId, campaign.segmentId);
    if (segWhere) {
      const result = await evaluateAudience(campaign.workspaceId, segWhere, policy);
      audience = { eligible: result.eligible, total: result.total, issues: result.issues };

      push({
        key: 'audience_size',
        label: 'Taille de l’audience éligible',
        status: result.eligible === 0 ? 'FAIL' : result.eligible < 20 ? 'WARN' : 'PASS',
        detail: `${result.eligible} destinataire(s) éligible(s) sur ${result.total} contact(s) dans le segment.`,
        weight: 12,
        blocking: result.eligible === 0,
      });

      push({
        key: 'suppression',
        label: 'Vérification de la liste de suppression',
        status: 'PASS',
        detail: `${result.issues.SUPPRESSED} contact(s) exclu(s) par la liste de suppression. Le contrôle est refait au moment de chaque envoi.`,
        weight: 8,
        blocking: false,
      });

      push({
        key: 'invalid_emails',
        label: 'Adresses invalides',
        status: result.issues.INVALID_EMAIL === 0 ? 'PASS' : 'WARN',
        detail: `${result.issues.INVALID_EMAIL} adresse(s) invalide(s) exclue(s) automatiquement.`,
        weight: 6,
        blocking: false,
      });

      const unverified = await prisma.contact.count({ where: { ...(segWhere as object), verificationStatus: 'UNVERIFIED' } });
      push({
        key: 'verification',
        label: 'Vérification des adresses',
        status: unverified === 0 ? 'PASS' : unverified > result.total * 0.3 ? 'WARN' : 'PASS',
        detail: unverified === 0
          ? 'Toutes les adresses du segment ont été vérifiées.'
          : `${unverified} adresse(s) non vérifiée(s) (${Math.round((unverified / Math.max(1, result.total)) * 100)} % du segment).`,
        weight: 6,
        blocking: false,
      });

      push({
        key: 'consent_unknown',
        label: 'Consentement inconnu',
        status: result.issues.CONSENT_UNKNOWN === 0 ? 'PASS' : 'WARN',
        detail: `${result.issues.CONSENT_UNKNOWN} contact(s) sans consentement enregistré.`,
        weight: 8,
        blocking: policy.blockOnUnknownConsent && result.issues.CONSENT_UNKNOWN > 0 && policy.allowUnknownConsent,
      });

      push({
        key: 'missing_source',
        label: 'Provenance des contacts',
        status: result.issues.MISSING_SOURCE === 0 ? 'PASS' : 'WARN',
        detail: `${result.issues.MISSING_SOURCE} contact(s) sans source enregistrée.`,
        weight: 6,
        blocking: policy.blockOnMissingSource && result.issues.MISSING_SOURCE > 0,
      });

      const duplicates = await prisma.campaignRecipient.groupBy({
        by: ['contactId'],
        where: { campaignId },
        having: { contactId: { _count: { gt: 1 } } },
      });
      push({
        key: 'duplicates',
        label: 'Destinataires en double',
        status: duplicates.length === 0 ? 'PASS' : 'FAIL',
        detail: duplicates.length === 0
          ? 'Aucun doublon : un destinataire ne peut recevoir la campagne qu’une seule fois.'
          : `${duplicates.length} doublon(s) détecté(s).`,
        weight: 6,
        blocking: duplicates.length > 0,
      });
    }
  } else {
    push({
      key: 'audience_size', label: 'Segment sélectionné', status: 'FAIL',
      detail: 'Aucun segment n’est associé à la campagne.', weight: 12, blocking: true,
    });
  }

  const scored = checks.filter((c) => c.status !== 'SKIP' && c.weight > 0);
  const maxScore = scored.reduce((s, c) => s + c.weight, 0);
  const earned = scored.reduce((s, c) => s + (c.status === 'PASS' ? c.weight : c.status === 'WARN' ? c.weight * 0.5 : 0), 0);
  const score = maxScore === 0 ? 0 : Math.round((earned / maxScore) * 100);

  const blocking = checks.filter((c) => c.blocking);
  if (policy.blockOnLowReadiness && score < policy.minReadinessScore) {
    blocking.push({
      key: 'min_score',
      label: 'Score minimum requis',
      status: 'FAIL',
      detail: `Score de ${score}/100, minimum configuré : ${policy.minReadinessScore}.`,
      weight: 0,
      blocking: true,
    });
  }

  const report: ReadinessReport = { score, checks, blocking, audience, generatedAt: new Date().toISOString() };
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { readinessScore: score, readinessReport: report as never },
  });
  return report;
}

const SPAM_PATTERNS: [RegExp, string][] = [
  [/\b\d+\s*%\s*(d[e']\s*)?(économie|reduction|réduction|remise)/i, 'économie chiffrée non vérifiable'],
  [/garanti[e]?\s+(100|sans)/i, 'garantie absolue'],
  [/\b(gratuit\s*!{2,}|100\s*%\s*gratuit)/i, 'gratuité surjouée'],
  [/dernière chance|offre expire|plus que \d+ places?/i, 'urgence artificielle'],
  [/cliquez ici maintenant|urgent\s*!/i, 'injonction agressive'],
  [/\b[A-ZÉÈÀÇ]{8,}\b/, 'majuscules excessives'],
  [/!{3,}/, 'ponctuation excessive'],
  [/meilleur prix du marché|imbattable|le moins cher/i, 'superlatif invérifiable'],
];

export function detectSpammyLanguage(text: string): string[] {
  return SPAM_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
}

function findBrokenLinkSyntax(text: string): string[] {
  const issues: string[] = [];
  for (const m of text.matchAll(/https?:\/\/\S+/g)) {
    const url = m[0].replace(/[.,);]+$/, '');
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes('.')) issues.push(url);
    } catch {
      issues.push(url);
    }
  }
  return issues;
}
