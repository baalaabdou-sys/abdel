/**
 * Minimal `next/headers` stand-in for tests that exercise server modules
 * outside a request scope. `cookies().set` throws, exactly as it does during a
 * Server Component render — which is the behaviour the funnel code must survive.
 */
const store = new Map<string, string>();

export function cookies() {
  return {
    get: (name: string) => (store.has(name) ? { name, value: store.get(name)! } : undefined),
    set: () => {
      throw new Error('Cookies can only be modified in a Server Action or Route Handler');
    },
    delete: () => undefined,
  };
}

export function headers() {
  return new Headers({ 'user-agent': 'vitest', 'x-forwarded-for': '127.0.0.1' });
}
