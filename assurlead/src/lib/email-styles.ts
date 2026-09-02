/** Copy styles offered by the AI email writer, shared with the campaign UI. */
export const EMAIL_STYLES = [
  { key: 'SHORT', label: 'Court et direct' },
  { key: 'PROFESSIONAL', label: 'Professionnel' },
  { key: 'FRIENDLY', label: 'Chaleureux' },
  { key: 'URGENCY', label: 'Urgence factuelle (sans exagération)' },
  { key: 'OFFER', label: 'Orienté offre' },
  { key: 'RENEWAL', label: 'Rappel d’échéance' },
  { key: 'QUOTE', label: 'Demande de devis' },
] as const;

export type EmailStyle = (typeof EMAIL_STYLES)[number]['key'];
