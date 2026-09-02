/** Absolute base URL used for tracking links, landing pages and webhooks. */
export function appUrl(): string {
  const raw =
    process.env.APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000';
  return raw.replace(/\/+$/, '');
}

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
