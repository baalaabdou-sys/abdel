/** Préfixe un chemin interne avec la base du site (utile pour GitHub Pages). */
export function u(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (/^(https?:|mailto:|tel:|#)/.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}` || '/';
}

/** Compare le chemin courant à un lien de menu. */
export function estActif(current: string, href: string): boolean {
  const clean = (p: string) => p.replace(/\/+$/, '') || '/';
  const c = clean(current);
  const h = clean(u(href));
  return h === clean(u('/')) ? c === h : c === h || c.startsWith(`${h}/`);
}
