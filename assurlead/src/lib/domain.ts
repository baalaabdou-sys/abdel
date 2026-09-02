import type {
  CampaignObjective, CampaignStatus, ConsentState, InsuranceType, LeadStatus,
  RecipientStatus, SuppressionReason, TaskPriority, TaskStatus, VerificationStatus,
  ReplyCategory, DnsCheckStatus, ContactStatus,
} from '@prisma/client';
import type { Locale } from '@/i18n/config';

type L = { fr: string; en: string };
const pick = (l: L, locale: Locale) => (locale === 'en' ? l.en : l.fr);

export const INSURANCE_TYPES: InsuranceType[] = [
  'AUTO', 'MOTO', 'HABITATION', 'SANTE', 'PREVOYANCE', 'EMPRUNTEUR',
  'PROFESSIONNELLE', 'DECENNALE', 'RC_PRO', 'AUTRE',
];

const INSURANCE_LABELS: Record<InsuranceType, L> = {
  AUTO: { fr: 'Assurance Auto', en: 'Car insurance' },
  MOTO: { fr: 'Assurance Moto', en: 'Motorcycle insurance' },
  HABITATION: { fr: 'Assurance Habitation', en: 'Home insurance' },
  SANTE: { fr: 'Santé / Mutuelle', en: 'Health insurance' },
  PREVOYANCE: { fr: 'Prévoyance', en: 'Personal protection' },
  EMPRUNTEUR: { fr: 'Assurance Emprunteur', en: 'Loan insurance' },
  PROFESSIONNELLE: { fr: 'Assurance Professionnelle', en: 'Business insurance' },
  DECENNALE: { fr: 'Garantie Décennale', en: 'Ten-year warranty' },
  RC_PRO: { fr: 'RC Pro', en: 'Professional liability' },
  AUTRE: { fr: 'Autre', en: 'Other' },
};

export const insuranceLabel = (t: InsuranceType, locale: Locale = 'fr') => pick(INSURANCE_LABELS[t], locale);

const CAMPAIGN_OBJECTIVES: Record<CampaignObjective, L> = {
  QUOTE_REQUEST: { fr: 'Générer des demandes de devis', en: 'Generate quote requests' },
  CALLBACK_REQUEST: { fr: 'Obtenir des demandes de rappel', en: 'Get callback requests' },
  RENEWAL: { fr: 'Campagne de renouvellement', en: 'Renewal campaign' },
  CROSS_SELL: { fr: 'Vente croisée', en: 'Cross-sell' },
  REACTIVATION: { fr: 'Réactiver des prospects', en: 'Reactivate prospects' },
  NEWSLETTER: { fr: 'Newsletter / information', en: 'Newsletter' },
};
export const objectiveLabel = (o: CampaignObjective, locale: Locale = 'fr') => pick(CAMPAIGN_OBJECTIVES[o], locale);
export const CAMPAIGN_OBJECTIVE_LIST = Object.keys(CAMPAIGN_OBJECTIVES) as CampaignObjective[];

const CAMPAIGN_STATUSES: Record<CampaignStatus, L> = {
  DRAFT: { fr: 'Brouillon', en: 'Draft' },
  SCHEDULED: { fr: 'Programmée', en: 'Scheduled' },
  SENDING: { fr: 'En cours d’envoi', en: 'Sending' },
  PAUSED: { fr: 'En pause', en: 'Paused' },
  COMPLETED: { fr: 'Terminée', en: 'Completed' },
  CANCELLED: { fr: 'Annulée', en: 'Cancelled' },
};
export const campaignStatusLabel = (s: CampaignStatus, locale: Locale = 'fr') => pick(CAMPAIGN_STATUSES[s], locale);
export const campaignStatusTone: Record<CampaignStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  DRAFT: 'muted', SCHEDULED: 'default', SENDING: 'success', PAUSED: 'warning', COMPLETED: 'secondary', CANCELLED: 'destructive',
};

const LEAD_STATUSES: Record<LeadStatus, L> = {
  NOUVEAU: { fr: 'Nouveau', en: 'New' },
  A_CONTACTER: { fr: 'À contacter', en: 'To contact' },
  CONTACTE: { fr: 'Contacté', en: 'Contacted' },
  QUALIFIE: { fr: 'Qualifié', en: 'Qualified' },
  TRES_INTERESSE: { fr: 'Très intéressé', en: 'Very interested' },
  RENDEZ_VOUS: { fr: 'Rendez-vous', en: 'Appointment' },
  DEVIS_ENVOYE: { fr: 'Devis envoyé', en: 'Quote sent' },
  GAGNE: { fr: 'Gagné', en: 'Won' },
  PERDU: { fr: 'Perdu', en: 'Lost' },
  NON_ELIGIBLE: { fr: 'Non éligible', en: 'Not eligible' },
  NE_PAS_CONTACTER: { fr: 'Ne pas contacter', en: 'Do not contact' },
};
export const leadStatusLabel = (s: LeadStatus, locale: Locale = 'fr') => pick(LEAD_STATUSES[s], locale);
export const LEAD_STATUS_LIST = Object.keys(LEAD_STATUSES) as LeadStatus[];

/** Statuses that count as a qualified lead for the daily KPI. */
export const QUALIFIED_LEAD_STATUSES: LeadStatus[] = [
  'QUALIFIE', 'TRES_INTERESSE', 'RENDEZ_VOUS', 'DEVIS_ENVOYE', 'GAGNE',
];
/** Minimum score at which a lead is automatically considered qualified. */
export const QUALIFIED_SCORE_THRESHOLD = 60;

export const CRM_PIPELINE: LeadStatus[] = [
  'NOUVEAU', 'CONTACTE', 'QUALIFIE', 'RENDEZ_VOUS', 'DEVIS_ENVOYE', 'GAGNE', 'PERDU',
];

const VERIFICATION_STATUSES: Record<VerificationStatus, L> = {
  UNVERIFIED: { fr: 'Non vérifié', en: 'Unverified' },
  VALID: { fr: 'Valide', en: 'Valid' },
  LIKELY_VALID: { fr: 'Probablement valide', en: 'Likely valid' },
  CATCH_ALL: { fr: 'Catch-all', en: 'Catch-all' },
  RISKY: { fr: 'Risqué', en: 'Risky' },
  UNKNOWN: { fr: 'Inconnu', en: 'Unknown' },
  INVALID: { fr: 'Invalide', en: 'Invalid' },
};
export const verificationLabel = (s: VerificationStatus, locale: Locale = 'fr') => pick(VERIFICATION_STATUSES[s], locale);
export const verificationTone: Record<VerificationStatus, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  UNVERIFIED: 'muted', VALID: 'success', LIKELY_VALID: 'success', CATCH_ALL: 'warning',
  RISKY: 'warning', UNKNOWN: 'muted', INVALID: 'destructive',
};

const CONSENT_STATES: Record<ConsentState, L> = {
  UNKNOWN: { fr: 'Inconnu', en: 'Unknown' },
  GRANTED: { fr: 'Accordé', en: 'Granted' },
  DENIED: { fr: 'Refusé', en: 'Denied' },
  WITHDRAWN: { fr: 'Retiré', en: 'Withdrawn' },
};
export const consentLabel = (s: ConsentState, locale: Locale = 'fr') => pick(CONSENT_STATES[s], locale);
export const consentTone: Record<ConsentState, 'default' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  UNKNOWN: 'warning', GRANTED: 'success', DENIED: 'destructive', WITHDRAWN: 'destructive',
};

const RECIPIENT_STATUSES: Record<RecipientStatus, L> = {
  PENDING: { fr: 'En attente', en: 'Pending' },
  QUEUED: { fr: 'En file', en: 'Queued' },
  PROCESSING: { fr: 'En traitement', en: 'Processing' },
  SENT: { fr: 'Envoyé', en: 'Sent' },
  FAILED: { fr: 'Échec', en: 'Failed' },
  BOUNCED: { fr: 'Rebond', en: 'Bounced' },
  SUPPRESSED: { fr: 'Supprimé (liste)', en: 'Suppressed' },
  CANCELLED: { fr: 'Annulé', en: 'Cancelled' },
  SKIPPED: { fr: 'Ignoré', en: 'Skipped' },
};
export const recipientStatusLabel = (s: RecipientStatus, locale: Locale = 'fr') => pick(RECIPIENT_STATUSES[s], locale);

const SUPPRESSION_REASONS: Record<SuppressionReason, L> = {
  UNSUBSCRIBED: { fr: 'Désinscrit', en: 'Unsubscribed' },
  DO_NOT_CONTACT: { fr: 'Ne pas contacter', en: 'Do not contact' },
  HARD_BOUNCE: { fr: 'Rebond définitif', en: 'Hard bounce' },
  COMPLAINT: { fr: 'Plainte', en: 'Complaint' },
  MANUAL_BLOCK: { fr: 'Blocage manuel', en: 'Manual block' },
  INVALID: { fr: 'Adresse invalide', en: 'Invalid address' },
  OTHER: { fr: 'Autre', en: 'Other' },
};
export const suppressionReasonLabel = (s: SuppressionReason, locale: Locale = 'fr') => pick(SUPPRESSION_REASONS[s], locale);
export const SUPPRESSION_REASON_LIST = Object.keys(SUPPRESSION_REASONS) as SuppressionReason[];

const TASK_STATUSES: Record<TaskStatus, L> = {
  TODO: { fr: 'À faire', en: 'To do' },
  IN_PROGRESS: { fr: 'En cours', en: 'In progress' },
  DONE: { fr: 'Terminé', en: 'Done' },
  CANCELLED: { fr: 'Annulé', en: 'Cancelled' },
};
export const taskStatusLabel = (s: TaskStatus, locale: Locale = 'fr') => pick(TASK_STATUSES[s], locale);

const TASK_PRIORITIES: Record<TaskPriority, L> = {
  LOW: { fr: 'Basse', en: 'Low' },
  NORMAL: { fr: 'Normale', en: 'Normal' },
  HIGH: { fr: 'Haute', en: 'High' },
  URGENT: { fr: 'Urgente', en: 'Urgent' },
};
export const taskPriorityLabel = (s: TaskPriority, locale: Locale = 'fr') => pick(TASK_PRIORITIES[s], locale);

const REPLY_CATEGORIES: Record<ReplyCategory, L> = {
  UNCLASSIFIED: { fr: 'Non classé', en: 'Unclassified' },
  INTERESTED: { fr: 'Intéressé', en: 'Interested' },
  CALLBACK_REQUEST: { fr: 'Demande de rappel', en: 'Callback request' },
  QUOTE_REQUEST: { fr: 'Demande de devis', en: 'Quote request' },
  QUESTION: { fr: 'Question', en: 'Question' },
  NOT_INTERESTED: { fr: 'Pas intéressé', en: 'Not interested' },
  NOT_NOW: { fr: 'Pas maintenant', en: 'Not now' },
  UNSUBSCRIBE: { fr: 'Désinscription', en: 'Unsubscribe' },
  OUT_OF_OFFICE: { fr: 'Absence', en: 'Out of office' },
  OTHER: { fr: 'Autre', en: 'Other' },
};
export const replyCategoryLabel = (s: ReplyCategory, locale: Locale = 'fr') => pick(REPLY_CATEGORIES[s], locale);
export const REPLY_CATEGORY_LIST = Object.keys(REPLY_CATEGORIES) as ReplyCategory[];

const DNS_STATUSES: Record<DnsCheckStatus, L> = {
  UNKNOWN: { fr: 'Non vérifié', en: 'Not checked' },
  CONFIGURED: { fr: 'Configuré', en: 'Configured' },
  MISSING: { fr: 'Manquant', en: 'Missing' },
  INVALID: { fr: 'Invalide', en: 'Invalid' },
  NEEDS_ATTENTION: { fr: 'À vérifier', en: 'Needs attention' },
};
export const dnsStatusLabel = (s: DnsCheckStatus, locale: Locale = 'fr') => pick(DNS_STATUSES[s], locale);
export const dnsStatusTone: Record<DnsCheckStatus, 'success' | 'warning' | 'destructive' | 'muted'> = {
  UNKNOWN: 'muted', CONFIGURED: 'success', MISSING: 'destructive', INVALID: 'destructive', NEEDS_ATTENTION: 'warning',
};

const CONTACT_STATUSES: Record<ContactStatus, L> = {
  PROSPECT: { fr: 'Prospect', en: 'Prospect' },
  CUSTOMER: { fr: 'Client', en: 'Customer' },
  FORMER_CUSTOMER: { fr: 'Ancien client', en: 'Former customer' },
};
export const contactStatusLabel = (s: ContactStatus, locale: Locale = 'fr') => pick(CONTACT_STATUSES[s], locale);

export function scoreBand(score: number): { band: string; label: L; tone: 'success' | 'default' | 'warning' | 'muted'; emoji: string } {
  if (score >= 80) return { band: 'HOT', label: { fr: 'TRÈS QUALIFIÉ', en: 'VERY QUALIFIED' }, tone: 'success', emoji: '🔥' };
  if (score >= 60) return { band: 'GOOD', label: { fr: 'BON LEAD', en: 'GOOD LEAD' }, tone: 'default', emoji: '👍' };
  if (score >= 40) return { band: 'CHECK', label: { fr: 'À VÉRIFIER', en: 'TO REVIEW' }, tone: 'warning', emoji: '🔎' };
  return { band: 'LOW', label: { fr: 'FAIBLE PRIORITÉ', en: 'LOW PRIORITY' }, tone: 'muted', emoji: '·' };
}
export const scoreBandLabel = (score: number, locale: Locale = 'fr') => pick(scoreBand(score).label, locale);

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
