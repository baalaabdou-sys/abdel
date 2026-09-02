/** Contact fields an import can map to, shared by the server parser and the wizard UI. */
export const CONTACT_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'email', label: 'Email', required: true },
  { key: 'firstName', label: 'Prénom' },
  { key: 'lastName', label: 'Nom' },
  { key: 'phone', label: 'Téléphone' },
  { key: 'address', label: 'Adresse' },
  { key: 'postalCode', label: 'Code postal' },
  { key: 'city', label: 'Ville' },
  { key: 'country', label: 'Pays' },
  { key: 'birthDate', label: 'Date de naissance' },
  { key: 'age', label: 'Âge' },
  { key: 'company', label: 'Entreprise' },
  { key: 'profession', label: 'Profession' },
  { key: 'status', label: 'Client / Prospect' },
  { key: 'insuranceInterests', label: 'Type d’assurance' },
  { key: 'currentInsurer', label: 'Assureur actuel' },
  { key: 'renewalDate', label: 'Date d’échéance' },
  { key: 'requestedCoverage', label: 'Garanties demandées' },
  { key: 'source', label: 'Source' },
  { key: 'consentDate', label: 'Date de consentement' },
  { key: 'consentEmail', label: 'Consentement email' },
  { key: 'consentPhone', label: 'Consentement téléphone' },
  { key: 'tags', label: 'Tags' },
  { key: 'notes', label: 'Notes' },
];

export type ContactFieldKey =
  | 'email' | 'firstName' | 'lastName' | 'phone' | 'address' | 'postalCode' | 'city'
  | 'country' | 'birthDate' | 'age' | 'company' | 'profession' | 'status'
  | 'insuranceInterests' | 'currentInsurer' | 'renewalDate' | 'requestedCoverage'
  | 'source' | 'consentDate' | 'consentEmail' | 'consentPhone' | 'tags' | 'notes';

export type PreviewIssue = {
  invalidEmails: number;
  missingEmails: number;
  duplicatesInFile: number;
  existingContacts: number;
  suppressedHits: number;
  duplicatePhones: number;
};

export type ImportPreview = {
  uploadId: string;
  filename: string;
  headers: string[];
  sampleRows: Record<string, string>[];
  totalRows: number;
  mapping: Record<string, ContactFieldKey | ''>;
  issues: PreviewIssue;
};
