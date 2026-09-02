import type { Contact } from '@prisma/client';
import { insuranceLabel } from '@/lib/domain';

/**
 * Variable substitution for campaign copy.
 * Every supported variable has a neutral French fallback, so a missing field can
 * never render as "Bonjour undefined".
 */

export type PersonalizationVars = Record<string, string>;

export const SUPPORTED_VARIABLES: { key: string; label: string; fallback: string }[] = [
  { key: 'first_name', label: 'Prénom', fallback: 'Bonjour' },
  { key: 'last_name', label: 'Nom', fallback: '' },
  { key: 'full_name', label: 'Nom complet', fallback: '' },
  { key: 'city', label: 'Ville', fallback: 'votre ville' },
  { key: 'postal_code', label: 'Code postal', fallback: '' },
  { key: 'insurance_type', label: 'Type d’assurance', fallback: 'votre assurance' },
  { key: 'renewal_date', label: 'Date d’échéance', fallback: 'votre prochaine échéance' },
  { key: 'current_insurer', label: 'Assureur actuel', fallback: 'votre assureur actuel' },
  { key: 'company', label: 'Entreprise', fallback: 'votre entreprise' },
  { key: 'profession', label: 'Profession', fallback: '' },
];

const FALLBACKS: Record<string, string> = Object.fromEntries(
  SUPPORTED_VARIABLES.map((v) => [v.key, v.fallback]),
);

/** Special-cased so "Bonjour {{first_name}}," reads correctly without a name. */
const GREETING_FALLBACK = '';

export function contactVariables(contact: Partial<Contact>, locale: 'fr' | 'en' = 'fr'): PersonalizationVars {
  const first = (contact.firstName ?? '').trim();
  const last = (contact.lastName ?? '').trim();
  const vars: PersonalizationVars = {
    first_name: first,
    last_name: last,
    full_name: [first, last].filter(Boolean).join(' '),
    city: (contact.city ?? '').trim(),
    postal_code: (contact.postalCode ?? '').trim(),
    company: (contact.company ?? '').trim(),
    profession: (contact.profession ?? '').trim(),
    current_insurer: (contact.currentInsurer ?? '').trim(),
    insurance_type: contact.insuranceInterests?.length ? insuranceLabel(contact.insuranceInterests[0], locale) : '',
    renewal_date: contact.renewalDate
      ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', { dateStyle: 'long' }).format(contact.renewalDate)
      : '',
  };
  for (const [k, v] of Object.entries((contact.customData as Record<string, unknown>) ?? {})) {
    if (typeof v === 'string' || typeof v === 'number') vars[`custom_${k}`] = String(v);
  }
  return vars;
}

/**
 * Renders `{{variable}}` placeholders. Unknown or empty variables fall back to a
 * neutral value, and greetings collapse cleanly ("Bonjour Marie," → "Bonjour,").
 */
export function renderTemplate(template: string, vars: PersonalizationVars): string {
  let out = template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key];
    if (value !== undefined && value !== '') return value;
    return FALLBACKS[key] ?? GREETING_FALLBACK;
  });
  // Tidy the artefacts an empty substitution leaves behind.
  out = out
    .replace(/([Bb]onjour|[Hh]ello|[Hh]i)\s+,/g, '$1,')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ');
  return out;
}

/** Lists variables used in a piece of copy, for the preview panel. */
export function extractVariables(template: string): string[] {
  const found = new Set<string>();
  for (const m of template.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) found.add(m[1]);
  return [...found];
}
