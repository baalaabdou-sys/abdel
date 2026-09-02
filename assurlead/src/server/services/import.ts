import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { InsuranceType, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { normalizeEmail, normalizePhone, isSyntacticallyValidEmail, ageFromBirthDate } from '@/lib/utils';
import { INSURANCE_TYPES } from '@/lib/domain';

/**
 * CSV / XLSX contact import.
 *
 * Files are staged on disk and processed in chunks, so a 100k-row file never
 * lands in browser memory and never arrives as one giant JSON payload.
 */

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), '.uploads');

export const CONTACT_FIELDS = [
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
] as const;

export type ContactFieldKey = (typeof CONTACT_FIELDS)[number]['key'];

/** Header aliases used by the automatic column matcher. */
const ALIASES: Record<ContactFieldKey, string[]> = {
  email: ['email', 'e-mail', 'mail', 'courriel', 'adresse email', 'adresse e-mail', 'email address'],
  firstName: ['prenom', 'prénom', 'first name', 'firstname', 'first_name', 'given name'],
  lastName: ['nom', 'last name', 'lastname', 'last_name', 'surname', 'nom de famille', 'family name'],
  phone: ['telephone', 'téléphone', 'tel', 'tél', 'phone', 'mobile', 'portable', 'gsm', 'numero', 'numéro'],
  address: ['adresse', 'address', 'rue', 'street'],
  postalCode: ['code postal', 'code_postal', 'cp', 'postal code', 'zip', 'zipcode'],
  city: ['ville', 'city', 'commune', 'localite', 'localité'],
  country: ['pays', 'country'],
  birthDate: ['date de naissance', 'date_naissance', 'naissance', 'birth date', 'birthdate', 'dob', 'ddn'],
  age: ['age', 'âge'],
  company: ['entreprise', 'societe', 'société', 'company', 'raison sociale'],
  profession: ['profession', 'metier', 'métier', 'job', 'occupation', 'csp'],
  status: ['statut', 'status', 'type client', 'client', 'prospect'],
  insuranceInterests: ['type assurance', "type d'assurance", 'type_assurance', 'produit', 'assurance', 'insurance type', 'branche'],
  currentInsurer: ['assureur actuel', 'assureur', 'compagnie', 'current insurer', 'assureur_actuel'],
  renewalDate: ['date echeance', 'date échéance', "date d'echeance", "date d'échéance", 'echeance', 'échéance', 'renewal date', 'renouvellement'],
  requestedCoverage: ['garanties', 'couverture', 'coverage', 'formule'],
  source: ['source', 'origine', 'provenance', 'canal'],
  consentDate: ['date consentement', 'date_consentement', 'consent date', 'date opt-in', 'date optin'],
  consentEmail: ['consentement email', 'consentement_email', 'opt-in email', 'optin', 'consent email', 'consentement'],
  consentPhone: ['consentement telephone', 'consentement téléphone', 'opt-in tel', 'consent phone'],
  tags: ['tags', 'etiquettes', 'étiquettes', 'labels'],
  notes: ['notes', 'note', 'commentaire', 'commentaires', 'remarques'],
};

function normalizeHeader(h: string): string {
  return h
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Suggests a column → field mapping from the file's headers. */
export function suggestMapping(headers: string[]): Record<string, ContactFieldKey | ''> {
  const mapping: Record<string, ContactFieldKey | ''> = {};
  const used = new Set<ContactFieldKey>();

  for (const header of headers) {
    const norm = normalizeHeader(header);
    let match: ContactFieldKey | '' = '';
    for (const [field, aliases] of Object.entries(ALIASES) as [ContactFieldKey, string[]][]) {
      if (used.has(field)) continue;
      if (aliases.some((a) => normalizeHeader(a) === norm)) { match = field; break; }
    }
    if (!match) {
      for (const [field, aliases] of Object.entries(ALIASES) as [ContactFieldKey, string[]][]) {
        if (used.has(field)) continue;
        if (aliases.some((a) => norm.includes(normalizeHeader(a)) || normalizeHeader(a).includes(norm))) { match = field; break; }
      }
    }
    if (match) used.add(match);
    mapping[header] = match;
  }
  return mapping;
}

export type ParsedFile = { headers: string[]; rows: Record<string, string>[]; totalRows: number };

export async function parseFile(filePath: string, limit?: number): Promise<ParsedFile> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.csv' || ext === '.txt') {
    const content = await fs.readFile(filePath, 'utf8');
    const result = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: 'greedy',
      delimiter: '',
      transformHeader: (h) => h.trim(),
    });
    const rows = (result.data ?? []).filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''));
    return {
      headers: result.meta.fields ?? Object.keys(rows[0] ?? {}),
      rows: limit ? rows.slice(0, limit) : rows,
      totalRows: rows.length,
    };
  }

  const buffer = await fs.readFile(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  const normalized = rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.trim(), String(v ?? '')])));
  return {
    headers: Object.keys(normalized[0] ?? {}),
    rows: limit ? normalized.slice(0, limit) : normalized,
    totalRows: normalized.length,
  };
}

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

export async function buildPreview(workspaceId: string, uploadId: string, filename: string): Promise<ImportPreview> {
  const filePath = path.join(UPLOAD_DIR, uploadId);
  const parsed = await parseFile(filePath);
  const mapping = suggestMapping(parsed.headers);

  const emailColumn = Object.entries(mapping).find(([, f]) => f === 'email')?.[0];
  const phoneColumn = Object.entries(mapping).find(([, f]) => f === 'phone')?.[0];

  const issues: PreviewIssue = {
    invalidEmails: 0, missingEmails: 0, duplicatesInFile: 0,
    existingContacts: 0, suppressedHits: 0, duplicatePhones: 0,
  };

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const candidateEmails: string[] = [];

  for (const row of parsed.rows) {
    const rawEmail = emailColumn ? String(row[emailColumn] ?? '').trim() : '';
    if (!rawEmail) { issues.missingEmails += 1; continue; }
    if (!isSyntacticallyValidEmail(rawEmail)) { issues.invalidEmails += 1; continue; }
    const email = normalizeEmail(rawEmail);
    if (seenEmails.has(email)) issues.duplicatesInFile += 1;
    else { seenEmails.add(email); candidateEmails.push(email); }

    if (phoneColumn) {
      const phone = normalizePhone(String(row[phoneColumn] ?? ''));
      if (phone) {
        if (seenPhones.has(phone)) issues.duplicatePhones += 1;
        else seenPhones.add(phone);
      }
    }
  }

  // Existing / suppressed lookups in bounded chunks.
  for (let i = 0; i < candidateEmails.length; i += 2000) {
    const slice = candidateEmails.slice(i, i + 2000);
    const [existing, suppressed] = await Promise.all([
      prisma.contact.count({ where: { workspaceId, emailNormalized: { in: slice } } }),
      prisma.suppressionEntry.count({ where: { workspaceId, emailNormalized: { in: slice } } }),
    ]);
    issues.existingContacts += existing;
    issues.suppressedHits += suppressed;
  }

  return {
    uploadId,
    filename,
    headers: parsed.headers,
    sampleRows: parsed.rows.slice(0, 20),
    totalRows: parsed.totalRows,
    mapping,
    issues,
  };
}

export type ImportDefaults = {
  source: string;
  sourceDetail?: string;
  consentEmail: 'UNKNOWN' | 'GRANTED' | 'DENIED';
  consentPhone: 'UNKNOWN' | 'GRANTED' | 'DENIED';
  consentSource?: string;
  legalBasisNote?: string;
  emailMarketingAllowed: boolean;
  phoneContactAllowed: boolean;
  insuranceType?: InsuranceType | '';
  tags: string[];
  verifyAfterImport: boolean;
};

export type ImportStrategy = 'SKIP' | 'UPDATE' | 'MERGE' | 'NEW_ONLY';

const TRUTHY = new Set(['1', 'true', 'vrai', 'oui', 'yes', 'y', 'o', 'accepte', 'accepté', 'granted', 'optin', 'opt-in']);
const FALSY = new Set(['0', 'false', 'faux', 'non', 'no', 'n', 'refuse', 'refusé', 'denied']);

function parseConsent(value: string, fallback: 'UNKNOWN' | 'GRANTED' | 'DENIED'): 'UNKNOWN' | 'GRANTED' | 'DENIED' {
  const v = value.trim().toLowerCase();
  if (!v) return fallback;
  if (TRUTHY.has(v)) return 'GRANTED';
  if (FALSY.has(v)) return 'DENIED';
  if (['granted', 'unknown', 'denied'].includes(v)) return v.toUpperCase() as 'GRANTED';
  return fallback;
}

function parseDate(value: string): Date | null {
  const v = value.trim();
  if (!v) return null;
  // dd/mm/yyyy is the common French format and is not parsed correctly by Date().
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(v);
  if (fr) {
    const year = Number(fr[3].length === 2 ? `20${fr[3]}` : fr[3]);
    const d = new Date(year, Number(fr[2]) - 1, Number(fr[1]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseInsurance(value: string): InsuranceType[] {
  if (!value.trim()) return [];
  const parts = value.split(/[,;|/]+/).map((p) => normalizeHeader(p));
  const found: InsuranceType[] = [];
  const map: [RegExp, InsuranceType][] = [
    [/auto|voiture|vehicule/, 'AUTO'],
    [/moto|scooter|deux roues/, 'MOTO'],
    [/habitation|mrh|maison|logement/, 'HABITATION'],
    [/sante|mutuelle/, 'SANTE'],
    [/prevoyance/, 'PREVOYANCE'],
    [/emprunteur|pret|credit/, 'EMPRUNTEUR'],
    [/decennale/, 'DECENNALE'],
    [/rc pro|responsabilite/, 'RC_PRO'],
    [/pro|entreprise|professionnelle/, 'PROFESSIONNELLE'],
  ];
  for (const part of parts) {
    const direct = INSURANCE_TYPES.find((t) => normalizeHeader(t) === part);
    if (direct) { found.push(direct); continue; }
    const m = map.find(([re]) => re.test(part));
    if (m) found.push(m[1]);
  }
  return Array.from(new Set(found));
}

export type ImportOutcome = {
  imported: number; updated: number; skipped: number;
  invalid: number; duplicates: number; suppressedHits: number;
  errors: { row: number; reason: string }[];
};

/**
 * Runs an import batch. Existing contacts are never silently overwritten:
 * - SKIP      → leave the existing record untouched
 * - UPDATE    → overwrite mapped fields with the file's values
 * - MERGE     → only fill fields that are currently empty
 * - NEW_ONLY  → import new contacts and count the rest as skipped
 */
export async function runImport(batchId: string): Promise<ImportOutcome> {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new Error('Import introuvable');

  const mapping = batch.mapping as Record<string, ContactFieldKey | ''>;
  const defaults = batch.defaults as unknown as ImportDefaults;
  const strategy = batch.strategy as ImportStrategy;
  const workspaceId = batch.workspaceId;

  await prisma.importBatch.update({ where: { id: batchId }, data: { status: 'PROCESSING' } });

  const filePath = path.join(UPLOAD_DIR, batch.id.startsWith('upload_') ? batch.id : String((batch.defaults as Record<string, unknown>).uploadId ?? ''));
  const parsed = await parseFile(filePath);

  const outcome: ImportOutcome = {
    imported: 0, updated: 0, skipped: 0, invalid: 0,
    duplicates: 0, suppressedHits: 0, errors: [],
  };

  const columnFor = (field: ContactFieldKey) => Object.entries(mapping).find(([, f]) => f === field)?.[0];
  const emailCol = columnFor('email');
  if (!emailCol) throw new Error('Aucune colonne email n’a été associée');

  const seen = new Set<string>();
  const CHUNK = 500;
  const importedContactIds: string[] = [];

  for (let start = 0; start < parsed.rows.length; start += CHUNK) {
    const chunk = parsed.rows.slice(start, start + CHUNK);

    const emails = chunk
      .map((r) => String(r[emailCol] ?? '').trim())
      .filter((e) => e && isSyntacticallyValidEmail(e))
      .map(normalizeEmail);

    const [existingRows, suppressedRows] = await Promise.all([
      prisma.contact.findMany({ where: { workspaceId, emailNormalized: { in: emails } } }),
      prisma.suppressionEntry.findMany({ where: { workspaceId, emailNormalized: { in: emails } }, select: { emailNormalized: true } }),
    ]);
    const existingByEmail = new Map(existingRows.map((c) => [c.emailNormalized, c]));
    const suppressedSet = new Set(suppressedRows.map((s) => s.emailNormalized));

    for (let i = 0; i < chunk.length; i++) {
      const row = chunk[i];
      const rowNumber = start + i + 2; // +2: 1-based plus header row
      const rawEmail = String(row[emailCol] ?? '').trim();

      if (!rawEmail) { outcome.invalid += 1; outcome.errors.push({ row: rowNumber, reason: 'Email manquant' }); continue; }
      if (!isSyntacticallyValidEmail(rawEmail)) { outcome.invalid += 1; outcome.errors.push({ row: rowNumber, reason: `Email invalide : ${rawEmail}` }); continue; }

      const emailNormalized = normalizeEmail(rawEmail);
      if (seen.has(emailNormalized)) { outcome.duplicates += 1; continue; }
      seen.add(emailNormalized);

      const get = (field: ContactFieldKey): string => {
        const col = columnFor(field);
        return col ? String(row[col] ?? '').trim() : '';
      };

      const birthDate = parseDate(get('birthDate'));
      const renewalDate = parseDate(get('renewalDate'));
      const insuranceFromFile = parseInsurance(get('insuranceInterests'));
      const insuranceInterests = insuranceFromFile.length
        ? insuranceFromFile
        : defaults.insuranceType ? [defaults.insuranceType as InsuranceType] : [];
      const ageValue = Number(get('age'));

      const values = {
        email: rawEmail,
        emailNormalized,
        firstName: get('firstName') || null,
        lastName: get('lastName') || null,
        phone: get('phone') || null,
        phoneNormalized: normalizePhone(get('phone')),
        address: get('address') || null,
        postalCode: get('postalCode') || null,
        city: get('city') || null,
        country: get('country') || 'FR',
        birthDate,
        age: ageFromBirthDate(birthDate) ?? (Number.isFinite(ageValue) && ageValue > 0 ? Math.round(ageValue) : null),
        company: get('company') || null,
        profession: get('profession') || null,
        status: /client/i.test(get('status')) ? ('CUSTOMER' as const) : ('PROSPECT' as const),
        insuranceInterests: insuranceInterests as never,
        currentInsurer: get('currentInsurer') || null,
        renewalDate,
        renewalMonth: renewalDate ? renewalDate.getMonth() + 1 : null,
        requestedCoverage: get('requestedCoverage') || null,
        notes: get('notes') || null,
        tags: [...defaults.tags, ...get('tags').split(/[,;|]+/).map((t) => t.trim()).filter(Boolean)],
        source: get('source') || defaults.source,
        sourceDetail: defaults.sourceDetail || batch.filename,
        consentEmail: parseConsent(get('consentEmail'), defaults.consentEmail),
        consentPhone: parseConsent(get('consentPhone'), defaults.consentPhone),
        consentDate: parseDate(get('consentDate')),
        consentSource: defaults.consentSource || null,
        legalBasisNote: defaults.legalBasisNote || null,
      };

      const consentGranted = values.consentEmail === 'GRANTED';
      const suppressed = suppressedSet.has(emailNormalized);
      if (suppressed) outcome.suppressedHits += 1;

      const existing = existingByEmail.get(emailNormalized);

      try {
        if (existing) {
          if (strategy === 'SKIP' || strategy === 'NEW_ONLY') { outcome.skipped += 1; continue; }

          const data: Prisma.ContactUpdateInput =
            strategy === 'UPDATE'
              ? {
                  ...values,
                  insuranceInterests: Array.from(new Set([...existing.insuranceInterests, ...insuranceInterests])) as never,
                  tags: Array.from(new Set([...existing.tags, ...values.tags])),
                  emailMarketingAllowed: consentGranted ? true : existing.emailMarketingAllowed,
                  suppressed: suppressed || existing.suppressed,
                }
              : {
                  // MERGE: only fill what is empty today.
                  firstName: existing.firstName ?? values.firstName,
                  lastName: existing.lastName ?? values.lastName,
                  phone: existing.phone ?? values.phone,
                  phoneNormalized: existing.phoneNormalized ?? values.phoneNormalized,
                  address: existing.address ?? values.address,
                  postalCode: existing.postalCode ?? values.postalCode,
                  city: existing.city ?? values.city,
                  birthDate: existing.birthDate ?? values.birthDate,
                  age: existing.age ?? values.age,
                  company: existing.company ?? values.company,
                  profession: existing.profession ?? values.profession,
                  currentInsurer: existing.currentInsurer ?? values.currentInsurer,
                  renewalDate: existing.renewalDate ?? values.renewalDate,
                  renewalMonth: existing.renewalMonth ?? values.renewalMonth,
                  notes: existing.notes ?? values.notes,
                  insuranceInterests: Array.from(new Set([...existing.insuranceInterests, ...insuranceInterests])) as never,
                  tags: Array.from(new Set([...existing.tags, ...values.tags])),
                  source: existing.source ?? values.source,
                  suppressed: suppressed || existing.suppressed,
                };

          await prisma.contact.update({ where: { id: existing.id }, data });
          await prisma.contactSource.create({
            data: { contactId: existing.id, source: values.source, detail: batch.filename, importBatchId: batchId },
          });
          outcome.updated += 1;
        } else {
          const contact = await prisma.contact.create({
            data: {
              ...values,
              workspaceId,
              importedAt: new Date(),
              emailMarketingAllowed: consentGranted && defaults.emailMarketingAllowed,
              phoneContactAllowed: values.consentPhone === 'GRANTED' && defaults.phoneContactAllowed,
              suppressed,
            },
          });
          importedContactIds.push(contact.id);
          await prisma.contactSource.create({
            data: { contactId: contact.id, source: values.source, detail: batch.filename, importBatchId: batchId },
          });
          if (values.consentEmail !== 'UNKNOWN') {
            await prisma.consentRecord.create({
              data: {
                contactId: contact.id, channel: 'email', state: values.consentEmail,
                source: values.consentSource, note: values.legalBasisNote, evidence: `Import ${batch.filename} ligne ${rowNumber}`,
              },
            });
          }
          outcome.imported += 1;
        }
      } catch (err) {
        outcome.invalid += 1;
        outcome.errors.push({ row: rowNumber, reason: err instanceof Error ? err.message.slice(0, 160) : 'Erreur inconnue' });
      }
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        imported: outcome.imported, updated: outcome.updated, skipped: outcome.skipped,
        invalid: outcome.invalid, duplicates: outcome.duplicates, suppressedHits: outcome.suppressedHits,
      },
    });
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: 'DONE',
      totalRows: parsed.totalRows,
      imported: outcome.imported, updated: outcome.updated, skipped: outcome.skipped,
      invalid: outcome.invalid, duplicates: outcome.duplicates, suppressedHits: outcome.suppressedHits,
      errorSample: outcome.errors.slice(0, 50) as unknown as Prisma.InputJsonValue,
      finishedAt: new Date(),
    },
  });

  if (defaults.verifyAfterImport && importedContactIds.length) {
    const { enqueue } = await import('./queue');
    for (let i = 0; i < importedContactIds.length; i += 100) {
      await enqueue('contacts.verify_batch',
        { workspaceId, contactIds: importedContactIds.slice(i, i + 100) },
        { workspaceId, dedupeKey: `verify:${batchId}:${i}` });
    }
  }

  return outcome;
}
