import crypto from 'crypto';

const ALGO = 'aes-256-gcm';

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  return crypto.createHash('sha256').update(raw).digest();
}

/** Encrypts a JSON-serialisable value for at-rest storage of provider credentials. */
export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${data.toString('base64url')}`;
}

export function decryptJson<T = Record<string, unknown>>(payload: string): T {
  const [version, ivB64, tagB64, dataB64] = payload.split('.');
  if (version !== 'v1') throw new Error('Unsupported ciphertext version');
  const decipher = crypto.createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  const out = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]);
  return JSON.parse(out.toString('utf8')) as T;
}

/** Stores secrets encrypted, keeps non-secret keys readable for the UI. */
const SECRET_KEYS = /(key|secret|token|password|pass|credential|apikey)/i;

export function encryptConfig(config: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config)) {
    if (SECRET_KEYS.test(k) && typeof v === 'string' && v.length > 0) {
      out[k] = { __enc: encryptJson(v) };
    } else {
      out[k] = v;
    }
  }
  return out;
}

export function decryptConfig(config: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config ?? {})) {
    if (v && typeof v === 'object' && '__enc' in (v as object)) {
      try {
        out[k] = decryptJson<string>((v as { __enc: string }).__enc);
      } catch {
        out[k] = '';
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Redacts secrets so config can be sent to the browser. */
export function redactConfig(config: Record<string, unknown> | null | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(config ?? {})) {
    if (v && typeof v === 'object' && '__enc' in (v as object)) out[k] = '••••••••';
    else if (SECRET_KEYS.test(k) && typeof v === 'string' && v) out[k] = '••••••••';
    else out[k] = v;
  }
  return out;
}

export function randomToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

/** Hashes an IP for funnel analytics without storing the raw address. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return sha256(`${process.env.AUTH_SECRET ?? 'salt'}:${ip}`).slice(0, 32);
}
