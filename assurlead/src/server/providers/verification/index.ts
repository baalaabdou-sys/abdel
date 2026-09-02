import 'server-only';
import dns from 'dns/promises';
import type { VerificationStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { decryptConfig } from '@/lib/crypto';
import { isSyntacticallyValidEmail, normalizeEmail } from '@/lib/utils';

export type VerificationOutcome = {
  status: VerificationStatus;
  confidence: number | null;
  provider: string;
  simulated: boolean;
  raw: Record<string, unknown>;
};

export interface EmailVerificationProvider {
  readonly name: string;
  readonly simulated: boolean;
  verify(email: string): Promise<VerificationOutcome>;
}

const DISPOSABLE = new Set([
  'yopmail.com', 'mailinator.com', 'guerrillamail.com', 'tempmail.com',
  '10minutemail.com', 'trashmail.com', 'jetable.org', 'sharklasers.com',
]);

const ROLE_LOCAL = new Set([
  'contact', 'info', 'admin', 'support', 'sales', 'no-reply', 'noreply',
  'postmaster', 'webmaster', 'abuse', 'accueil', 'service',
]);

const FREE_CATCH_ALL_HINTS = new Set(['orange.fr', 'wanadoo.fr', 'free.fr', 'laposte.net', 'sfr.fr']);

/**
 * Local verifier: syntax, disposable/role detection and a real MX lookup.
 * It performs no SMTP mailbox probing, so it can never assert a mailbox exists —
 * results top out at LIKELY_VALID / CATCH_ALL, never a hard VALID from a probe.
 */
export class LocalVerificationProvider implements EmailVerificationProvider {
  readonly name = 'local-mx';
  readonly simulated = false;

  async verify(email: string): Promise<VerificationOutcome> {
    const normalized = normalizeEmail(email);
    const raw: Record<string, unknown> = { checkedAt: new Date().toISOString() };

    if (!isSyntacticallyValidEmail(normalized)) {
      return { status: 'INVALID', confidence: 99, provider: this.name, simulated: false, raw: { ...raw, reason: 'syntax' } };
    }
    const [local, domain] = normalized.split('@');
    raw.domain = domain;

    if (DISPOSABLE.has(domain)) {
      return { status: 'INVALID', confidence: 95, provider: this.name, simulated: false, raw: { ...raw, reason: 'disposable' } };
    }

    let mx: { exchange: string; priority: number }[] = [];
    try {
      mx = await dns.resolveMx(domain);
    } catch {
      mx = [];
    }
    raw.mxCount = mx.length;

    if (mx.length === 0) {
      return { status: 'INVALID', confidence: 90, provider: this.name, simulated: false, raw: { ...raw, reason: 'no_mx' } };
    }
    if (ROLE_LOCAL.has(local)) {
      return { status: 'RISKY', confidence: 60, provider: this.name, simulated: false, raw: { ...raw, reason: 'role_address' } };
    }
    if (FREE_CATCH_ALL_HINTS.has(domain)) {
      return { status: 'LIKELY_VALID', confidence: 75, provider: this.name, simulated: false, raw };
    }
    return { status: 'LIKELY_VALID', confidence: 80, provider: this.name, simulated: false, raw };
  }
}

/**
 * Offline verifier used when no provider is configured and DNS is unavailable.
 * Deterministic and clearly labelled: it never claims a real mailbox check.
 */
export class DemoVerificationProvider implements EmailVerificationProvider {
  readonly name = 'demo';
  readonly simulated = true;

  async verify(email: string): Promise<VerificationOutcome> {
    const normalized = normalizeEmail(email);
    if (!isSyntacticallyValidEmail(normalized)) {
      return { status: 'INVALID', confidence: 99, provider: this.name, simulated: true, raw: { reason: 'syntax' } };
    }
    const domain = normalized.split('@')[1];
    if (DISPOSABLE.has(domain)) {
      return { status: 'INVALID', confidence: 95, provider: this.name, simulated: true, raw: { reason: 'disposable' } };
    }
    if (ROLE_LOCAL.has(normalized.split('@')[0])) {
      return { status: 'RISKY', confidence: 60, provider: this.name, simulated: true, raw: { reason: 'role_address' } };
    }
    // Stable pseudo-distribution derived from the address itself.
    let h = 0;
    for (let i = 0; i < normalized.length; i++) h = (h * 31 + normalized.charCodeAt(i)) % 1000;
    if (h < 780) return { status: 'VALID', confidence: 92, provider: this.name, simulated: true, raw: { bucket: h } };
    if (h < 870) return { status: 'LIKELY_VALID', confidence: 75, provider: this.name, simulated: true, raw: { bucket: h } };
    if (h < 930) return { status: 'CATCH_ALL', confidence: 55, provider: this.name, simulated: true, raw: { bucket: h } };
    if (h < 970) return { status: 'RISKY', confidence: 40, provider: this.name, simulated: true, raw: { bucket: h } };
    return { status: 'INVALID', confidence: 88, provider: this.name, simulated: true, raw: { bucket: h } };
  }
}

const ZB_MAP: Record<string, VerificationStatus> = {
  valid: 'VALID', invalid: 'INVALID', 'catch-all': 'CATCH_ALL',
  unknown: 'UNKNOWN', spamtrap: 'INVALID', abuse: 'RISKY', do_not_mail: 'RISKY',
};

export class ZeroBounceProvider implements EmailVerificationProvider {
  readonly name = 'zerobounce';
  readonly simulated = false;
  constructor(private apiKey: string) {}

  async verify(email: string): Promise<VerificationOutcome> {
    const url = `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(this.apiKey)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`ZeroBounce error ${res.status}`);
    const json = (await res.json()) as Record<string, unknown>;
    const status = ZB_MAP[String(json.status ?? 'unknown')] ?? 'UNKNOWN';
    return { status, confidence: null, provider: this.name, simulated: false, raw: json };
  }
}

const NB_MAP: Record<string, VerificationStatus> = {
  valid: 'VALID', invalid: 'INVALID', catchall: 'CATCH_ALL',
  unknown: 'UNKNOWN', disposable: 'INVALID', 'accept_all': 'CATCH_ALL',
};

export class NeverBounceProvider implements EmailVerificationProvider {
  readonly name = 'neverbounce';
  readonly simulated = false;
  constructor(private apiKey: string) {}

  async verify(email: string): Promise<VerificationOutcome> {
    const url = `https://api.neverbounce.com/v4/single/check?key=${encodeURIComponent(this.apiKey)}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NeverBounce error ${res.status}`);
    const json = (await res.json()) as Record<string, unknown>;
    return {
      status: NB_MAP[String(json.result ?? 'unknown')] ?? 'UNKNOWN',
      confidence: null,
      provider: this.name,
      simulated: false,
      raw: json,
    };
  }
}

export class HunterProvider implements EmailVerificationProvider {
  readonly name = 'hunter';
  readonly simulated = false;
  constructor(private apiKey: string) {}

  async verify(email: string): Promise<VerificationOutcome> {
    const url = `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${encodeURIComponent(this.apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Hunter error ${res.status}`);
    const json = (await res.json()) as { data?: { status?: string; score?: number } };
    const map: Record<string, VerificationStatus> = {
      valid: 'VALID', invalid: 'INVALID', accept_all: 'CATCH_ALL', webmail: 'LIKELY_VALID',
      disposable: 'INVALID', unknown: 'UNKNOWN',
    };
    return {
      status: map[String(json.data?.status ?? 'unknown')] ?? 'UNKNOWN',
      confidence: json.data?.score ?? null,
      provider: this.name,
      simulated: false,
      raw: json as Record<string, unknown>,
    };
  }
}

export async function getVerificationProvider(workspaceId?: string): Promise<EmailVerificationProvider> {
  if (workspaceId) {
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, kind: 'VERIFICATION', status: 'CONNECTED' },
      orderBy: { updatedAt: 'desc' },
    });
    if (integration) {
      const cfg = decryptConfig(integration.config as Record<string, unknown>);
      const apiKey = String(cfg.apiKey ?? '');
      if (apiKey) {
        if (integration.provider === 'zerobounce') return new ZeroBounceProvider(apiKey);
        if (integration.provider === 'neverbounce') return new NeverBounceProvider(apiKey);
        if (integration.provider === 'hunter') return new HunterProvider(apiKey);
      }
    }
  }
  const env = (process.env.VERIFICATION_PROVIDER ?? 'local').toLowerCase();
  if (env === 'zerobounce' && process.env.ZEROBOUNCE_API_KEY) return new ZeroBounceProvider(process.env.ZEROBOUNCE_API_KEY);
  if (env === 'neverbounce' && process.env.NEVERBOUNCE_API_KEY) return new NeverBounceProvider(process.env.NEVERBOUNCE_API_KEY);
  if (env === 'hunter' && process.env.HUNTER_API_KEY) return new HunterProvider(process.env.HUNTER_API_KEY);
  if (env === 'demo') return new DemoVerificationProvider();
  return new LocalVerificationProvider();
}
