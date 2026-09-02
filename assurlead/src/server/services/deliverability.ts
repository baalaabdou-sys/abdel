import 'server-only';
import dns from 'dns/promises';
import type { DnsCheckStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

/**
 * Domain authentication checks (SPF, DKIM, DMARC, tracking CNAME).
 *
 * These improve the odds that a legitimate message is accepted. They cannot
 * guarantee inbox placement — no product can — and the UI states this plainly.
 */

export type DomainCheck = {
  spf: DnsCheckStatus;
  dkim: DnsCheckStatus;
  dmarc: DnsCheckStatus;
  trackingCname: DnsCheckStatus;
  spfRecord: string | null;
  dmarcRecord: string | null;
  dkimRecord: string | null;
  notes: string[];
};

async function txt(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((chunks) => chunks.join(''));
  } catch {
    return [];
  }
}

export async function inspectDomain(domain: string, dkimSelector = 'assurlead', trackingHost?: string): Promise<DomainCheck> {
  const notes: string[] = [];

  const rootTxt = await txt(domain);
  const spfRecord = rootTxt.find((r) => r.toLowerCase().startsWith('v=spf1')) ?? null;
  let spf: DnsCheckStatus = 'MISSING';
  if (spfRecord) {
    spf = 'CONFIGURED';
    if (rootTxt.filter((r) => r.toLowerCase().startsWith('v=spf1')).length > 1) {
      spf = 'INVALID';
      notes.push('Plusieurs enregistrements SPF détectés — un seul est autorisé.');
    } else if (/\+all/.test(spfRecord)) {
      spf = 'NEEDS_ATTENTION';
      notes.push('Le mécanisme "+all" rend le SPF permissif : préférez "-all" ou "~all".');
    }
  } else {
    notes.push(`Aucun enregistrement SPF trouvé sur ${domain}.`);
  }

  const dmarcTxt = await txt(`_dmarc.${domain}`);
  const dmarcRecord = dmarcTxt.find((r) => r.toLowerCase().startsWith('v=dmarc1')) ?? null;
  let dmarc: DnsCheckStatus = dmarcRecord ? 'CONFIGURED' : 'MISSING';
  if (dmarcRecord && /p=none/i.test(dmarcRecord)) {
    dmarc = 'NEEDS_ATTENTION';
    notes.push('La politique DMARC est "p=none" : utile en observation, à renforcer ensuite.');
  }
  if (!dmarcRecord) notes.push(`Aucun enregistrement DMARC sur _dmarc.${domain}.`);

  const dkimTxt = await txt(`${dkimSelector}._domainkey.${domain}`);
  const dkimRecord = dkimTxt.find((r) => r.toLowerCase().includes('v=dkim1') || r.includes('p=')) ?? null;
  const dkim: DnsCheckStatus = dkimRecord ? 'CONFIGURED' : 'MISSING';
  if (!dkimRecord) notes.push(`Aucune clé DKIM trouvée pour le sélecteur "${dkimSelector}".`);

  let trackingCname: DnsCheckStatus = 'UNKNOWN';
  if (trackingHost) {
    try {
      const cname = await dns.resolveCname(trackingHost);
      trackingCname = cname.length > 0 ? 'CONFIGURED' : 'MISSING';
    } catch {
      trackingCname = 'MISSING';
      notes.push(`Le domaine de tracking ${trackingHost} ne résout pas.`);
    }
  }

  return { spf, dkim, dmarc, trackingCname, spfRecord, dmarcRecord, dkimRecord, notes };
}

export async function checkDomainAuthentication(domainId: string) {
  const domain = await prisma.sendingDomain.findUnique({ where: { id: domainId } });
  if (!domain) return null;
  const result = await inspectDomain(domain.domain);
  return prisma.sendingDomain.update({
    where: { id: domainId },
    data: {
      spf: result.spf,
      dkim: result.dkim,
      dmarc: result.dmarc,
      trackingCname: result.trackingCname,
      spfRecord: result.spfRecord,
      dmarcRecord: result.dmarcRecord,
      dkimRecord: result.dkimRecord,
      lastCheckedAt: new Date(),
      notes: result.notes.join('\n'),
    },
  });
}

/** Recommended DNS records shown to the operator when a check fails. */
export function dnsInstructions(domain: string) {
  return [
    {
      type: 'TXT',
      host: domain,
      value: 'v=spf1 include:<votre-fournisseur> -all',
      title: 'SPF',
      help: "Autorise votre fournisseur d'envoi à émettre pour ce domaine. Remplacez <votre-fournisseur> par la valeur fournie (ex. include:spf.brevo.com).",
    },
    {
      type: 'TXT',
      host: `assurlead._domainkey.${domain}`,
      value: 'v=DKIM1; k=rsa; p=<clé publique fournie par votre fournisseur>',
      title: 'DKIM',
      help: 'Signe cryptographiquement vos messages. La clé publique est générée par votre fournisseur d’envoi.',
    },
    {
      type: 'TXT',
      host: `_dmarc.${domain}`,
      value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
      title: 'DMARC',
      help: 'Commencez en observation (p=none), analysez les rapports, puis passez à quarantine ou reject.',
    },
    {
      type: 'CNAME',
      host: `liens.${domain}`,
      value: '<domaine de tracking fourni par votre fournisseur>',
      title: 'Domaine de tracking (optionnel)',
      help: 'Permet aux liens de vos emails de porter votre propre domaine.',
    },
  ];
}
