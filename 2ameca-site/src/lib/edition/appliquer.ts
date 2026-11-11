import { urlMedia } from '../images';
import { construire, estGabarit } from './gabarits';

/**
 * Mode édition — partie « visiteurs » (légère).
 *
 * Le site reste celui du code source : ses textes, images et boutons sont les valeurs par défaut.
 * Chaque élément modifiable reçoit une clé stable (section + type + rang), puis la version publiée
 * par un administrateur (table « site_publie ») remplace seulement ce qui a été changé.
 * Aucune modification du code source ni nouveau déploiement n'est nécessaire.
 */

export interface Doc {
  t?: Record<string, string>;                                              // textes (HTML limité)
  l?: Record<string, { texte?: string; href?: string; cache?: boolean }>;  // liens et boutons
  i?: Record<string, { src?: string; echelle?: number; cache?: boolean }>; // images et logos
  s?: DocBlocs;                                                             // sections de la page
  li?: Record<string, DocListe>;                                            // listes écrites dans la page
  bd?: Partial<Record<ListeBd, string[]>>;                                  // ordre des listes de la base (enregistré à la publication)
}
/** Une liste (ul/ol) de la page : ordre de ses éléments, copies, éléments masqués. */
export interface DocListe { ordre?: string[]; copies?: { id: string; de: string }[]; cache?: string[] }
export type ListeBd = 'equipe' | 'partenaires';
/** Sections (blocs directs de <main>) : ordre, copies, masquées, supprimées, fond, espacement, alignement. */
export interface DocBlocs {
  ordre?: string[];
  copies?: { id: string; de: string }[];
  cache?: string[];
  suppr?: string[];
  fond?: Record<string, Fond>;
  espace?: Record<string, 'normal' | 'serree'>;
  align?: Record<string, 'gauche' | 'centre'>;
}
export type Fond = 'blanc' | 'teinte' | 'sombre' | 'tres-sombre';
export const FONDS: Fond[] = ['blanc', 'teinte', 'sombre', 'tres-sombre'];
export type Portee = 'page' | 'global';
export interface Cible { el: HTMLElement; cle: string; type: 't' | 'l' | 'i'; portee: Portee }

const SEL_TEXTE = 'h1,h2,h3,h4,p,li,figcaption,blockquote,dt,dd,address,summary > span:first-child,.surtitre,.script,span.label,.chapo';
const SEL_LIEN = 'a.btn,a.lien-fleche,a.valeur,.liens a,.colonne a';
const EXCLURE = '[data-e-ignore],[aria-hidden="true"],[data-c],form,svg,button,dialog,[hidden],.zone-modifier,.cloche-zone,#edition-ui';

/** Page courante (« / », « /le-club/ ») : la clé du document de la page. */
export const pageCourante = () => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const p = location.pathname.slice(base.length) || '/';
  return p.endsWith('/') ? p : `${p}/`;
};

const portee = (el: Element): Portee =>
  el.closest('header.entete, footer.pied, [data-section="bandeau-rejoindre"]') ? 'global' : 'page';
const zone = (el: Element): string => {
  const copie = el.closest<HTMLElement>('[data-e-item-copie]');   // élément de liste ajouté : sa propre zone
  if (copie) return `${zone(copie.parentElement!)}~${copie.dataset.eItem}`;
  const s = el.closest<HTMLElement>('[data-section]');
  if (s) return s.dataset.section!;
  if (el.closest('header.entete')) return 'entete';
  if (el.closest('footer.pied')) return 'pied';
  const b = el.closest<HTMLElement>('[data-bloc]');
  if (b) return b.dataset.bloc!;
  const sec = el.closest('main > *');
  return sec ? `bloc${[...sec.parentElement!.children].indexOf(sec)}` : 'page';
};

// ── Sections (blocs)
const IGNORER_BLOC = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'NOSCRIPT']);
const modeles = new Map<string, HTMLElement>();   // copie intacte de chaque section d'origine
let ordreOrigine: string[] = [];
let instantanePris = false;
const blocsTouches = new Set<string>();
const fondOrigine = new Map<string, { fond: Fond; serree: boolean }>();

/** Donne un identifiant stable à chaque section de <main> et garde une copie intacte (pour dupliquer). */
function instantane() {
  if (instantanePris) return;
  instantanePris = true;
  const main = document.querySelector('main');
  if (!main) return;
  [...main.children].forEach((el, i) => {
    if (!(el instanceof HTMLElement) || IGNORER_BLOC.has(el.tagName)) return;
    const id = el.dataset.section ?? `bloc${i}`;
    el.dataset.bloc = id;
    modeles.set(id, el.cloneNode(true) as HTMLElement);
    ordreOrigine.push(id);
  });
}
export const blocs = () => [...document.querySelectorAll<HTMLElement>('main > [data-bloc]')];
export const blocParId = (id: string) => document.querySelector<HTMLElement>(`main > [data-bloc="${CSS.escape(id)}"]`);
/** Une section affiche-t-elle des données automatiques ou des éléments interactifs (non duplicable) ? */
export const duplicable = (id: string) => !modeles.get(id.split('~')[0])?.querySelector('[data-e-ignore], form, dialog, video, canvas, iframe, button');
const fondDe = (el: HTMLElement): Fond => (el.classList.contains('tres-sombre') ? 'tres-sombre' : el.classList.contains('sombre') ? 'sombre' : el.classList.contains('teinte') ? 'teinte' : 'blanc');

function creerCopie(id: string, de: string): HTMLElement | null {
  const modele = estGabarit(de) ? construire(de) : modeles.get(de);
  if (!modele) return null;
  const c = modele.cloneNode(true) as HTMLElement;
  // Textes gérés par « Textes du club » : la copie prend le texte affiché, puis devient librement modifiable.
  const source = blocParId(de);
  c.querySelectorAll<HTMLElement>('[data-c]').forEach((x) => {
    const vivant = source?.querySelector(`[data-c="${CSS.escape(x.dataset.c!)}"]`);
    if (vivant) x.innerHTML = vivant.innerHTML;
    x.removeAttribute('data-c'); x.setAttribute('data-e-ex-c', '');
  });
  const suffixe = id.slice(id.indexOf('~'));
  c.dataset.bloc = id; c.dataset.blocCopie = de; c.dataset.section = id;
  c.querySelectorAll<HTMLElement>('[data-section]').forEach((x) => (x.dataset.section = `${x.dataset.section}${suffixe}`));
  // identifiants uniques (et les liens internes qui les citent)
  const ids = new Map<string, string>();
  c.querySelectorAll<HTMLElement>('[id]').forEach((x) => { const n = `${x.id}${suffixe.replace('~', '-')}`; ids.set(x.id, n); x.id = n; });
  if (c.id) { const n = `${c.id}${suffixe.replace('~', '-')}`; ids.set(c.id, n); c.id = n; }
  for (const attr of ['aria-labelledby', 'aria-describedby', 'for', 'aria-controls']) {
    [c, ...c.querySelectorAll<HTMLElement>(`[${attr}]`)].forEach((x) => {
      const v = x.getAttribute(attr); if (v) x.setAttribute(attr, v.split(' ').map((t) => ids.get(t) ?? t).join(' '));
    });
  }
  [c, ...c.querySelectorAll('.reveal')].forEach((x) => x.classList.contains('reveal') && x.classList.add('visible'));
  return c;
}

/** Applique l'organisation des sections ; renvoie vrai si des copies ont été ajoutées ou retirées. */
function appliquerBlocs(s: DocBlocs | undefined) {
  const main = document.querySelector('main');
  if (!main) return false;
  let structure = false;
  // Copies
  const voulues = new Map((s?.copies ?? []).map((c) => [c.id, c.de]));
  for (const el of [...main.querySelectorAll<HTMLElement>(':scope > [data-bloc-copie]')]) {
    if (voulues.get(el.dataset.bloc!) !== el.dataset.blocCopie) { el.remove(); structure = true; }
  }
  for (const [id, de] of voulues) {
    if (blocParId(id)) continue;
    const source = estGabarit(de) ? null : blocParId(de), c = creerCopie(id, de);
    if (!c || (!source && !estGabarit(de))) continue;
    if (source) source.after(c);
    else { const dernier = blocs().at(-1); if (dernier) dernier.after(c); else main.append(c); }   // l'ordre la place ensuite
    structure = true; blocsTouches.add(id);
  }
  // Ordre
  const presents = blocs().map((b) => b.dataset.bloc!);
  if (s?.ordre?.length || blocsTouches.has('__ordre')) {
    blocsTouches.add('__ordre');
    const voulu = (s?.ordre ?? []).filter((id) => presents.includes(id));
    const base = [...ordreOrigine, ...presents.filter((id) => !ordreOrigine.includes(id))].filter((id) => presents.includes(id));
    for (const [i, id] of base.entries()) {          // une section inconnue de l'ordre garde sa place (après sa voisine d'origine)
      if (voulu.includes(id)) continue;
      const avant = base.slice(0, i).reverse().find((x) => voulu.includes(x));
      voulu.splice(avant ? voulu.indexOf(avant) + 1 : 0, 0, id);
    }
    const premier = blocs()[0];
    if (premier) {
      const repere = document.createComment('sections'); main.insertBefore(repere, premier);
      for (const id of voulu) main.insertBefore(blocParId(id)!, repere);
      repere.remove();
    }
  }
  // Masquées, supprimées, fond, espacement, alignement
  for (const b of blocs()) {
    const id = b.dataset.bloc!;
    const touche = blocsTouches.has(id);
    const cache = !!s?.cache?.includes(id), suppr = !!s?.suppr?.includes(id);
    const fond = s?.fond?.[id], espace = s?.espace?.[id], align = s?.align?.[id];
    if (!touche && !cache && !suppr && !fond && !espace && !align) continue;
    blocsTouches.add(id);
    b.toggleAttribute('data-e-cache', cache);
    b.toggleAttribute('data-e-suppr', suppr);
    if (b.classList.contains('section')) {
      if (!fondOrigine.has(id)) fondOrigine.set(id, { fond: fondDe(b), serree: b.classList.contains('serree') });
      const o = fondOrigine.get(id)!;
      const f = fond ?? o.fond;
      b.classList.remove('teinte', 'sombre', 'tres-sombre');
      if (f !== 'blanc') b.classList.add(f);
      b.classList.toggle('serree', espace ? espace === 'serree' : o.serree);
    }
    if (align) b.dataset.eAlign = align; else delete b.dataset.eAlign;
  }
  return structure;
}

let cibles: Cible[] | null = null;
const defauts = new WeakMap<HTMLElement, { html: string; href?: string | null; src?: string; srcset?: string | null }>();

/** Repère les éléments modifiables, avec une clé stable (calculée une seule fois, avant tout changement). */
// ── Listes écrites dans la page (cartes, points forts…)
const SEL_LISTE = 'main ul, main ol, main [data-e-liste-libre]';
const modelesItems = new Map<string, Map<string, HTMLElement>>();   // liste → élément d'origine intact
const listesVues = new WeakSet<Element>();
const listesTouchees = new Set<string>();
const itemsDe = (l: Element) => [...l.children].filter((x): x is HTMLElement => x instanceof HTMLElement && (l.matches('ul, ol') ? x.tagName === 'LI' : !['SCRIPT', 'TEMPLATE', 'STYLE'].includes(x.tagName)));
/** Repère les listes modifiables (au moins deux éléments, hors données automatiques) et leur donne une clé stable. */
function reperesListes() {
  const compte = new Map<string, number>();
  for (const l of document.querySelectorAll<HTMLElement>(SEL_LISTE)) {
    if (l.closest('[data-e-ignore], [data-c], [aria-hidden="true"], nav, form, #edition-ui, [hidden]') || itemsDe(l).length < 2) continue;
    const z = zone(l);
    const n = compte.get(z) ?? 0; compte.set(z, n + 1);
    if (listesVues.has(l)) continue;
    listesVues.add(l);
    const cle = l.dataset.eListe ?? `${z}/liste${n}`;
    l.dataset.eListe = cle;
    const m = new Map<string, HTMLElement>();
    itemsDe(l).forEach((li, i) => { if (!li.dataset.eItem) li.dataset.eItem = `o${i}`; if (!li.dataset.eItemCopie) m.set(li.dataset.eItem, li.cloneNode(true) as HTMLElement); });
    modelesItems.set(cle, m);
  }
}
export const listes = () => [...document.querySelectorAll<HTMLElement>('[data-e-liste]')];
export const itemsListe = itemsDe;

/** Fusionne un ordre voulu avec l'ordre réel : un élément inconnu garde sa place (après son voisin d'origine). */
export function fusionnerOrdre(voulu0: string[], base: string[]) {
  const voulu = voulu0.filter((id) => base.includes(id));
  for (const [i, id] of base.entries()) {
    if (voulu.includes(id)) continue;
    const avant = base.slice(0, i).reverse().find((x) => voulu.includes(x));
    voulu.splice(avant ? voulu.indexOf(avant) + 1 : 0, 0, id);
  }
  return voulu;
}
function ranger(parent: Element, elements: Element[]) {
  if (!elements.length) return;
  const repere = document.createComment('ordre'); parent.insertBefore(repere, elements[0]);
  for (const e of elements) parent.insertBefore(e, repere);
  repere.remove();
}

/** Applique les listes ; renvoie vrai si des éléments ont été ajoutés ou retirés. */
function appliquerListes(doc: Record<string, DocListe> | undefined) {
  let structure = false;
  for (const l of listes()) {
    const cle = l.dataset.eListe!, conf = doc?.[cle];
    if (!conf && !listesTouchees.has(cle)) continue;
    listesTouchees.add(cle);
    const voulues = new Map((conf?.copies ?? []).map((c) => [c.id, c.de]));
    for (const li of itemsDe(l)) if (li.dataset.eItemCopie && voulues.get(li.dataset.eItem!) !== li.dataset.eItemCopie) { li.remove(); structure = true; }
    for (const [id, de] of voulues) {
      if (itemsDe(l).some((li) => li.dataset.eItem === id)) continue;
      const modele = modelesItems.get(cle)?.get(de); if (!modele) continue;
      const c = modele.cloneNode(true) as HTMLElement;
      c.dataset.eItem = id; c.dataset.eItemCopie = de;
      [c, ...c.querySelectorAll('.reveal')].forEach((x) => x.classList.contains('reveal') && x.classList.add('visible'));
      c.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id'));
      const source = itemsDe(l).find((li) => li.dataset.eItem === de);
      if (source) source.after(c); else l.append(c);
      structure = true;
    }
    const items = itemsDe(l);
    const ids = items.map((li) => li.dataset.eItem!);
    const base = [...ids.filter((id) => id.startsWith('o')).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))];
    for (const id of ids) if (!base.includes(id)) { const de = voulues.get(id)!; base.splice(base.indexOf(de) + 1, 0, id); }
    const ordre = fusionnerOrdre(conf?.ordre ?? [], base);
    ranger(l, ordre.map((id) => items.find((li) => li.dataset.eItem === id)!));
    for (const li of items) li.toggleAttribute('data-e-cache', !!conf?.cache?.includes(li.dataset.eItem!));
    // Numéros décoratifs (01, 02, 03…) : suivent le nouvel ordre
    let rang = 0;
    for (const li of itemsDe(l)) {
      if (li.hasAttribute('data-e-cache')) continue;
      rang++;
      const num = li.querySelector<HTMLElement>(':scope > .num, :scope > .bl-num, :scope > [aria-hidden="true"]:first-child');
      if (num && /^\d{1,3}$/.test(num.textContent!.trim())) num.textContent = String(rang).padStart(num.textContent!.trim().length, '0');
    }
  }
  return structure;
}

/** Équipe et partenaires (chargés depuis la base) : ordre provisoire du brouillon, avant publication. */
export function appliquerBd(bd: Doc['bd']) {
  for (const [nom, ordre] of Object.entries(bd ?? {})) {
    const l = document.querySelector(`[data-e-bd="${nom}"]`); if (!l || !ordre) continue;
    const items = itemsDe(l), ids = items.map((li) => li.dataset.id!).filter(Boolean);
    const voulu = fusionnerOrdre(ordre, ids);
    ranger(l, voulu.map((id) => items.find((li) => li.dataset.id === id)!));
  }
}

const clesConnues = new WeakMap<HTMLElement, string>();   // une clé ne change jamais, même si l'élément est déplacé
export function reperer(): Cible[] {
  instantane();
  if (cibles) return cibles;
  const racines = [...document.querySelectorAll<HTMLElement>('header.entete, main, footer.pied')];
  const compteur = new Map<string, number>();
  const cle = (el: HTMLElement, type: string) => {
    const z = `${zone(el)}/${type}`;
    const n = compteur.get(z) ?? 0; compteur.set(z, n + 1);
    const connue = clesConnues.get(el);
    if (connue) return connue;
    const c = `${z}${n}`; clesConnues.set(el, c); return c;
  };
  reperesListes();
  const liste: Cible[] = [];
  for (const r of racines) {
    const tous = [...r.querySelectorAll<HTMLElement>(`${SEL_LIEN},${SEL_TEXTE},img`)];
    for (const el of tous) {
      if (el.closest(EXCLURE)) continue;
      let type: Cible['type'];
      if (el.matches('img')) type = 'i';
      else if (el.matches(SEL_LIEN)) type = 'l';
      else {
        if (el.closest('a') || !el.textContent?.trim()) continue;
        if (el.querySelector(SEL_TEXTE)) continue;            // conteneur : on édite ses enfants
        if (el.querySelector(SEL_LIEN)) continue;             // contient un bouton : on édite le bouton à part
        type = 't';
      }
      if (type !== 't' && el.parentElement?.closest(SEL_TEXTE) && !el.matches(SEL_LIEN)) continue;
      liste.push({ el, cle: cle(el, type), type, portee: portee(el) });
      if (!defauts.has(el)) defauts.set(el, { html: el.innerHTML, href: el.getAttribute('href'), src: (el as HTMLImageElement).getAttribute('src') ?? undefined, srcset: el.getAttribute('srcset') });
    }
  }
  cibles = liste;
  return liste;
}

/** Ne garde que le gras, l'italique, les retours à la ligne, les liens simples et les span à classe du site. */
export function nettoyer(html: string): string {
  const tpl = document.createElement('template'); tpl.innerHTML = html;
  const sortie = document.createElement('div');
  const copier = (src: Node, dest: Node) => {
    for (const n of [...src.childNodes]) {
      if (n.nodeType === 3) { dest.appendChild(document.createTextNode(n.textContent ?? '')); continue; }
      if (n.nodeType !== 1) continue;
      const e = n as HTMLElement, tag = e.tagName.toLowerCase();
      if (tag === 'br') { dest.appendChild(document.createElement('br')); continue; }
      if (['strong', 'b', 'em', 'i'].includes(tag)) { const x = document.createElement(tag === 'b' ? 'strong' : tag === 'i' ? 'em' : tag); copier(e, x); dest.appendChild(x); continue; }
      if (tag === 'span') {   // garde les petites mises en forme du site (classes seulement, jamais de style ni de script)
        const cl = (e.getAttribute('class') ?? '').split(/\s+/).filter((c) => /^[a-z][\w-]*$/i.test(c)).join(' ');
        if (cl) { const x = document.createElement('span'); x.className = cl; copier(e, x); dest.appendChild(x); continue; }
      }
      if (tag === 'a') {
        const href = e.getAttribute('href') ?? '';
        if (/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(href)) { const x = document.createElement('a'); x.setAttribute('href', href); copier(e, x); dest.appendChild(x); continue; }
      }
      copier(e, dest);   // balise non autorisée : on garde seulement son texte
    }
  };
  copier(tpl.content, sortie);
  return sortie.innerHTML.replace(/(<br>\s*){3,}/g, '<br><br>').trim();
}

const remplacerTexteLien = (a: HTMLElement, texte: string) => {
  const noeuds = [...a.childNodes].filter((n) => n.nodeType === 3 && n.textContent!.trim());
  if (noeuds.length) { noeuds[0].textContent = noeuds[0].textContent!.replace(/\S[\s\S]*\S|\S/, texte); noeuds.slice(1).forEach((n) => (n.textContent = ' ')); }
  else a.prepend(document.createTextNode(texte));
};

const urlImage = (src: string) => (/^(https?:|\/)/.test(src) ? src : urlMedia(src));

/** Applique les documents (page + éléments communs) ; revient d'abord aux valeurs par défaut. */
const touches = new WeakSet<HTMLElement>();
export function appliquer(docs: { page?: Doc; global?: Doc }) {
  instantane();
  if (appliquerBlocs(docs.page?.s)) cibles = null;   // des copies de sections ont changé : nouveau repérage
  reperer();
  if (appliquerListes(docs.page?.li)) cibles = null;   // des éléments de liste ont été ajoutés ou retirés
  appliquerBd(docs.page?.bd);
  for (const c of reperer()) {
    const d = defauts.get(c.el)!;
    const doc = (c.portee === 'global' ? docs.global : docs.page) ?? {};
    const v0 = c.type === 't' ? doc.t?.[c.cle] : c.type === 'l' ? doc.l?.[c.cle] : doc.i?.[c.cle];
    // On ne touche qu'aux éléments modifiés (ou qui l'étaient) : le reste du site n'est jamais réécrit.
    if (v0 === undefined && !touches.has(c.el)) continue;
    if (v0 === undefined) touches.delete(c.el); else touches.add(c.el);
    if (c.type === 't') {
      const v = doc.t?.[c.cle];
      c.el.innerHTML = v !== undefined ? nettoyer(v) : d.html;
    } else if (c.type === 'l') {
      const v = doc.l?.[c.cle];
      c.el.innerHTML = d.html;
      if (d.href !== null && d.href !== undefined) c.el.setAttribute('href', d.href);
      c.el.toggleAttribute('data-masquee', !!v?.cache);
      if (v?.texte) remplacerTexteLien(c.el, v.texte);
      if (v?.href) c.el.setAttribute('href', v.href);
    } else {
      const v = doc.i?.[c.cle], img = c.el as HTMLImageElement;
      if (v?.src) { img.removeAttribute('srcset'); img.src = urlImage(v.src); }
      else { if (d.src) img.setAttribute('src', d.src); if (d.srcset) img.setAttribute('srcset', d.srcset); }
      img.style.zoom = v?.echelle && v.echelle !== 1 ? String(v.echelle) : '';
      img.toggleAttribute('data-masquee', !!v?.cache);
    }
  }
}

const CACHE = '2ameca-edition-publie';
/** Visiteurs : applique tout de suite la dernière version connue, puis la version publiée à jour. */
export async function demarrerVisiteur() {
  if (document.documentElement.classList.contains('mode-edition')) return;
  const page = pageCourante();
  let memo: Record<string, { c: Doc; t: string }> = {};
  try { memo = JSON.parse(localStorage.getItem(CACHE) ?? '{}'); } catch { /* ignore */ }
  if (memo[page] || memo['*']) appliquer({ page: memo[page]?.c, global: memo['*']?.c });
  const { sb } = await import('../supabase');
  const { data, error } = await sb.from('site_publie').select('page, contenu, publie_at').in('page', [page, '*']);
  if (error) return;
  const frais: Record<string, { c: Doc; t: string }> = {};
  for (const r of data ?? []) frais[r.page] = { c: r.contenu as Doc, t: r.publie_at };
  if (!document.documentElement.classList.contains('mode-edition')) appliquer({ page: frais[page]?.c, global: frais['*']?.c });
  try { localStorage.setItem(CACHE, JSON.stringify({ ...memo, ...frais, [page]: frais[page] ?? { c: {}, t: '' }, '*': frais['*'] ?? { c: {}, t: '' } })); } catch { /* ignore */ }
}
