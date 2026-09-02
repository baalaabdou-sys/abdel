import 'server-only';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { sha256 } from '@/lib/crypto';

/**
 * Capture of funnel events and leads from a landing page the client hosts
 * themselves, rather than one built in ASSURLEAD AI.
 *
 * Trust model — deliberately the same shape as any analytics or forms product:
 *  - The **public key** is visible in the page source. It identifies the
 *    workspace, it is not a secret, and on its own it grants nothing: browser
 *    requests are additionally checked against the site's origin allow-list and
 *    rate limited.
 *  - The **secret key** is for server-to-server posts from the client's own
 *    backend, where an origin header cannot be trusted. It is stored hashed.
 *
 * Because browser capture can be forged by anyone who reads the page source,
 * leads created this way are tagged with their origin so the operator can tell
 * them apart. For a stricter guarantee, the client posts server-side.
 */

export type CaptureIdentity = {
  site: { id: string; workspaceId: string; formId: string | null; product: string; fieldMapping: Record<string, string>; consentText: string; requireConsentField: boolean };
  /** How the caller proved itself — server posts are stronger evidence. */
  channel: 'browser' | 'server';
};

export function generatePublicKey(): string {
  return `alp_${crypto.randomBytes(16).toString('hex')}`;
}

export function generateSecretKey(): string {
  return `als_${crypto.randomBytes(24).toString('hex')}`;
}

export function hashSecretKey(key: string): string {
  return sha256(key);
}

/** Normalises an Origin/Referer header down to scheme://host[:port]. */
export function normalizeOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

export function originAllowed(origin: string | null, allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  if (!origin) return false;
  return allowed.some((entry) => {
    const normalized = normalizeOrigin(entry) ?? entry.toLowerCase().replace(/\/+$/, '');
    if (normalized === origin) return true;
    // A bare host is accepted for either scheme, which is what operators type.
    const host = origin.replace(/^https?:\/\//, '');
    return entry.toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '') === host;
  });
}

/**
 * Resolves the caller. A secret key wins when present; otherwise the public key
 * is accepted only from an allow-listed origin.
 */
export async function authenticateCapture(
  publicKey: string | null,
  secretKey: string | null,
  origin: string | null,
): Promise<{ ok: true; identity: CaptureIdentity } | { ok: false; status: number; error: string }> {
  if (secretKey) {
    const site = await prisma.captureSite.findFirst({
      where: { secretKeyHash: hashSecretKey(secretKey), active: true },
    });
    if (!site) return { ok: false, status: 401, error: 'Clé secrète invalide' };
    return { ok: true, identity: { site: toIdentity(site), channel: 'server' } };
  }

  if (!publicKey) return { ok: false, status: 400, error: 'Clé publique manquante' };

  const site = await prisma.captureSite.findUnique({ where: { publicKey } });
  if (!site || !site.active) return { ok: false, status: 401, error: 'Clé publique inconnue ou site désactivé' };

  if (!originAllowed(origin, site.allowedOrigins)) {
    return { ok: false, status: 403, error: "Origine non autorisée pour ce site de capture" };
  }
  return { ok: true, identity: { site: toIdentity(site), channel: 'browser' } };
}

function toIdentity(site: {
  id: string; workspaceId: string; formId: string | null; product: string;
  fieldMapping: unknown; consentText: string; requireConsentField: boolean;
}): CaptureIdentity['site'] {
  return {
    id: site.id,
    workspaceId: site.workspaceId,
    formId: site.formId,
    product: site.product,
    fieldMapping: (site.fieldMapping as Record<string, string>) ?? {},
    consentText: site.consentText,
    requireConsentField: site.requireConsentField,
  };
}

/**
 * Common French field names seen on insurance landing pages, normalised onto the
 * keys the lead pipeline understands. A per-site `fieldMapping` overrides this.
 */
const FIELD_ALIAS_SOURCE: Record<string, string> = {
  // identity
  prenom: 'prenom', firstname: 'prenom', first_name: 'prenom', 'first-name': 'prenom',
  nom: 'nom', lastname: 'nom', last_name: 'nom', 'last-name': 'nom', surname: 'nom',
  nom_complet: 'nom', fullname: 'nom', full_name: 'nom', name: 'nom',
  // contact
  email: 'email', mail: 'email', courriel: 'email', adresse_email: 'email', 'e-mail': 'email',
  telephone: 'telephone', tel: 'telephone', phone: 'telephone', mobile: 'telephone',
  portable: 'telephone', numero: 'telephone', 'numero_de_telephone': 'telephone',
  // location
  code_postal: 'code_postal', codepostal: 'code_postal', cp: 'code_postal',
  postal_code: 'code_postal', zip: 'code_postal', zipcode: 'code_postal',
  ville: 'ville', city: 'ville', commune: 'ville',
  // insurance
  assureur_actuel: 'assureur_actuel', assureur: 'assureur_actuel', mutuelle_actuelle: 'assureur_actuel',
  compagnie: 'assureur_actuel', current_insurer: 'assureur_actuel',
  date_echeance: 'date_echeance', echeance: 'date_echeance', renewal_date: 'date_echeance',
  type_assurance: 'type_assurance', produit: 'type_assurance', insurance_type: 'type_assurance',
  besoin: 'besoin', need: 'besoin', objectif: 'besoin', demande: 'besoin',
  // scheduling and free text
  rappel: 'rappel', creneau: 'rappel', moment: 'rappel', preferred_contact_time: 'rappel',
  message: 'message', commentaire: 'message', precisions: 'message', comment: 'message',
  // age is commonly collected on senior health pages
  age: 'age', date_naissance: 'date_naissance', birthdate: 'date_naissance', dob: 'date_naissance',
};

const CONSENT_KEYS = ['consentement', 'consent', 'rgpd', 'gdpr', 'accept', 'acceptation', 'optin', 'opt_in', 'cgu', 'cgv'];

function normalizeKey(key: string): string {
  return key
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * The alias table is written the natural way ("e-mail", "code postal") but
 * matched against normalised keys, so both sides go through `normalizeKey`.
 * Without this, a field literally named "E-mail" would not be recognised.
 */
const FIELD_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_ALIAS_SOURCE).map(([alias, target]) => [normalizeKey(alias), target]),
);

export type MappedSubmission = {
  answers: Record<string, unknown>;
  consentGiven: boolean;
  consentFieldPresent: boolean;
};

/**
 * Maps an arbitrary payload from the client's form onto our answer keys.
 * Unrecognised fields are kept under their normalised name rather than dropped,
 * so nothing the visitor typed is lost.
 */
export function mapSubmission(raw: Record<string, unknown>, mapping: Record<string, string>): MappedSubmission {
  const answers: Record<string, unknown> = {};
  let consentGiven = false;
  let consentFieldPresent = false;

  for (const [rawKey, value] of Object.entries(raw)) {
    if (value === undefined || value === null) continue;
    const normalized = normalizeKey(rawKey);
    if (!normalized) continue;

    // Honeypot and framework noise are ignored outright.
    if (['_honeypot', 'honeypot', '_csrf', 'csrf_token', '_token', 'g_recaptcha_response'].includes(normalized)) continue;

    const explicit = mapping[rawKey] ?? mapping[normalized];
    const target = explicit ?? FIELD_ALIASES[normalized] ?? normalized;

    if (CONSENT_KEYS.some((c) => normalized.includes(c))) {
      consentFieldPresent = true;
      consentGiven = value === true || value === 'true' || value === 'on' || value === '1' || value === 'oui';
      answers.consentement = consentGiven;
      continue;
    }

    // Keep the first non-empty value when several inputs map to the same target.
    const text = typeof value === 'string' ? value.trim() : value;
    if (text === '') continue;
    if (answers[target] === undefined || answers[target] === '') answers[target] = text;
  }

  return { answers, consentGiven, consentFieldPresent };
}

/** Resolves the campaign recipient behind a tracking token, if any. */
export async function resolveTrackingToken(workspaceId: string, token: string | null) {
  if (!token) return null;
  const recipient = await prisma.campaignRecipient.findUnique({
    where: { trackingToken: token },
    select: { id: true, campaignId: true, contactId: true, campaign: { select: { workspaceId: true } } },
  });
  if (!recipient || recipient.campaign.workspaceId !== workspaceId) return null;
  return recipient;
}

/** Records a view or an intermediate funnel step from an external page. */
export async function recordCaptureEvent(params: {
  site: CaptureIdentity['site'];
  type: 'LANDING_VIEW' | 'FORM_START' | 'FORM_STEP';
  token: string | null;
  sessionId: string;
  step?: number;
  pageUrl?: string;
}) {
  const recipient = await resolveTrackingToken(params.site.workspaceId, params.token);
  const bucket = new Date().toISOString().slice(0, 13);
  const dedupeKey =
    params.type === 'FORM_STEP'
      ? `cap-step:${params.site.id}:${params.sessionId}:${params.step ?? 0}`
      : `cap-${params.type.toLowerCase()}:${params.site.id}:${params.sessionId}:${bucket}`;

  try {
    await prisma.campaignEvent.create({
      data: {
        workspaceId: params.site.workspaceId,
        campaignId: recipient?.campaignId ?? null,
        recipientId: recipient?.id ?? null,
        contactId: recipient?.contactId ?? null,
        type: params.type,
        dedupeKey,
        metadata: { captureSiteId: params.site.id, pageUrl: params.pageUrl ?? null, step: params.step ?? null } as never,
      },
    });
  } catch (err) {
    // Same visitor, same hour: expected, and not an error.
    if ((err as { code?: string }).code !== 'P2002') throw err;
  }

  if (params.type === 'LANDING_VIEW') {
    await prisma.captureSite.update({
      where: { id: params.site.id },
      data: { viewCount: { increment: 1 }, lastEventAt: new Date() },
    }).catch(() => undefined);
  }
}
