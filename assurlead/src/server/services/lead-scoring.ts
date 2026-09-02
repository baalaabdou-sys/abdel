import type { InsuranceType } from '@prisma/client';

/**
 * Transparent, rule-based lead qualification.
 *
 * Deliberate constraints:
 *  - Only declared intent, contactability and campaign fit are scored.
 *  - No sensitive or protected characteristic (health data, origin, religion,
 *    union membership, sexual orientation…) contributes to the score.
 *  - Every point is attributed to a named factor so the score can be explained
 *    to the user and to the person it concerns.
 */

export type ScoreFactor = { factor: string; label: string; points: number; detail: string };

export type ScoreInput = {
  product: InsuranceType;
  campaignProduct?: InsuranceType | null;
  answers: Record<string, unknown>;
  email?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  city?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  renewalDate?: Date | null;
  currentInsurer?: string | null;
  cameFromCampaign: boolean;
  contactVerified?: boolean;
};

export type ScoreResult = { score: number; band: string; breakdown: ScoreFactor[] };

const MAX = 100;

export function scoreLead(input: ScoreInput): ScoreResult {
  const breakdown: ScoreFactor[] = [];
  const add = (factor: string, label: string, points: number, detail: string) => {
    if (points !== 0) breakdown.push({ factor, label, points, detail });
  };

  // 1. Contactability (max 25)
  if (input.phone && input.phone.replace(/\D/g, '').length >= 9) {
    add('phone', 'Téléphone fourni', 15, 'Un numéro exploitable permet un rappel immédiat.');
  } else {
    add('phone', 'Téléphone manquant', -5, 'Sans numéro, le délai de prise de contact augmente.');
  }
  if (input.email) add('email', 'Email fourni', 6, 'Permet l’envoi du devis.');
  if (input.firstName && input.lastName) add('identity', 'Identité complète', 4, 'Nom et prénom renseignés.');

  // 2. Localisation (max 10)
  if (input.postalCode && /^\d{5}$/.test(input.postalCode)) {
    add('postal', 'Code postal valide', 6, 'Permet d’affecter le lead à la bonne équipe régionale.');
  }
  if (input.city) add('city', 'Ville renseignée', 4, 'Zone de couverture identifiable.');

  // 3. Adéquation produit (max 20)
  if (input.campaignProduct && input.campaignProduct === input.product) {
    add('product_match', 'Produit cohérent avec la campagne', 15, `Le lead demande bien : ${input.product}.`);
  } else if (input.campaignProduct) {
    add('product_match', 'Produit différent de la campagne', 4, 'Opportunité de vente croisée à qualifier.');
  } else {
    add('product_match', 'Produit identifié', 8, `Besoin déclaré : ${input.product}.`);
  }

  // 4. Timing / échéance (max 25)
  if (input.renewalDate) {
    const days = Math.round((input.renewalDate.getTime() - Date.now()) / 86_400_000);
    if (days >= 0 && days <= 30) add('timing', 'Échéance imminente (≤ 30 j)', 22, `Échéance dans ${days} jours.`);
    else if (days > 30 && days <= 60) add('timing', 'Échéance proche (≤ 60 j)', 17, `Échéance dans ${days} jours.`);
    else if (days > 60 && days <= 120) add('timing', 'Échéance à moyen terme', 10, `Échéance dans ${days} jours.`);
    else if (days < 0) add('timing', 'Échéance dépassée', 3, 'Le contrat a peut-être déjà été reconduit.');
    else add('timing', 'Échéance lointaine', 4, `Échéance dans ${days} jours.`);
  }

  // 5. Intention déclarée (max 20)
  const intent = String(input.answers.besoin ?? input.answers.intent ?? '').toLowerCase();
  if (/chang|résilier|resilier|switch/.test(intent)) add('intent', 'Souhaite changer d’assurance', 18, 'Intention de changement explicite.');
  else if (/compar|devis|tarif/.test(intent)) add('intent', 'Souhaite comparer', 12, 'Recherche active d’une alternative.');
  else if (/nouveau|nouvelle|acquisition/.test(intent)) add('intent', 'Nouveau besoin', 14, 'Nouveau véhicule ou nouveau contrat.');
  else if (intent) add('intent', 'Besoin déclaré', 6, `Réponse : ${intent}.`);

  const callback = String(input.answers.rappel ?? input.answers.preferred_contact_time ?? '');
  if (callback) add('callback', 'Créneau de rappel précisé', 8, `Disponibilité indiquée : ${callback}.`);

  if (input.currentInsurer) add('insurer', 'Assureur actuel connu', 5, 'Facilite l’argumentaire comparatif.');

  // 6. Qualité de la demande (max 10)
  const filled = Object.values(input.answers).filter((v) => v !== null && v !== undefined && String(v).trim() !== '').length;
  if (filled >= 8) add('completeness', 'Formulaire très complet', 8, `${filled} réponses fournies.`);
  else if (filled >= 5) add('completeness', 'Formulaire complet', 5, `${filled} réponses fournies.`);
  else if (filled <= 2) add('completeness', 'Formulaire minimal', -4, 'Peu d’informations pour qualifier la demande.');

  if (input.cameFromCampaign) add('source', 'Issu d’une campagne suivie', 5, 'Provenance et consentement traçables.');
  if (input.contactVerified) add('verified', 'Email vérifié', 3, 'Adresse validée par le fournisseur de vérification.');

  const raw = breakdown.reduce((sum, f) => sum + f.points, 0);
  const score = Math.max(0, Math.min(MAX, raw));
  return { score, band: bandFor(score), breakdown };
}

export function bandFor(score: number): string {
  if (score >= 80) return 'HOT';
  if (score >= 60) return 'GOOD';
  if (score >= 40) return 'CHECK';
  return 'LOW';
}
