/** Petits outils d'affichage pour les pages connectées (sans framework). */

type Enfant = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | null | undefined | ((e: Event) => void)>;

/** Crée un élément. Le texte est toujours inséré comme texte (jamais comme HTML). */
export function h(tag: string, attrs: Attrs = {}, ...enfants: (Enfant | Enfant[])[]): HTMLElement {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v as EventListener);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  for (const c of enfants.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function vider(el: Element, ...enfants: (Enfant | Enfant[])[]) {
  el.replaceChildren();
  for (const c of enfants.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
}

/** Message bref en bas de l'écran, lu par les lecteurs d'écran. */
export function toast(texte: string, type: 'ok' | 'erreur' = 'ok') {
  let zone = document.getElementById('toasts');
  if (!zone) {
    zone = h('div', { id: 'toasts', class: 'toasts', 'aria-live': 'polite', role: 'status' });
    document.body.append(zone);
  }
  const t = h('div', { class: `toast ${type}` }, texte);
  zone.append(t);
  setTimeout(() => t.classList.add('sortie'), 3800);
  setTimeout(() => t.remove(), 4300);
}

const jj = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const court = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** « mercredi 12 novembre 2026 » à partir de « 2026-11-12 ». */
export const dateLongue = (d: string) => jj.format(new Date(`${d}T12:00:00Z`));
export const dateCourte = (d: string) => court.format(new Date(`${d}T12:00:00Z`));
/** « 9h00 » à partir de « 09:00:00 ». */
export const heure = (t: string | null) => (t ? `${Number(t.slice(0, 2))}h${t.slice(3, 5)}` : '');
export const horaire = (debut: string | null, fin: string | null) =>
  debut ? (fin ? `${heure(debut)} – ${heure(fin)}` : `à partir de ${heure(debut)}`) : '';

/** Date du jour à Casablanca, au format AAAA-MM-JJ. */
export const aujourdhui = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date());

export const nomComplet = (p: { prenom: string; nom: string }) => `${p.prenom} ${p.nom}`.trim() || '(sans nom)';

export function taille(octets: number | null) {
  if (!octets) return '';
  return octets > 1e6 ? `${(octets / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(octets / 1e3))} Ko`;
}

/** Désactive un bouton pendant une action et affiche un texte d'attente. */
export async function pendant<T>(btn: HTMLButtonElement | null, texte: string, action: () => Promise<T>): Promise<T> {
  const avant = btn?.textContent ?? '';
  if (btn) { btn.disabled = true; btn.textContent = texte; }
  try { return await action(); } finally { if (btn) { btn.disabled = false; btn.textContent = avant; } }
}
