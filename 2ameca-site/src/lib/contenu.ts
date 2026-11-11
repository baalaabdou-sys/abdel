/**
 * Contenus modifiables depuis le tableau de bord (textes du club, contact, FAQ, bureau).
 * Les pages affichent d'abord les textes par défaut (src/data/contenus.ts),
 * puis les remplacent par la version enregistrée dans la base, s'il y en a une.
 */
import { sb } from './supabase';
import { h } from './dom';
import type { Club, Contact, QuestionFaq } from '../data/contenus';

export interface MembreBureau { id: string; nom: string; role: string; photo: string | null; ordre: number }
export interface Contenus { club?: Club; contact?: Contact; faq?: QuestionFaq[] }

const CLE_CACHE = '2ameca-contenus';
let enCours: Promise<Contenus> | null = null;

/** Lit les contenus (une fois par page ; mémorisés 2 minutes dans l'onglet). */
export function chargerContenus(): Promise<Contenus> {
  if (enCours) return enCours;
  enCours = (async () => {
    try {
      const c = JSON.parse(sessionStorage.getItem(CLE_CACHE) ?? 'null');
      if (c && Date.now() - c.t < 120_000) return c.v as Contenus;
    } catch { /* stockage indisponible */ }
    const { data } = await sb.from('parametres').select('cle, valeur');
    const v = Object.fromEntries((data ?? []).map((r) => [r.cle, r.valeur])) as Contenus;
    try { sessionStorage.setItem(CLE_CACHE, JSON.stringify({ t: Date.now(), v })); } catch { /* ignore */ }
    return v;
  })();
  return enCours;
}

export function oublierCache() { try { sessionStorage.removeItem(CLE_CACHE); } catch { /* ignore */ } }

export async function chargerBureau(): Promise<MembreBureau[]> {
  const { data } = await sb.from('bureau_membres').select('*').order('ordre').order('created_at');
  return (data ?? []) as MembreBureau[];
}

/** Texte simple ; un texte entre crochets s'affiche comme « à compléter ». */
export const texte = (t: string) => (/^\s*\[.*\]\s*$/s.test(t) ? h('span', { class: 'a-fournir' }, t.trim()) : document.createTextNode(t));

/** Découpe un texte en paragraphes (ligne vide entre deux paragraphes). */
export const paragraphes = (t: string, classe?: string) =>
  t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => h('p', classe ? { class: classe } : {}, texte(p)));

/**
 * Les styles d'une page Astro sont « limités » à ses propres éléments.
 * Pour que les éléments créés ici reçoivent ces styles, on recopie l'attribut
 * de portée de leur conteneur sur chacun d'eux.
 */
export function remplir(conteneur: Element, enfants: Node[]) {
  const attrs = [...conteneur.attributes].filter((a) => a.name.startsWith('data-astro-cid')).map((a) => a.name);
  const marquer = (n: Node) => {
    if (n instanceof Element) {
      attrs.forEach((a) => n.setAttribute(a, ''));
      [...n.children].forEach(marquer);
    }
  };
  enfants.forEach(marquer);
  conteneur.replaceChildren(...enfants);
}
