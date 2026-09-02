/** CORS headers for the public capture endpoints, scoped to one origin. */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-assurlead-key, authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}
