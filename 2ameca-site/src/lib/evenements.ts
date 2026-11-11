/**
 * Événements du club, lus dans la base (table « formations »).
 * Le bureau les crée et les modifie depuis le tableau de bord : affiche, programme,
 * description, photos. Les pages « Événements » les affichent sans republier le site.
 */
import { sb, TYPES, type Formation } from './supabase';
import { h } from './dom';
import { urlMedia } from './images';

export interface Evenement extends Formation {
  resume: string;
  programme: string;
  lieu_detail: string;
  date_fin: string | null;
  affiche: string | null;
}

const base = () => import.meta.env.BASE_URL.replace(/\/$/, '');
export const lienEvenement = (id: string) => `${base()}/evenements/voir/?id=${id}`;

/** Date du jour à Casablanca, AAAA-MM-JJ. */
export const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Casablanca' }).format(new Date());

const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const jourCourt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const d = (s: string) => new Date(`${s}T12:00:00Z`);

/** « samedi 14 novembre 2026 » ou « 28 – 30 octobre 2026 ». */
export function plage(e: Pick<Evenement, 'date' | 'date_fin'>) {
  if (!e.date_fin || e.date_fin === e.date) return jourLong.format(d(e.date));
  const a = d(e.date), b = d(e.date_fin);
  const memeMois = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  return memeMois
    ? `${a.getUTCDate()} – ${jourCourt.format(b)} ${b.getUTCFullYear()}`
    : `${jourCourt.format(a)} – ${jourCourt.format(b)} ${b.getUTCFullYear()}`;
}
export const heureFr = (t: string | null) => (t ? `${Number(t.slice(0, 2))}h${t.slice(3, 5)}` : '');
export const termine = (e: Pick<Evenement, 'date' | 'date_fin'>) => (e.date_fin ?? e.date) < aujourdhui();

/** Tous les événements publiés (les annulés passés sont écartés). */
export async function chargerEvenements(): Promise<Evenement[]> {
  const { data, error } = await sb.from('formations').select('*').eq('publiee', true).order('date', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Evenement[]).filter((e) => !(e.annulee && termine(e)));
}

/**
 * Mise en forme simple, sans HTML : paragraphes (ligne vide), titres (« ## »),
 * listes (« - » en début de ligne) et gras (**texte**). Tout le texte est inséré comme texte.
 */
export function miseEnForme(texte: string): Node[] {
  const enLigne = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
    .map((p) => (/^\*\*[^*]+\*\*$/.test(p) ? h('strong', {}, p.slice(2, -2)) : document.createTextNode(p.replace(/\*(?=\S)([^*]+?)\*/g, '$1'))));
  return texte.replace(/\r/g, '').split(/\n\s*\n/).map((bloc) => bloc.trim()).filter(Boolean).map((bloc) => {
    if (/^#{2,3}\s/.test(bloc)) return h('h2', {}, ...enLigne(bloc.replace(/^#{2,3}\s*/, '')));
    const lignes = bloc.split('\n');
    if (lignes.every((l) => /^\s*[-•]\s+/.test(l))) return h('ul', {}, lignes.map((l) => h('li', {}, ...enLigne(l.replace(/^\s*[-•]\s+/, '')))));
    return h('p', {}, ...lignes.flatMap((l, i) => (i ? [h('br'), ...enLigne(l)] : enLigne(l))));
  });
}

/** Carte d'un événement (liste « Événements »). */
export function carte(e: Evenement): HTMLElement {
  const date = d(e.date);
  const mois = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' }).format(date).replace('.', '');
  const resume = e.resume || e.description.replace(/[#*]/g, '').split(/\n\s*\n/)[0]?.slice(0, 220) || '';
  return h('article', { class: `carte-evt${e.annulee ? ' annulee' : ''}` },
    e.affiche ? h('img', { class: 'ce-affiche', src: urlMedia(e.affiche), alt: '', loading: 'lazy' })
      : h('div', { class: 'ce-date', 'aria-hidden': 'true' }, h('span', { class: 'ce-jour' }, String(date.getUTCDate())), h('span', { class: 'ce-mois' }, mois), h('span', { class: 'ce-annee' }, String(date.getUTCFullYear()))),
    h('div', { class: 'ce-corps' },
      h('span', { class: 'ce-type' }, e.annulee ? 'Annulé' : TYPES[e.type]),
      h('h3', { class: 'ce-titre' }, h('a', { href: lienEvenement(e.id) }, e.titre)),
      h('p', { class: 'ce-meta' }, h('span', {}, `${plage(e)}${e.heure_debut ? ` · ${heureFr(e.heure_debut)}` : ''}`), e.lieu ? h('span', {}, e.lieu) : null),
      resume ? h('p', { class: 'ce-resume' }, resume) : null,
      h('span', { class: 'ce-plus', 'aria-hidden': 'true' }, 'Voir le détail →')));
}
