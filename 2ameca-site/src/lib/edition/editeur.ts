/**
 * Mode édition — l'éditeur visuel (chargé seulement quand un administrateur l'active).
 * Toucher un texte pour le modifier, une image pour la remplacer, un bouton pour changer
 * son texte, sa destination ou sa visibilité. Brouillon, aperçu, publication, annuler/rétablir
 * et historique. Les droits sont vérifiés par la base (règles et fonction publier_page).
 */
import { sb, messageErreur } from '../supabase';
import { h, toast } from '../dom';
import { reduireImage, urlMedia } from '../images';
import { GABARITS, PREFIXE } from './gabarits';
import { reperer, appliquer, nettoyer, pageCourante, blocs, blocParId, duplicable, itemsListe, FONDS, type Doc, type DocBlocs, type DocListe, type ListeBd, type Cible, type Fond } from './appliquer';

type Docs = { page: Doc; global: Doc };
const CLE_SESSION = '2ameca-mode-edition';
const PAGES: [string, string][] = [['/', 'Accueil'], ['/le-club/', 'Le club'], ['/evenements/', 'Événements'], ['/formations/', 'Formations'],
  ['/galerie/', 'Galerie'], ['/ressources/', 'Ressources'], ['/rejoindre/', 'Rejoindre'], ['/contact/', 'Contact'], ['/verifier/', 'Vérifier une attestation']];
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const vide = (): Doc => ({ t: {}, l: {}, i: {}, s: {} });
const copie = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const normal = (d: Doc | undefined): Doc => ({ t: { ...(d?.t ?? {}) }, l: { ...(d?.l ?? {}) }, i: { ...(d?.i ?? {}) }, s: copie(d?.s ?? {}), ...(d?.li ? { li: copie(d.li) } : {}), ...(d?.bd ? { bd: copie(d.bd) } : {}) });

let actif = false;
let travail: Docs, publie: Docs, enregistre: Docs;
const passe: string[] = [], futur: string[] = [];
let page = '/';

/** L'administrateur peut-il éditer ? (vérifié aussi côté serveur à chaque écriture) */
export async function estAdmin(): Promise<boolean> {
  const { data: u } = await sb.auth.getUser();
  if (!u.user) return false;
  const { data } = await sb.from('profiles').select('role').eq('id', u.user.id).maybeSingle();
  return data?.role === 'admin';
}
export const reprendreSiActif = () => { try { return sessionStorage.getItem(CLE_SESSION) === '1'; } catch { return false; } };

export async function demarrer() {
  if (actif) return;
  if (!(await estAdmin())) { toast('Le mode édition est réservé aux administrateurs.', 'erreur'); return; }
  actif = true; page = pageCourante();
  try { sessionStorage.setItem(CLE_SESSION, '1'); } catch { /* ignore */ }
  document.documentElement.classList.add('mode-edition');
  styles();
  const [pub, brouillon] = await Promise.all([
    sb.from('site_publie').select('page, contenu').in('page', [page, '*']),
    sb.from('site_brouillons').select('page, contenu').in('page', [page, '*']),
  ]);
  const p = Object.fromEntries((pub.data ?? []).map((r) => [r.page, r.contenu as Doc]));
  const b = Object.fromEntries((brouillon.data ?? []).map((r) => [r.page, r.contenu as Doc]));
  publie = { page: normal(p[page]), global: normal(p['*']) };
  travail = { page: normal(b[page] ?? p[page]), global: normal(b['*'] ?? p['*']) };
  enregistre = copie(travail);
  document.querySelectorAll<HTMLDetailsElement>('main details').forEach((d) => (d.open = true));   // questions dépliées pour modifier les réponses
  reperer();
  appliquer(travail);
  barre();
  marquer();
  poignees();
  document.addEventListener('click', clic, true);
  document.addEventListener('submit', bloquer, true);
  addEventListener('beforeunload', avantDepart);
  majEtat();
  if (b[page] || b['*']) toast('Brouillon en cours chargé.');
}

function quitter() {
  if (modifie() && !confirm('Des modifications ne sont pas enregistrées. Quitter quand même le mode édition ?')) return;
  try { sessionStorage.removeItem(CLE_SESSION); } catch { /* ignore */ }
  removeEventListener('beforeunload', avantDepart);
  location.reload();
}
const avantDepart = (e: BeforeUnloadEvent) => { if (modifie()) { e.preventDefault(); e.returnValue = ''; } };
const bloquer = (e: Event) => { if (!(e.target as Element).closest('#edition-ui, #ed-guide')) { e.preventDefault(); e.stopPropagation(); } };

// ── Historique local (annuler / rétablir)
const etat = () => JSON.stringify(travail);
function changer(f: () => void) {
  passe.push(etat()); if (passe.length > 120) passe.shift();
  futur.length = 0;
  f();
  rafraichir();
}
function rafraichir() { appliquer(travail); marquer(); majEtat(); placerPoignees(); }
function annuler() { if (!passe.length) return; futur.push(etat()); travail = JSON.parse(passe.pop()!); rafraichir(); }
function retablir() { if (!futur.length) return; passe.push(etat()); travail = JSON.parse(futur.pop()!); rafraichir(); }
const modifie = () => JSON.stringify(travail) !== JSON.stringify(enregistre);
const differentDuPublie = () => JSON.stringify(travail) !== JSON.stringify(publie);
const doc = (c: Cible) => (c.portee === 'global' ? travail.global : travail.page);

// ── Repérage visuel des éléments modifiables
function marquer() {
  // Éléments de liste masqués : visibles mais grisés en édition
  for (const li of document.querySelectorAll<HTMLElement>('[data-e-liste] > *')) {
    if (li.hasAttribute('data-e-cache')) { li.removeAttribute('data-e-cache'); li.setAttribute('data-ed-masque', ''); li.removeAttribute('data-masquee'); }
    else if (!document.documentElement.classList.contains('ed-apercu')) { li.removeAttribute('data-ed-masque'); li.removeAttribute('data-masquee'); }
  }
  for (const c of reperer()) {
    c.el.setAttribute('data-ed', c.type);
    const d = doc(c);
    const change = (c.type === 't' && d.t![c.cle] !== undefined) || (c.type === 'l' && d.l![c.cle]) || (c.type === 'i' && d.i![c.cle]);
    c.el.toggleAttribute('data-ed-change', !!change);
    c.el.toggleAttribute('data-ed-commun', c.portee === 'global');
    // En édition, un élément masqué reste visible (grisé) pour pouvoir le réafficher.
    if (c.el.hasAttribute('data-masquee')) { c.el.removeAttribute('data-masquee'); c.el.setAttribute('data-ed-masque', ''); }
    else c.el.removeAttribute('data-ed-masque');
  }
}

function clic(e: MouseEvent) {
  const t = e.target as HTMLElement;
  if (t.closest('#edition-ui, #ed-guide')) return;
  if (appuiLong) { appuiLong = false; e.preventDefault(); e.stopPropagation(); return; }   // le doigt vient d'ouvrir le menu de section
  if (document.documentElement.classList.contains('ed-apercu')) { if (t.closest('a')) e.preventDefault(); return; }
  if (t.closest('[contenteditable="true"]')) return;          // saisie en cours
  const el = t.closest<HTMLElement>('[data-ed]');
  const lien = t.closest('a, button');
  if (lien && !lien.closest('#edition-ui')) { e.preventDefault(); e.stopPropagation(); }
  if (!el) return;
  const c = reperer().find((x) => x.el === el);
  if (!c) return;
  e.preventDefault(); e.stopPropagation();
  if (c.type === 't') editerTexte(c);
  else if (c.type === 'l') feuilleLien(c);
  else feuilleImage(c);
}

// ── Texte : modification directe
let enCours: { c: Cible; avant: string; caches: { n: Element; debut: boolean }[] } | null = null;
function editerTexte(c: Cible) {
  finirTexte();
  const el = c.el;
  const avant = el.innerHTML;
  // Les morceaux invisibles (lecteurs d'écran) sont mis de côté pendant la saisie, puis remis.
  const caches = [...el.querySelectorAll('.sr-only')].map((n) => ({ n, debut: !(n.previousSibling?.textContent ?? '').trim() }));
  caches.forEach(({ n }) => n.remove());
  enCours = { c, avant, caches };
  el.setAttribute('contenteditable', 'true');
  el.focus();
  const s = getSelection(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); s?.removeAllRanges(); s?.addRange(r);
  outilsTexte(el);
  el.addEventListener('keydown', toucheTexte);
  el.addEventListener('paste', collerTexte);
}
function toucheTexte(e: KeyboardEvent) {
  if (e.key === 'Escape' && enCours) { enCours.c.el.innerHTML = enCours.avant; enCours.caches = []; finirTexte(); }
  const t = e.target as HTMLElement;
  if (e.key === 'Enter' && !e.shiftKey && (/^H[1-4]$/.test(t.tagName) || t.closest('summary'))) { e.preventDefault(); finirTexte(); }
  if (e.key === ' ' && t.closest('summary')) { e.preventDefault(); document.execCommand('insertText', false, ' '); }   // l'espace ne referme pas la question
}
function collerTexte(e: ClipboardEvent) {
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') ?? '');
}
function finirTexte() {
  if (!enCours) return;
  const { c, avant, caches } = enCours; enCours = null;
  c.el.removeAttribute('contenteditable');
  for (const { n, debut } of caches) debut ? c.el.prepend(n) : c.el.append(n);
  c.el.removeEventListener('keydown', toucheTexte); c.el.removeEventListener('paste', collerTexte);
  document.getElementById('ed-outils-texte')?.remove();
  const nouveau = nettoyer(c.el.innerHTML);
  if (nouveau === nettoyer(avant)) { c.el.innerHTML = avant; return; }
  if (!nouveau.replace(/<br>/g, '').trim()) {
    c.el.innerHTML = avant;
    toast('Un texte ne peut pas être vide. Pour le retirer, masquez sa section.', 'erreur'); return;
  }
  changer(() => { doc(c).t![c.cle] = nouveau; });
}
function outilsTexte(el: HTMLElement) {
  const b = (txt: string, titre: string, f: () => void) => {
    const x = h('button', { type: 'button', title: titre, 'aria-label': titre }, txt) as HTMLButtonElement;
    x.addEventListener('pointerdown', (e) => e.preventDefault());   // garde la sélection
    x.addEventListener('click', f); return x;
  };
  const barreT = h('div', { id: 'ed-outils-texte', class: 'ed-outils-texte' },
    b('G', 'Gras', () => document.execCommand('bold')),
    b('I', 'Italique', () => document.execCommand('italic')),
    b('↺', 'Rétablir le texte d’origine', () => {
      if (!enCours) return; const c = enCours.c;
      enCours.caches.forEach(({ n, debut }) => (debut ? c.el.prepend(n) : c.el.append(n)));
      enCours = null; c.el.removeAttribute('contenteditable'); document.getElementById('ed-outils-texte')?.remove();
      changer(() => { delete doc(c).t![c.cle]; });
    }),
    b('✓ Terminé', 'Terminer', () => finirTexte()));
  barreT.id = 'ed-outils-texte';
  ui().append(barreT);
  const r = el.getBoundingClientRect();
  barreT.style.top = `${Math.max(8, r.top - 52)}px`;
  el.addEventListener('blur', () => setTimeout(() => { if (enCours && document.activeElement !== enCours.c.el && !document.activeElement?.closest('#ed-outils-texte')) finirTexte(); }, 150), { once: true });
}

// ── Feuilles (panneaux du bas)
function feuille(titre: string, contenu: (Node | null)[], actions: Node[]) {
  finirTexte(); fermerFeuille();
  const f = h('div', { class: 'ed-feuille', role: 'dialog', 'aria-label': titre },
    h('div', { class: 'ed-feuille-tete' }, h('strong', {}, titre), h('button', { type: 'button', class: 'ed-x', 'aria-label': 'Fermer', onclick: fermerFeuille }, '×')),
    h('div', { class: 'ed-feuille-corps' }, ...contenu.filter((x): x is Node => !!x)),
    h('div', { class: 'ed-feuille-actions' }, ...actions));
  const ouverteA = Date.now();   // ignore le toucher qui vient d'ouvrir le panneau (appui long)
  const fond = h('div', { class: 'ed-voile', onclick: () => { if (Date.now() - ouverteA > 600) fermerFeuille(); } });
  f.addEventListener('click', (e) => { if (Date.now() - ouverteA < 350) { e.preventDefault(); e.stopPropagation(); } }, true);
  ui().append(fond, f);
  requestAnimationFrame(() => f.classList.add('ouverte'));
}
function fermerFeuille() {
  const ouverte = ui().querySelector('.ed-feuille');
  ui().querySelectorAll('.ed-feuille, .ed-voile').forEach((x) => x.remove());
  if (ouverte) rafraichir();   // annule un aperçu non appliqué (taille d'image…)
}
const champ = (label: string, input: HTMLElement) => h('label', { class: 'ed-champ' }, h('span', {}, label), input);
const interrupteur = (label: string, coche: boolean) => {
  const i = h('input', { type: 'checkbox', checked: coche }) as HTMLInputElement;
  return { el: h('label', { class: 'ed-inter' }, i, h('span', {}, label)), i };
};
const btn = (txt: string, classe: string, f: () => void) => h('button', { type: 'button', class: classe, onclick: f }, txt);
const mention = (c: Cible) => (c.portee === 'global' ? [h('p', { class: 'ed-note' }, 'Élément commun : la modification s’appliquera à toutes les pages.')] : []);

function feuilleLien(c: Cible) {
  const v = doc(c).l![c.cle] ?? {};
  const a = c.el as HTMLAnchorElement;
  const texte = h('input', { value: v.texte ?? a.textContent!.replace(/[→↗]/g, '').trim(), maxlength: 80 }) as HTMLInputElement;
  const lien = h('input', { value: v.href ?? a.getAttribute('href') ?? '', inputmode: 'url', placeholder: '/contact/ ou https://…' }) as HTMLInputElement;
  const pages = h('select', { 'aria-label': 'Choisir une page du site' }, h('option', { value: '' }, 'Choisir une page du site…'), ...PAGES.map(([p, n]) => h('option', { value: base + p }, n))) as HTMLSelectElement;
  pages.addEventListener('change', () => { if (pages.value) lien.value = pages.value; });
  const vis = interrupteur('Afficher ce bouton', !v.cache);
  feuille('Bouton / lien', [...mention(c), champ('Texte', texte), champ('Destination', lien), pages, vis.el], [
    btn('Rétablir l’original', 'ed-b secondaire', () => { fermerFeuille(); changer(() => { delete doc(c).l![c.cle]; }); }),
    btn('Appliquer', 'ed-b', () => {
      const href = lien.value.trim();
      if (href && !/^(https?:\/\/|\/|#|mailto:|tel:)/i.test(href)) { toast('Destination invalide : commencez par / , https:// , mailto: ou tel:', 'erreur'); return; }
      fermerFeuille();
      changer(() => { doc(c).l![c.cle] = { texte: texte.value.trim() || undefined, href: href || undefined, cache: !vis.i.checked || undefined }; });
    }),
  ]);
}

function feuilleImage(c: Cible) {
  const img = c.el as HTMLImageElement;
  const v = doc(c).i![c.cle] ?? {};
  const apercu = h('img', { class: 'ed-apercu-img', src: img.currentSrc || img.src, alt: '' }) as HTMLImageElement;
  const fichier = h('input', { type: 'file', accept: 'image/*', class: 'ed-fichier' }) as HTMLInputElement;
  let nouveau: string | undefined;
  const choisir = btn('Choisir une photo…', 'ed-b secondaire', () => fichier.click());
  fichier.addEventListener('change', async () => {
    const f = fichier.files?.[0]; if (!f) return;
    choisir.textContent = 'Envoi…';
    try {
      const { blob, ext, type } = await reduireImage(f, 2000);
      const chemin = `site/${Date.now()}-${Math.random().toString(36).slice(2, 7)}${ext}`;
      const { error } = await sb.storage.from('medias').upload(chemin, blob, { contentType: type });
      if (error) throw error;
      nouveau = chemin; apercu.src = urlMedia(chemin); choisir.textContent = 'Changer de photo…';
    } catch (e) { toast(messageErreur(e), 'erreur'); choisir.textContent = 'Choisir une photo…'; }
  });
  const taille = h('input', { type: 'range', min: '40', max: '200', step: '5', value: String(Math.round((v.echelle ?? 1) * 100)) }) as HTMLInputElement;
  const val = h('output', {}, `${taille.value} %`);
  taille.addEventListener('input', () => { val.textContent = `${taille.value} %`; img.style.zoom = String(Number(taille.value) / 100); });
  const vis = interrupteur('Afficher cette image', !v.cache);
  feuille('Image', [...mention(c), apercu, choisir, fichier, champ('Taille', h('div', { class: 'ed-taille' }, taille, val)), vis.el], [
    btn('Rétablir l’original', 'ed-b secondaire', () => { fermerFeuille(); changer(() => { delete doc(c).i![c.cle]; }); }),
    btn('Appliquer', 'ed-b', () => {
      fermerFeuille();
      const echelle = Number(taille.value) / 100;
      changer(() => { doc(c).i![c.cle] = { src: nouveau ?? v.src, echelle: echelle !== 1 ? echelle : undefined, cache: !vis.i.checked || undefined }; });
    }),
  ]);
}

// ── Sections : poignée, appui long, glisser-déposer, menu
let appuiLong = false, finGlisser = 0;
const sDoc = (): DocBlocs => (travail.page.s ??= {});
const nomSection = (b: HTMLElement) => {
  const t = b.querySelector('h1, h2, .titre-2, .titre-1, .titre-hero')?.textContent?.replace(/\s+/g, ' ').trim();
  const g = b.dataset.blocCopie?.startsWith(PREFIXE) ? GABARITS[b.dataset.blocCopie.slice(PREFIXE.length)]?.nom : undefined;
  return t ? (t.length > 34 ? `${t.slice(0, 32)}…` : t) : g ?? 'Section';
};
const ordreActuel = () => blocs().map((b) => b.dataset.bloc!);
/** Sections que l'on voit en édition (ni supprimées, ni vides en attente de données). */
const visibles = () => blocs().filter((b) => !b.hasAttribute('data-e-suppr') && !b.hidden);
const retirer = (liste: string[] | undefined, id: string) => (liste ?? []).filter((x) => x !== id);

function poignees() {
  const couche = ui().appendChild(h('div', { class: 'ed-poignees', id: 'ed-poignees' }));
  couche.addEventListener('pointerdown', (e) => { if ((e.target as Element).closest('.ed-item')) glisserItem(e); else debutGlisser(e); });
  couche.addEventListener('click', (e) => {
    const plus = (e.target as Element).closest<HTMLElement>('.ed-plus');
    if (plus) { feuilleAjout(plus.dataset.apres!); return; }
    const pi = (e.target as Element).closest<HTMLElement>('.ed-plus-item');
    if (pi) { const l = listeParCle(pi.dataset.liste!); const der = l && itemsListe(l).at(-1); if (l && der) dupliquerItem(l, der); return; }
    const it = (e.target as Element).closest<HTMLElement>('.ed-item');
    if (it) { if (Date.now() - finGlisser < 400) return; const l = listeParCle(it.dataset.liste!); const li = l && itemsListe(l).find((x) => idItem(x) === it.dataset.id); if (l && li) feuilleItem(l, li); return; }
    const p = (e.target as Element).closest<HTMLElement>('.ed-poignee');
    if (!p || Date.now() - finGlisser < 400) return;
    feuilleSection(p.dataset.id!);
  });
  placerPoignees();
  addEventListener('resize', placerPoignees);
  new ResizeObserver(() => placerPoignees()).observe(document.querySelector('main')!);
  // Équipe et partenaires arrivent de la base après coup : on réapplique l'ordre du brouillon.
  let attente = 0;
  const surveillant = new MutationObserver(() => { clearTimeout(attente); attente = window.setTimeout(() => { surveillant.disconnect(); rafraichir(); observer(); }, 120); });
  const observer = () => document.querySelectorAll('[data-e-bd]').forEach((l) => surveillant.observe(l, { childList: true }));
  observer();
  // Appui long n'importe où dans une section → menu de la section
  let minuterie = 0, depart: { x: number; y: number } | null = null;
  const annulerAppui = () => { clearTimeout(minuterie); depart = null; };
  document.addEventListener('touchstart', (e) => {
    if (document.documentElement.classList.contains('ed-apercu') || (e.target as Element).closest('#edition-ui, #ed-guide, [contenteditable="true"]')) return;
    const b = (e.target as Element).closest<HTMLElement>('main > [data-bloc]'); if (!b) return;
    const t = e.touches[0]; depart = { x: t.clientX, y: t.clientY };
    minuterie = window.setTimeout(() => { appuiLong = true; navigator.vibrate?.(15); feuilleSection(b.dataset.bloc!); setTimeout(() => (appuiLong = false), 700); }, 550);
  }, { passive: true });
  document.addEventListener('touchmove', (e) => { if (depart && Math.hypot(e.touches[0].clientX - depart.x, e.touches[0].clientY - depart.y) > 10) annulerAppui(); }, { passive: true });
  document.addEventListener('touchend', (e) => { if (appuiLong) e.preventDefault(); annulerAppui(); });   // pas de « click » après l'appui long
  document.addEventListener('touchcancel', annulerAppui);
  document.addEventListener('contextmenu', (e) => { if ((e.target as Element).closest('main > [data-bloc]') && !(e.target as Element).closest('[contenteditable="true"]')) e.preventDefault(); });
}
function placerPoignees() {
  const couche = document.getElementById('ed-poignees'); if (!couche) return;
  const liste = visibles();
  const plus = liste.map((b) => {
    const r = b.getBoundingClientRect();
    return h('button', { type: 'button', class: 'ed-plus', 'data-apres': b.dataset.bloc!, 'aria-label': `Ajouter une section après « ${nomSection(b)} »`, style: `top:${Math.round(r.bottom + scrollY - 17)}px;left:${document.documentElement.clientWidth - 10}px` },
      h('span', { 'aria-hidden': 'true' }, '+'), 'Section');
  });
  const extra = listeActive ? poigneesListes(listeActive) : [];
  if (!listeActive) { document.querySelector('.ed-fin-listes')?.remove(); document.querySelectorAll('.ed-liste-active').forEach((l) => l.classList.remove('ed-liste-active')); }
  couche.replaceChildren(...extra, ...liste.map((b, i) => {
    const r = b.getBoundingClientRect();
    const p = h('button', { type: 'button', class: 'ed-poignee', 'data-id': b.dataset.bloc!, 'aria-label': `Section ${i + 1} : ${nomSection(b)} — toucher pour les options, maintenir pour déplacer`,
      style: `top:${Math.round(r.top + scrollY + 6)}px` });
    p.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
    p.append(h('span', {}, `${i + 1}. ${nomSection(b)}${b.hasAttribute('data-e-cache') ? ' (masquée)' : ''}`));
    return p;
  }), ...plus);
}

/** Maintenir la poignée puis glisser : déplace la section ; un simple toucher ouvre le menu. */
function debutGlisser(e: PointerEvent) {
  const p = (e.target as Element).closest<HTMLElement>('.ed-poignee'); if (!p) return;
  e.preventDefault();
  const id = p.dataset.id!, y0 = e.clientY;
  let actifG = false, cible = -1, rafId = 0, vitesse = 0;
  const repere = ui().appendChild(h('div', { class: 'ed-repere', hidden: true }));
  const minuterie = window.setTimeout(() => { actifG = true; p.classList.add('saisie'); navigator.vibrate?.(15); blocParId(id)?.classList.add('ed-deplace'); }, 250);
  const defiler = () => { if (vitesse) { scrollBy(0, vitesse); rafId = requestAnimationFrame(defiler); } else rafId = 0; };
  const bouger = (ev: PointerEvent) => {
    if (!actifG) { if (Math.abs(ev.clientY - y0) > 8) { clearTimeout(minuterie); fin(ev, true); } return; }
    p.style.translate = `0 ${ev.clientY - y0}px`;
    const liste = visibles();
    // emplacement le plus proche (entre deux sections)
    const bords = [...liste.map((b) => b.getBoundingClientRect().top), liste.at(-1)!.getBoundingClientRect().bottom];
    cible = bords.reduce((m, y, i) => (Math.abs(y - ev.clientY) < Math.abs(bords[m] - ev.clientY) ? i : m), 0);
    repere.hidden = false; repere.style.top = `${Math.round(bords[cible] + scrollY - 2)}px`;
    vitesse = ev.clientY < 90 ? -14 : ev.clientY > innerHeight - 110 ? 14 : 0;
    if (vitesse && !rafId) rafId = requestAnimationFrame(defiler);
  };
  const fin = (ev: PointerEvent, abandon = false) => {
    clearTimeout(minuterie); vitesse = 0;
    removeEventListener('pointermove', bouger); removeEventListener('pointerup', finOk); removeEventListener('pointercancel', finAb);
    repere.remove(); p.classList.remove('saisie'); p.style.translate = ''; blocParId(id)?.classList.remove('ed-deplace');
    if (abandon) return;
    if (!actifG) return;            // simple toucher : le « click » ouvre le menu
    finGlisser = Date.now();
    const liste = visibles().map((b) => b.dataset.bloc!);
    const de = liste.indexOf(id);
    if (cible < 0 || cible === de || cible === de + 1) return;
    deplacerVers(id, liste[cible] ?? null);
    void ev;
  };
  const finOk = (ev: PointerEvent) => fin(ev), finAb = (ev: PointerEvent) => fin(ev, true);
  addEventListener('pointermove', bouger); addEventListener('pointerup', finOk); addEventListener('pointercancel', finAb);
}
/** Place la section « id » juste avant « avant » (null = à la fin). */
function deplacerVers(id: string, avant: string | null) {
  changer(() => {
    const o = ordreActuel().filter((x) => x !== id);
    o.splice(avant ? o.indexOf(avant) : o.length, 0, id);
    sDoc().ordre = o;
  });
  requestAnimationFrame(() => blocParId(id)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
}
function decaler(id: string, sens: -1 | 1) {
  const o = visibles().map((b) => b.dataset.bloc!);
  const i = o.indexOf(id), j = i + sens;
  if (j < 0 || j >= o.length) return;
  deplacerVers(id, sens < 0 ? o[j] : o[j + 1] ?? null);
}

const NOMS_FOND: Record<Fond, string> = { blanc: 'Blanc', teinte: 'Bleu clair', sombre: 'Bleu', 'tres-sombre': 'Bleu nuit' };
function feuilleSection(id: string) {
  const b = blocParId(id); if (!b) return;
  const sd = sDoc();
  const liste = visibles().map((b) => b.dataset.bloc!);
  const rang = liste.indexOf(id);
  const masque = !!sd.cache?.includes(id);
  const estCopie = !!b.dataset.blocCopie;
  const action = (txt: string, icone: string, f: () => void, inactif = false, classe = '') => {
    const x = h('button', { type: 'button', class: `ed-action ${classe}`, disabled: inactif }) as HTMLButtonElement;
    x.innerHTML = `<span aria-hidden="true">${icone}</span>`; x.append(txt);
    x.addEventListener('click', () => { fermerFeuille(); f(); }); return x;
  };
  const contenu: Node[] = [
    h('p', { class: 'ed-note' }, `Section ${rang + 1} sur ${liste.length}${estCopie ? ' · copie' : ''}. Astuce : maintenez la poignée ⠿ puis glissez pour la déplacer.`),
    h('div', { class: 'ed-actions' },
      action('Monter', '↑', () => decaler(id, -1), rang <= 0),
      action('Descendre', '↓', () => decaler(id, 1), rang >= liste.length - 1),
      action('Dupliquer', '⧉', () => dupliquer(id), !duplicable(id)),
      action(masque ? 'Afficher' : 'Masquer', masque ? '◉' : '◌', () => changer(() => { const s2 = sDoc(); s2.cache = masque ? retirer(s2.cache, id) : [...retirer(s2.cache, id), id]; })),
      action('Ajouter dessous', '+', () => feuilleAjout(id)),
      ...(listesDuBloc(b).length ? [action('Réorganiser', '⇅', () => { listeActive = id; placerPoignees(); toast('Glissez ⠿ pour déplacer un élément, ou touchez-le pour plus d’options.'); })] : []),
      action('Supprimer', '✕', () => supprimer(id), false, 'danger')),
  ];
  if (!duplicable(id)) contenu.push(h('p', { class: 'ed-note' }, 'Cette section affiche des données automatiques ou des éléments interactifs : elle ne peut pas être dupliquée.'));
  if (b.classList.contains('section')) {
    const actuel = (sd.fond?.[id]) ?? (b.classList.contains('tres-sombre') ? 'tres-sombre' : b.classList.contains('sombre') ? 'sombre' : b.classList.contains('teinte') ? 'teinte' : 'blanc');
    const choix = <T extends string>(titre: string, options: [T, string][], valeur: T, f: (v: T) => void, pastilles = false) =>
      h('fieldset', { class: 'ed-choix' }, h('legend', {}, titre), ...options.map(([v, n]) => {
        const x = h('button', { type: 'button', class: `ed-opt${pastilles ? ` fond-${v}` : ''}${v === valeur ? ' choisi' : ''}`, 'aria-pressed': String(v === valeur) }, n);
        x.addEventListener('click', () => { fermerFeuille(); changer(() => f(v)); }); return x;
      }));
    contenu.push(
      choix('Fond', FONDS.map((f) => [f, NOMS_FOND[f]] as [Fond, string]), actuel as Fond, (v) => { const s2 = sDoc(); (s2.fond ??= {})[id] = v; }, true),
      choix('Espacement', [['normal', 'Aéré'], ['serree', 'Serré']], (sd.espace?.[id] ?? (b.classList.contains('serree') ? 'serree' : 'normal')) as 'normal' | 'serree', (v) => { const s2 = sDoc(); (s2.espace ??= {})[id] = v; }),
      choix('Alignement du texte', [['gauche', 'À gauche'], ['centre', 'Centré']], (sd.align?.[id] ?? (getComputedStyle(b.querySelector('h2, p') ?? b).textAlign === 'center' ? 'centre' : 'gauche')) as 'gauche' | 'centre', (v) => { const s2 = sDoc(); (s2.align ??= {})[id] = v; }));
  }
  feuille(nomSection(b), contenu, [
    btn('Rétablir la mise en forme', 'ed-b secondaire', () => { fermerFeuille(); changer(() => { const s2 = sDoc(); delete s2.fond?.[id]; delete s2.espace?.[id]; delete s2.align?.[id]; }); }),
    btn('Fermer', 'ed-b', fermerFeuille),
  ]);
  b.classList.add('ed-cible');
  const f = ui().querySelector('.ed-feuille'); const retirerCible = () => b.classList.remove('ed-cible');
  new MutationObserver((_, o) => { if (!f?.isConnected) { retirerCible(); o.disconnect(); } }).observe(ui(), { childList: true });
  b.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

const ICONES_GABARITS: Record<string, string> = {
  texte: '<rect x="8" y="10" width="20" height="3" rx="1.5"/><rect x="8" y="17" width="44" height="5" rx="2"/><rect x="8" y="28" width="48" height="2.5" rx="1.2"/><rect x="8" y="34" width="44" height="2.5" rx="1.2"/><rect x="8" y="40" width="38" height="2.5" rx="1.2"/>',
  'texte-photo': '<rect x="6" y="14" width="22" height="4" rx="2"/><rect x="6" y="23" width="24" height="2.5" rx="1.2"/><rect x="6" y="29" width="20" height="2.5" rx="1.2"/><rect x="6" y="37" width="14" height="6" rx="3"/><rect x="36" y="10" width="26" height="34" rx="4" opacity=".45"/>',
  cartes: '<rect x="6" y="8" width="24" height="4" rx="2"/><rect x="6" y="18" width="16" height="28" rx="3" opacity=".45"/><rect x="25" y="18" width="16" height="28" rx="3" opacity=".45"/><rect x="44" y="18" width="16" height="28" rx="3" opacity=".45"/>',
  chiffres: '<text x="15" y="31" font-size="12" font-weight="700" text-anchor="middle">12</text><text x="32" y="31" font-size="12" font-weight="700" text-anchor="middle">48</text><text x="49" y="31" font-size="12" font-weight="700" text-anchor="middle">6</text><rect x="10" y="37" width="10" height="2.5" rx="1.2"/><rect x="27" y="37" width="10" height="2.5" rx="1.2"/><rect x="44" y="37" width="10" height="2.5" rx="1.2"/>',
  citation: '<text x="10" y="30" font-size="26" font-weight="700">“</text><rect x="22" y="18" width="34" height="3.5" rx="1.7"/><rect x="22" y="25" width="28" height="3.5" rx="1.7"/><rect x="22" y="36" width="16" height="2.5" rx="1.2" opacity=".6"/>',
  appel: '<rect x="14" y="12" width="36" height="5" rx="2.5"/><rect x="18" y="22" width="28" height="2.5" rx="1.2"/><rect x="12" y="32" width="18" height="7" rx="3.5"/><rect x="34" y="32" width="18" height="7" rx="3.5" opacity=".45"/>',
  questions: '<rect x="8" y="10" width="26" height="3.5" rx="1.7"/><rect x="8" y="16" width="40" height="2.5" rx="1.2" opacity=".5"/><rect x="8" y="24" width="22" height="3.5" rx="1.7"/><rect x="8" y="30" width="44" height="2.5" rx="1.2" opacity=".5"/><rect x="8" y="38" width="28" height="3.5" rx="1.7"/><rect x="8" y="44" width="36" height="2.5" rx="1.2" opacity=".5"/>',
  photo: '<rect x="6" y="8" width="56" height="32" rx="4" opacity=".45"/><rect x="6" y="44" width="30" height="2.5" rx="1.2"/>',
};
/** Choisir un modèle de section, ajoutée après « apres ». */
function feuilleAjout(apres: string) {
  const cartes = Object.entries(GABARITS).map(([cle, g]) => {
    const x = h('button', { type: 'button', class: 'ed-gabarit' }) as HTMLButtonElement;
    x.innerHTML = `<svg viewBox="0 0 68 54" aria-hidden="true">${ICONES_GABARITS[cle] ?? ''}</svg>`;
    x.append(h('strong', {}, g.nom), h('span', {}, g.aide));
    x.addEventListener('click', () => { fermerFeuille(); ajouter(cle, apres); });
    return x;
  });
  feuille('Ajouter une section', [h('p', { class: 'ed-note' }, 'Elle aura le même style que le reste du site. Touchez ensuite ses textes et sa photo pour les remplacer.'),
    h('div', { class: 'ed-gabarits' }, cartes)], [btn('Annuler', 'ed-b secondaire', fermerFeuille)]);
}
function ajouter(cle: string, apres: string) {
  const de = `${PREFIXE}${cle}`, id = `${de}~${Math.random().toString(36).slice(2, 7)}`;
  changer(() => {
    const sd = sDoc();
    (sd.copies ??= []).push({ id, de });
    const o = ordreActuel().filter((x) => x !== id);
    o.splice(o.indexOf(apres) + 1, 0, id);
    sd.ordre = o;
  });
  toast('Section ajoutée : touchez ses textes pour les remplacer.');
  requestAnimationFrame(() => { const b = blocParId(id); if (!b) return; b.scrollIntoView({ block: 'start', behavior: 'smooth' }); b.classList.add('ed-nouvelle'); setTimeout(() => b.classList.remove('ed-nouvelle'), 1600); });
}
/** Textes et photos d'exemple encore présents dans les sections ajoutées. */
function exemplesRestants() {
  let n = 0;
  for (const c of reperer()) {
    if (c.portee !== 'page' || !c.el.closest(`[data-bloc-copie^="${PREFIXE}"]`) || c.el.closest('[data-e-suppr]')) continue;
    if ((c.type === 't' && travail.page.t![c.cle] === undefined) || (c.type === 'i' && !travail.page.i![c.cle]?.src && !travail.page.i![c.cle]?.cache)) n++;
  }
  return n;
}

// ── Listes : réorganiser les éléments (cartes, points forts, équipe, partenaires…)
let listeActive: string | null = null;
const cleListe = (l: HTMLElement) => l.dataset.eListe ?? `bd:${l.dataset.eBd}`;
const listeParCle = (cle: string) => document.querySelector<HTMLElement>(cle.startsWith('bd:') ? `[data-e-bd="${CSS.escape(cle.slice(3))}"]` : `[data-e-liste="${CSS.escape(cle)}"]`);
const idItem = (li: HTMLElement) => li.dataset.eItem ?? li.dataset.id ?? '';
const listesDuBloc = (b: HTMLElement) => [...b.querySelectorAll<HTMLElement>('[data-e-liste], [data-e-bd]')].filter((l) => itemsListe(l).filter((li) => idItem(li)).length >= 2);
const confListe = (l: HTMLElement): DocListe => ((travail.page.li ??= {})[l.dataset.eListe!] ??= {});

function poigneesListes(blocId: string): HTMLElement[] {
  const b = blocParId(blocId); if (!b) { listeActive = null; return []; }
  const sortie: HTMLElement[] = [];
  for (const l of listesDuBloc(b)) {
    const cle = cleListe(l), items = itemsListe(l).filter((li) => idItem(li) && li.offsetParent !== null);
    l.classList.add('ed-liste-active');
    for (const li of items) {
      const r = li.getBoundingClientRect();
      const x = h('button', { type: 'button', class: 'ed-item', 'data-liste': cle, 'data-id': idItem(li), 'aria-label': 'Déplacer ou modifier cet élément', style: `top:${Math.round(r.top + scrollY - 14)}px;left:${Math.round(Math.min(r.right + scrollX - 28, document.documentElement.clientWidth - 46))}px` });
      x.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>';
      sortie.push(x);
    }
    if (l.dataset.eListe && items.length) {
      const r = l.getBoundingClientRect();
      sortie.push(h('button', { type: 'button', class: 'ed-plus-item', 'data-liste': cle, style: `top:${Math.round(r.bottom + scrollY + 6)}px;left:${Math.round(r.left + scrollX)}px` }, h('span', { 'aria-hidden': 'true' }, '+'), 'Ajouter un élément'));
    }
  }
  if (!document.querySelector('.ed-fin-listes')) ui().append(h('button', { type: 'button', class: 'ed-fin-listes', onclick: () => { listeActive = null; placerPoignees(); } }, '✓ Terminé'));
  document.querySelectorAll('.ed-liste-active').forEach((l) => { if (!b.contains(l)) l.classList.remove('ed-liste-active'); });
  return sortie;
}
function deplacerItem(l: HTMLElement, id: string, vers: number) {
  changer(() => {
    const ids = itemsListe(l).map(idItem).filter(Boolean);
    const de = ids.indexOf(id); if (de < 0) return;
    ids.splice(de, 1); ids.splice(Math.max(0, Math.min(vers, ids.length)), 0, id);
    if (l.dataset.eBd) (travail.page.bd ??= {})[l.dataset.eBd as ListeBd] = ids;
    else confListe(l).ordre = ids;
  });
}
function glisserItem(e: PointerEvent) {
  const p = (e.target as Element).closest<HTMLElement>('.ed-item')!;
  const l = listeParCle(p.dataset.liste!); if (!l) return;
  e.preventDefault();
  const id = p.dataset.id!, x0 = e.clientX, y0 = e.clientY;
  let actifG = false, cible: HTMLElement | null = null;
  const source = itemsListe(l).find((li) => idItem(li) === id);
  const minuterie = window.setTimeout(() => { actifG = true; navigator.vibrate?.(15); p.classList.add('saisie'); source?.classList.add('ed-deplace'); }, 200);
  const bouger = (ev: PointerEvent) => {
    if (!actifG) { if (Math.hypot(ev.clientX - x0, ev.clientY - y0) > 8) { clearTimeout(minuterie); fin(true); } return; }
    p.style.translate = `${ev.clientX - x0}px ${ev.clientY - y0}px`;
    let best = Infinity; cible = null;
    for (const li of itemsListe(l).filter((x) => idItem(x) && x.offsetParent !== null)) {
      const r = li.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - ev.clientX, r.top + r.height / 2 - ev.clientY);
      if (d < best) { best = d; cible = li; }
    }
    itemsListe(l).forEach((li) => li.classList.toggle('ed-cible-item', li === cible && li !== source));
  };
  const fin = (abandon = false) => {
    clearTimeout(minuterie);
    removeEventListener('pointermove', bouger); removeEventListener('pointerup', ok); removeEventListener('pointercancel', non);
    p.classList.remove('saisie'); p.style.translate = ''; source?.classList.remove('ed-deplace');
    itemsListe(l).forEach((li) => li.classList.remove('ed-cible-item'));
    if (abandon || !actifG) return;
    finGlisser = Date.now();
    if (cible && cible !== source) deplacerItem(l, id, itemsListe(l).map(idItem).filter(Boolean).indexOf(idItem(cible)));
  };
  const ok = () => fin(), non = () => fin(true);
  addEventListener('pointermove', bouger); addEventListener('pointerup', ok); addEventListener('pointercancel', non);
}
function feuilleItem(l: HTMLElement, li: HTMLElement) {
  const ids = itemsListe(l).map(idItem).filter(Boolean), id = idItem(li), rang = ids.indexOf(id);
  const bd = l.dataset.eBd as ListeBd | undefined;
  const masque = !bd && !!confListe(l).cache?.includes(id);
  const estCopie = !!li.dataset.eItemCopie;
  const action = (txt: string, icone: string, f: () => void, inactif = false, classe = '') => {
    const x = h('button', { type: 'button', class: `ed-action ${classe}`, disabled: inactif }) as HTMLButtonElement;
    x.innerHTML = `<span aria-hidden="true">${icone}</span>`; x.append(txt);
    x.addEventListener('click', () => { fermerFeuille(); f(); }); return x;
  };
  const nom = li.querySelector('h3, summary, .nom, strong, p')?.textContent?.trim().slice(0, 40) || li.querySelector('img')?.getAttribute('alt') || `Élément ${rang + 1}`;
  const actions = [action('Avant', '←', () => deplacerItem(l, id, rang - 1), rang <= 0), action('Après', '→', () => deplacerItem(l, id, rang + 1), rang >= ids.length - 1)];
  if (!bd) actions.push(
    action('Dupliquer', '⧉', () => dupliquerItem(l, li)),
    action(masque ? 'Afficher' : 'Masquer', masque ? '◉' : '◌', () => changer(() => { const c = confListe(l); c.cache = masque ? (c.cache ?? []).filter((x) => x !== id) : [...(c.cache ?? []), id]; })),
    ...(estCopie ? [action('Supprimer', '✕', () => supprimerItem(l, li), false, 'danger')] : []));
  const lienBd = bd ? h('p', { class: 'ed-note' }, 'Ce nouvel ordre sera enregistré à la publication. Pour ajouter, modifier ou retirer ',
    bd === 'equipe' ? 'un membre du bureau' : 'un partenaire', ', utilisez ', h('a', { href: `${base}/bureau/contenus/#${bd === 'equipe' ? 'bureau-equipe' : 'partenaires'}` }, 'le tableau de bord'), '.') : null;
  feuille(nom, [h('p', { class: 'ed-note' }, `Élément ${rang + 1} sur ${ids.length}${estCopie ? ' · copie' : ''}.`), h('div', { class: 'ed-actions' }, actions), lienBd,
    !bd && !estCopie ? h('p', { class: 'ed-note' }, 'Un élément d’origine peut être masqué ; une copie peut être supprimée.') : null], [btn('Fermer', 'ed-b', fermerFeuille)]);
}
function dupliquerItem(l: HTMLElement, li: HTMLElement) {
  const de = li.dataset.eItemCopie ?? li.dataset.eItem!, id = `c${Math.random().toString(36).slice(2, 7)}`;
  const avant = reperer().filter((c) => li.contains(c.el));
  changer(() => {
    const c = confListe(l);
    (c.copies ??= []).push({ id, de });
    const ids = itemsListe(l).map(idItem); ids.splice(ids.indexOf(idItem(li)) + 1, 0, id); c.ordre = ids;
  });
  // la copie reprend les textes, boutons et images déjà modifiés
  const nouveau = itemsListe(l).find((x) => x.dataset.eItem === id);
  const apres = nouveau ? reperer().filter((c) => nouveau.contains(c.el)) : [];
  avant.forEach((src, k) => {
    const dst = apres[k]; if (!dst || dst.type !== src.type) return;
    const v = (travail.page[src.type] as Record<string, unknown>)[src.cle];
    if (v !== undefined) (travail.page[dst.type] as Record<string, unknown>)[dst.cle] = copie(v);
  });
  rafraichir();
  toast('Élément ajouté : touchez ses textes pour les modifier.');
}
function supprimerItem(l: HTMLElement, li: HTMLElement) {
  const id = li.dataset.eItem!;
  const cles = reperer().filter((c) => li.contains(c.el)).map((c) => [c.type, c.cle] as const);
  changer(() => {
    const c = confListe(l);
    c.copies = (c.copies ?? []).filter((x) => x.id !== id);
    c.ordre = (c.ordre ?? []).filter((x) => x !== id);
    c.cache = (c.cache ?? []).filter((x) => x !== id);
    for (const [t, k] of cles) delete (travail.page[t] as Record<string, unknown>)[k];
  });
}

function dupliquer(id: string) {
  const de = id.split('~')[0];
  const nouveau = `${de}~${Math.random().toString(36).slice(2, 7)}`;
  changer(() => {
    const sd = sDoc();
    (sd.copies ??= []).push({ id: nouveau, de });
    const o = ordreActuel(); o.splice(o.indexOf(id) + 1, 0, nouveau); sd.ordre = o;
    // la copie reprend les textes, boutons et images déjà modifiés de la section copiée
    const suffSrc = id.includes('~') ? id.slice(id.indexOf('~')) : '';
    const suff = nouveau.slice(nouveau.indexOf('~'));
    for (const k of ['t', 'l', 'i'] as const) {
      const r = (travail.page[k] ?? {}) as Record<string, unknown>;
      for (const [cle, v] of Object.entries(r)) {
        const [zone, rest] = [cle.slice(0, cle.lastIndexOf('/')), cle.slice(cle.lastIndexOf('/'))];
        const z0 = suffSrc ? (zone.endsWith(suffSrc) ? zone.slice(0, -suffSrc.length) : null) : zone;
        if (z0 === null || !appartient(z0, de)) continue;
        if (!suffSrc && zone.includes('~')) continue;
        r[`${z0}${suff}${rest}`] = copie(v);
      }
    }
  });
  // Les textes repris de « Textes du club » sont enregistrés dans la copie (identiques pour tous les visiteurs).
  for (const c of reperer()) {
    if (c.type === 't' && c.el.closest(`[data-bloc="${CSS.escape(nouveau)}"]`) && c.el.closest('[data-e-ex-c]') && travail.page.t![c.cle] === undefined) travail.page.t![c.cle] = nettoyer(c.el.innerHTML);
  }
  rafraichir();
  toast('Section dupliquée : la copie est juste en dessous.');
  requestAnimationFrame(() => blocParId(nouveau)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
}
/** La zone (data-section) appartient-elle à la section d'origine « de » ? */
function appartient(zone: string, de: string) {
  if (zone === de) return true;
  const modele = blocParId(de);
  return !!modele?.querySelector(`[data-section="${CSS.escape(zone)}"]`);
}

function supprimer(id: string) {
  const b = blocParId(id); if (!b) return;
  if (b.dataset.blocCopie) {
    if (!confirm('Supprimer cette copie de section ?')) return;
    const suff = id.slice(id.indexOf('~'));
    changer(() => {
      const sd = sDoc();
      sd.copies = (sd.copies ?? []).filter((c) => c.id !== id);
      sd.ordre = (sd.ordre ?? []).filter((x) => x !== id);
      sd.cache = retirer(sd.cache, id);
      for (const k of ['fond', 'espace', 'align'] as const) delete sd[k]?.[id];
      for (const k of ['t', 'l', 'i'] as const) for (const cle of Object.keys(travail.page[k] ?? {})) if (cle.slice(0, cle.lastIndexOf('/')).endsWith(suff)) delete (travail.page[k] as Record<string, unknown>)[cle];
    });
  } else {
    if (!confirm('Supprimer cette section de la page ? Vous pourrez la récupérer dans « Pages → Sections supprimées ».')) return;
    changer(() => { const sd = sDoc(); sd.suppr = [...retirer(sd.suppr, id), id]; });
  }
  toast('Section supprimée. « Annuler » la remet tout de suite.');
}

/** Nombre d'éléments différents entre deux documents. */
function ecarts(a: Doc, b: Doc) {
  let n = 0;
  for (const k of ['s', 'li', 'bd'] as const) if (JSON.stringify(a[k] ?? {}) !== JSON.stringify(b[k] ?? {})) n++;
  for (const k of ['t', 'l', 'i'] as const) {
    const x = (a[k] ?? {}) as Record<string, unknown>, y = (b[k] ?? {}) as Record<string, unknown>;
    for (const cle of new Set([...Object.keys(x), ...Object.keys(y)])) if (JSON.stringify(x[cle]) !== JSON.stringify(y[cle])) n++;
  }
  return n;
}

// ── Barre d'outils flottante
let ui_: HTMLElement | null = null;
function ui() { return (ui_ ??= document.body.appendChild(h('div', { id: 'edition-ui' }))); }
const ICONES: Record<string, string> = {
  annuler: '<path d="M9 7L4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2"/>', retablir: '<path d="M15 7l5 5-5 5M20 12H9a5 5 0 0 0 0 10h2"/>',
  apercu: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  brouillon: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>', publier: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  historique: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>', pages: '<path d="M4 6h16M4 12h16M4 18h10"/>', quitter: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const icone = (n: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n]}</svg>`;
function bouton(nom: string, label: string, f: () => void, classe = '') {
  const b = h('button', { type: 'button', class: `ed-outil ${classe}`, id: `ed-${nom}`, 'aria-label': label, title: label }) as HTMLButtonElement;
  b.innerHTML = `${icone(nom)}<span>${label}</span>`; b.addEventListener('click', f); return b;
}
function barre() {
  ui().append(
    h('div', { class: 'ed-bandeau', id: 'ed-bandeau' }, h('span', { class: 'ed-pastille' }, 'Mode édition'), h('span', { id: 'ed-etat' }, ''),
      h('span', { class: 'ed-astuce' }, 'Touchez un texte, une image ou un bouton.'),
      h('button', { type: 'button', class: 'ed-guide', onclick: guide, 'aria-label': 'Guide d’édition (vidéo)' }, h('span', { 'aria-hidden': 'true' }, '?'), 'Guide')),
    h('div', { class: 'ed-barre', role: 'toolbar', 'aria-label': 'Outils du mode édition' },
      bouton('quitter', 'Quitter', quitter), bouton('annuler', 'Annuler', annuler), bouton('retablir', 'Rétablir', retablir),
      bouton('apercu', 'Aperçu', apercu), bouton('pages', 'Pages', feuillePages), bouton('historique', 'Versions', feuilleHistorique),
      bouton('brouillon', 'Sauver', () => enregistrer()), bouton('publier', 'Publier', feuillePublier, 'principal')),
    h('button', { type: 'button', class: 'ed-sortir-apercu', id: 'ed-sortir-apercu', onclick: apercu }, '← Retour à l’édition'));
}
function majEtat() {
  (document.getElementById('ed-annuler') as HTMLButtonElement).disabled = !passe.length;
  (document.getElementById('ed-retablir') as HTMLButtonElement).disabled = !futur.length;
  document.getElementById('ed-etat')!.textContent = modifie() ? '• Modifications non enregistrées' : differentDuPublie() ? '• Brouillon enregistré, pas encore publié' : '• À jour avec le site publié';
  (document.getElementById('ed-publier') as HTMLButtonElement).disabled = !differentDuPublie();
}
function apercu() {
  finirTexte(); fermerFeuille();
  const on = document.documentElement.classList.toggle('ed-apercu');
  if (on) document.querySelectorAll('[data-ed-masque]').forEach((x) => x.setAttribute('data-masquee', ''));
  else marquer();
}

async function enregistrer(silencieux = false) {
  finirTexte();
  const lignes = [] as { page: string; contenu: Doc; updated_at: string }[];
  const maintenant = new Date().toISOString();
  if (JSON.stringify(travail.page) !== JSON.stringify(enregistre.page)) lignes.push({ page, contenu: travail.page, updated_at: maintenant });
  if (JSON.stringify(travail.global) !== JSON.stringify(enregistre.global)) lignes.push({ page: '*', contenu: travail.global, updated_at: maintenant });
  if (!lignes.length) { if (!silencieux) toast('Aucune modification à enregistrer.'); return true; }
  const { error } = await sb.from('site_brouillons').upsert(lignes);
  if (error) { toast(messageErreur(error), 'erreur'); return false; }
  enregistre = copie(travail); majEtat();
  if (!silencieux) toast('Brouillon enregistré : visible seulement par les administrateurs.');
  return true;
}

function feuillePublier() {
  finirTexte();
  const note = h('input', { maxlength: 300, placeholder: 'Ex. : nouveau texte d’accueil' }) as HTMLInputElement;
  const total = ecarts(travail.page, publie.page) + ecarts(travail.global, publie.global);
  const exemples = exemplesRestants();
  feuille('Publier', [h('p', {}, `${total} modification(s) seront visibles par tous les visiteurs, immédiatement.`),
    exemples ? h('p', { class: 'ed-alerte' }, `Attention : ${exemples} texte(s) ou photo(s) d’exemple n’ont pas encore été remplacés dans les sections ajoutées. Ils seront visibles tels quels.`) : null,
    champ('Note pour l’historique (facultatif)', note)], [
    btn('Annuler', 'ed-b secondaire', fermerFeuille),
    btn('Publier maintenant', 'ed-b', async () => {
      fermerFeuille();
      const portees: [string, Doc, Doc][] = [[page, travail.page, publie.page], ['*', travail.global, publie.global]];
      // Ordre de l'équipe et des partenaires : enregistré directement dans la base.
      const TABLES: Record<ListeBd, string> = { equipe: 'bureau_membres', partenaires: 'partenaires' };
      for (const [nom, ordre] of Object.entries(travail.page.bd ?? {}) as [ListeBd, string[]][]) {
        const res = await Promise.all(ordre.map((id, i) => sb.from(TABLES[nom]).update({ ordre: (i + 1) * 10 }).eq('id', id)));
        const err = res.find((r) => r.error)?.error;
        if (err) { toast(messageErreur(err), 'erreur'); return; }
      }
      delete travail.page.bd; delete publie.page.bd;
      for (const [p, d, avant] of portees) {
        const sansBd = { ...d }; delete sansBd.bd;
        if (JSON.stringify(sansBd) === JSON.stringify(avant)) continue;
        const { error } = await sb.rpc('publier_page', { p_page: p, p_contenu: sansBd, p_note: note.value.trim() });
        if (error) { toast(messageErreur(error), 'erreur'); return; }
      }
      publie = copie(travail); enregistre = copie(travail); majEtat();
      if (enregistre.page) await sb.from('site_brouillons').delete().eq('page', page).then(() => undefined, () => undefined);
      try { localStorage.removeItem('2ameca-edition-publie'); } catch { /* ignore */ }
      toast('Publié : les visiteurs voient maintenant la nouvelle version.');
    }),
  ]);
}

async function feuilleHistorique() {
  finirTexte();
  const { data, error } = await sb.from('site_versions').select('id, page, contenu, note, created_at, profiles(prenom, nom)').in('page', [page, '*']).order('created_at', { ascending: false }).limit(40);
  if (error) { toast(messageErreur(error), 'erreur'); return; }
  const quand = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca' });
  const lignes = (data ?? []).map((v) => {
    const qui = (v.profiles as unknown as { prenom: string; nom: string } | null);
    return h('li', { class: 'ed-version' },
      h('div', {}, h('strong', {}, quand.format(new Date(v.created_at))), h('span', {}, `${v.page === '*' ? 'Éléments communs' : 'Cette page'}${qui ? ` · ${qui.prenom} ${qui.nom}` : ''}`), v.note ? h('em', {}, v.note) : null),
      btn('Restaurer', 'ed-b secondaire petit', () => {
        fermerFeuille();
        changer(() => { if (v.page === '*') travail.global = normal(v.contenu as Doc); else travail.page = normal(v.contenu as Doc); });
        toast('Version chargée dans le brouillon : publiez pour la remettre en ligne.');
      }));
  });
  feuille('Historique des publications', [
    lignes.length ? h('ul', { class: 'ed-versions' }, lignes) : h('p', {}, 'Aucune publication pour l’instant.'),
    h('p', { class: 'ed-note' }, 'Restaurer charge la version dans votre brouillon ; rien ne change pour les visiteurs avant « Publier ».'),
  ], [btn('Tout revenir à l’original du site', 'ed-b secondaire', () => { fermerFeuille(); changer(() => { travail = { page: vide(), global: travail.global }; }); }), btn('Fermer', 'ed-b', fermerFeuille)]);
}

const guide = () => { finirTexte(); fermerFeuille(); import('./guide').then((m) => m.ouvrirGuide()); };

function feuillePages() {
  const supprimees = (sDoc().suppr ?? []).filter((id) => blocParId(id));
  const corbeille = supprimees.length ? [
    h('h3', { class: 'ed-sous-titre' }, 'Sections supprimées de cette page'),
    h('ul', { class: 'ed-pages' }, supprimees.map((id) => h('li', { class: 'ed-corbeille' }, h('span', {}, nomSection(blocParId(id)!)),
      btn('Remettre', 'ed-b secondaire petit', () => { fermerFeuille(); changer(() => { const sd = sDoc(); sd.suppr = retirer(sd.suppr, id); }); toast('Section remise en place.'); })))),
  ] : [];
  feuille('Pages', [btn('▶  Guide d’édition en vidéo (5 min)', 'ed-lien-page ed-lien-guide', guide), ...corbeille, h('h3', { class: 'ed-sous-titre' }, 'Modifier une autre page'), h('ul', { class: 'ed-pages' }, PAGES.map(([p, n]) => h('li', {}, btn(n + (p === page ? ' (cette page)' : ''), 'ed-lien-page', async () => {
    if (p === page) { fermerFeuille(); return; }
    if (modifie() && !(await enregistrer(true))) return;
    removeEventListener('beforeunload', avantDepart);
    location.href = base + p;
  }))))], [btn('Fermer', 'ed-b', fermerFeuille)]);
}

// ── Styles de l'éditeur (injectés seulement en mode édition)
function styles() {
  if (document.getElementById('edition-styles')) return;
  const css = `
  .mode-edition:not(.ed-apercu) [data-ed] { outline: 1.5px dashed rgb(10 74 122 / .45); outline-offset: 3px; cursor: pointer; border-radius: 3px; transition: outline-color .15s, background-color .15s; }
  .mode-edition:not(.ed-apercu) .sombre [data-ed], .mode-edition:not(.ed-apercu) .tres-sombre [data-ed], .mode-edition:not(.ed-apercu) header.entete [data-ed], .mode-edition:not(.ed-apercu) footer.pied [data-ed] { outline-color: rgb(159 208 245 / .55); }
  .mode-edition:not(.ed-apercu) [data-ed]:hover, .mode-edition:not(.ed-apercu) [data-ed]:focus { outline: 2px solid #9FD0F5; background-color: rgb(159 208 245 / .12); }
  .mode-edition:not(.ed-apercu) [data-ed-change] { outline-style: solid; outline-color: #0A4A7A; }
  .mode-edition:not(.ed-apercu) [data-ed-masque] { opacity: .35; filter: grayscale(1); }
  .mode-edition [contenteditable="true"] { outline: 2.5px solid #0A4A7A !important; outline-offset: 4px; background-color: rgb(255 255 255 / .08); cursor: text; }
  .mode-edition .reveal { opacity: 1 !important; transform: none !important; }
  .mode-edition .zone-modifier { display: none; }
  html.mode-edition { scroll-padding-top: calc(var(--header-h) + 52px); }
  .mode-edition body { padding-bottom: 92px; }
  .mode-edition main { margin-top: 38px; }
  .mode-edition.ed-apercu main { margin-top: 0; }
  #edition-ui { font-family: var(--f-texte); color: #2D2D2D; }
  .ed-bandeau { position: fixed; left: 0; right: 0; top: var(--header-h); z-index: 70; display: flex; align-items: center; gap: .7rem; height: 38px; padding: 0 var(--gouttiere); white-space: nowrap; overflow: hidden; background: #04223A; color: #fff; font-size: .82rem; border-bottom: 1px solid rgb(159 208 245 / .3); }
  .ed-pastille { font-family: var(--f-label); letter-spacing: .14em; text-transform: uppercase; font-size: .7rem; padding: .15em .7em; border-radius: 999px; background: #9FD0F5; color: #04223A; }
  .ed-astuce { color: #9FD0F5; }
  .ed-guide { margin-left: auto; display: inline-flex; align-items: center; gap: .35rem; height: 28px; padding: 0 .7rem 0 .3rem; border: 1px solid rgb(159 208 245 / .45); border-radius: 999px; background: transparent; color: #fff; font: 500 .7rem var(--f-label); letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }
  .ed-guide span { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; background: #9FD0F5; color: #04223A; font-weight: 700; letter-spacing: 0; }
  .ed-lien-guide { background: #eef6fc; border-color: #9FD0F5; color: #0A4A7A; }
  @media (max-width: 600px) { .ed-astuce { display: none; } }
  .ed-barre { position: fixed; left: 50%; translate: -50% 0; bottom: max(.6rem, env(safe-area-inset-bottom)); z-index: 80; display: flex; gap: .15rem; padding: .3rem; border-radius: 18px; background: #04223A; box-shadow: 0 14px 40px -10px rgb(4 34 58 / .6); width: max-content; max-width: calc(100vw - 1rem); }
  .ed-outil { display: grid; justify-items: center; gap: 2px; min-width: 56px; min-height: 52px; padding: .4rem .15rem; border: 0; border-radius: 13px; background: transparent; color: #fff; font: 500 .6rem/1 var(--f-label); letter-spacing: .02em; text-transform: uppercase; cursor: pointer; }
  .ed-outil svg { width: 21px; height: 21px; }
  @media (hover: hover) { .ed-outil:hover:not(:disabled) { background: rgb(159 208 245 / .15); } }
  .ed-outil:disabled { opacity: .35; cursor: default; }
  .ed-outil.principal { background: #9FD0F5; color: #04223A; }
  .ed-outil.principal:disabled { background: rgb(159 208 245 / .25); color: #fff; }
  .ed-sortir-apercu { display: none; position: fixed; z-index: 80; left: 50%; translate: -50% 0; bottom: max(1rem, env(safe-area-inset-bottom)); min-height: 48px; padding: 0 1.4em; border: 0; border-radius: 999px; background: #04223A; color: #fff; font: 500 .85rem var(--f-label); letter-spacing: .1em; text-transform: uppercase; box-shadow: 0 10px 30px -8px rgb(4 34 58 / .6); cursor: pointer; }
  .ed-apercu .ed-barre, .ed-apercu .ed-bandeau { display: none; }
  .ed-apercu .ed-sortir-apercu { display: block; }
  .ed-outils-texte { position: fixed; left: 50%; translate: -50% 0; z-index: 85; display: flex; gap: .25rem; padding: .3rem; border-radius: 12px; background: #04223A; box-shadow: 0 10px 30px -8px rgb(4 34 58 / .6); }
  .ed-outils-texte button { min-width: 40px; min-height: 40px; padding: 0 .7rem; border: 0; border-radius: 9px; background: rgb(255 255 255 / .08); color: #fff; font: 600 .9rem var(--f-texte); cursor: pointer; }
  .ed-outils-texte button:last-child { background: #9FD0F5; color: #04223A; }
  .ed-voile { position: fixed; inset: 0; z-index: 90; background: rgb(4 34 58 / .35); }
  .ed-feuille { position: fixed; left: 0; right: 0; bottom: 0; z-index: 95; max-height: 86dvh; display: grid; grid-template-rows: auto 1fr auto; background: #fff; border-radius: 20px 20px 0 0; box-shadow: 0 -10px 40px -10px rgb(4 34 58 / .5); transform: translateY(100%); transition: transform .25s ease; }
  .ed-feuille.ouverte { transform: none; }
  @media (min-width: 720px) { .ed-feuille { left: 50%; right: auto; width: 520px; translate: -50% 0; bottom: 1rem; border-radius: 20px; } }
  .ed-feuille-tete { display: flex; align-items: center; justify-content: space-between; padding: .9rem 1.1rem .5rem; }
  .ed-feuille-tete strong { font: 600 1rem var(--f-label); letter-spacing: .1em; text-transform: uppercase; color: #04223A; }
  .ed-x { width: 40px; height: 40px; border: 0; border-radius: 50%; background: #eef3f7; font-size: 1.4rem; cursor: pointer; }
  .ed-feuille-corps { overflow-y: auto; padding: .3rem 1.1rem 1rem; display: grid; gap: .8rem; align-content: start; }
  .ed-feuille-actions { display: flex; gap: .5rem; justify-content: flex-end; padding: .8rem 1.1rem max(.9rem, env(safe-area-inset-bottom)); border-top: 1px solid #e3ebf2; }
  .ed-champ { display: grid; gap: .3rem; font-size: .85rem; color: #555; }
  .ed-champ input, .ed-feuille select { width: 100%; min-height: 46px; padding: .55rem .75rem; font: 1rem var(--f-texte); color: #2D2D2D; border: 1.5px solid #cbd7e2; border-radius: 10px; background: #fff; }
  .ed-inter { display: flex; align-items: center; gap: .6rem; font-size: .95rem; min-height: 44px; }
  .ed-inter input { width: 22px; height: 22px; accent-color: #0A4A7A; }
  .ed-taille { display: flex; align-items: center; gap: .7rem; } .ed-taille input { flex: 1; min-height: 32px; padding: 0; border: 0; accent-color: #0A4A7A; }
  .ed-apercu-img { width: 100%; max-height: 220px; object-fit: contain; background: #eef3f7; border-radius: 12px; }
  .ed-fichier { display: none; }
  .ed-b { min-height: 46px; padding: 0 1.2em; border: 0; border-radius: 999px; background: #0A4A7A; color: #fff; font: 500 .85rem var(--f-label); letter-spacing: .08em; text-transform: uppercase; cursor: pointer; }
  .ed-b.secondaire { background: #eef3f7; color: #04223A; }
  .ed-b.petit { min-height: 38px; font-size: .75rem; }
  .ed-note { margin: 0; font-size: .82rem; color: #667; }
  .ed-versions, .ed-pages { list-style: none; margin: 0; padding: 0; display: grid; gap: .4rem; }
  .ed-version { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .6rem .2rem; border-bottom: 1px solid #e3ebf2; }
  .ed-version div { display: grid; gap: .1rem; font-size: .85rem; } .ed-version strong { color: #04223A; } .ed-version em { color: #0A4A7A; }
  .ed-lien-page { width: 100%; min-height: 48px; text-align: left; padding: 0 1rem; border: 1px solid #e3ebf2; border-radius: 12px; background: #fff; font: 500 1rem var(--f-label); color: #04223A; cursor: pointer; }
  .ed-lien-page:hover { border-color: #0A4A7A; }
  .ed-sous-titre { margin: .3rem 0 0; font: 600 .78rem var(--f-label); letter-spacing: .14em; text-transform: uppercase; color: #667; }
  .ed-corbeille { display: flex; align-items: center; justify-content: space-between; gap: .6rem; padding: .4rem 0; border-bottom: 1px solid #e3ebf2; font-weight: 500; color: #04223A; }
  /* Ajouter une section */
  .ed-plus { position: absolute; translate: -100% 0; z-index: 3; display: inline-flex; align-items: center; gap: .35rem; height: 34px; padding: 0 .9rem 0 .5rem; border: 1.5px dashed #9FD0F5; border-radius: 999px;
    background: #fff; color: #0A4A7A; font: 600 .66rem var(--f-label); letter-spacing: .12em; text-transform: uppercase; cursor: pointer; box-shadow: 0 6px 18px -8px rgb(4 34 58 / .5); }
  .ed-plus span { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: #0A4A7A; color: #fff; font-size: 1rem; line-height: 1; }
  @media (hover: hover) { .ed-plus:hover { border-style: solid; } }
  .ed-gabarits { display: grid; grid-template-columns: repeat(2, 1fr); gap: .55rem; }
  @media (min-width: 520px) { .ed-gabarits { grid-template-columns: repeat(3, 1fr); } }
  .ed-gabarit { display: grid; gap: .25rem; align-content: start; text-align: left; padding: .6rem .6rem .75rem; border: 1.5px solid #e3ebf2; border-radius: 14px; background: #fff; color: #04223A; font-family: var(--f-texte); cursor: pointer; }
  .ed-gabarit svg { width: 100%; height: auto; aspect-ratio: 68 / 54; border-radius: 9px; background: #eef4f9; fill: #0A4A7A; padding: 4px; margin-bottom: .25rem; }
  .ed-gabarit strong { font: 600 .82rem var(--f-label); letter-spacing: .06em; text-transform: uppercase; }
  .ed-gabarit span { font-size: .74rem; line-height: 1.3; color: #667; }
  @media (hover: hover) { .ed-gabarit:hover { border-color: #0A4A7A; } }
  .ed-alerte { margin: 0; padding: .7rem .85rem; border-radius: 10px; background: #fff4e5; color: #7a4a00; font-size: .88rem; }
  .mode-edition main > .ed-nouvelle { box-shadow: inset 0 0 0 4px #9FD0F5 !important; transition: box-shadow .6s; }
  /* Listes */
  .mode-edition:not(.ed-apercu) .ed-liste-active { outline: 2px dashed #9FD0F5; outline-offset: 8px; border-radius: 6px; }
  .mode-edition .ed-cible-item { outline: 3px solid #9FD0F5 !important; outline-offset: 3px; }
  .ed-item { position: absolute; z-index: 2; display: grid; place-items: center; width: 42px; height: 42px; border: 1.5px solid #9FD0F5; border-radius: 12px; background: #04223A; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; box-shadow: 0 6px 16px -6px rgb(4 34 58 / .6); }
  .ed-item svg { width: 22px; height: 22px; fill: #9FD0F5; }
  .ed-item.saisie { cursor: grabbing; background: #9FD0F5; z-index: 3; } .ed-item.saisie svg { fill: #04223A; }
  .ed-plus-item { position: absolute; z-index: 1; display: inline-flex; align-items: center; gap: .4rem; height: 38px; padding: 0 .9rem 0 .5rem; border: 1.5px dashed #0A4A7A; border-radius: 999px; background: #fff; color: #0A4A7A; font: 600 .7rem var(--f-label); letter-spacing: .1em; text-transform: uppercase; cursor: pointer; }
  .ed-plus-item span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: #0A4A7A; color: #fff; font-size: 1rem; }
  .ed-fin-listes { white-space: nowrap; position: fixed; left: 50%; translate: -50% 0; bottom: calc(max(.6rem, env(safe-area-inset-bottom)) + 70px); z-index: 81; height: 44px; padding: 0 1rem; border: 0; border-radius: 999px; background: #9FD0F5; color: #04223A; font: 600 .7rem var(--f-label); letter-spacing: .1em; text-transform: uppercase; cursor: pointer; box-shadow: 0 6px 16px -6px rgb(4 34 58 / .6); }
  /* Sections */
  .mode-edition:not(.ed-apercu) main > [data-e-cache] { display: block !important; opacity: .4; filter: grayscale(.8); }
  .mode-edition:not(.ed-apercu) main > [data-bloc] { box-shadow: inset 0 -1px 0 rgb(10 74 122 / .25); }
  .mode-edition main > .ed-cible { box-shadow: inset 0 0 0 3px #9FD0F5 !important; }
  .mode-edition main > .ed-deplace { opacity: .55; }
  .ed-poignees { position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 65; }
  .ed-apercu .ed-poignees, .ed-apercu .ed-fin-listes { display: none; }
  .ed-poignee { position: absolute; left: 6px; display: inline-flex; align-items: center; gap: .35rem; max-width: calc(100vw - 150px); min-height: 34px; padding: 0 .7rem 0 .35rem; border: 1px solid rgb(159 208 245 / .5); border-radius: 999px;
    background: rgb(4 34 58 / .9); color: #fff; font: 500 .68rem var(--f-label); letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; cursor: grab; touch-action: none; user-select: none; -webkit-user-select: none; backdrop-filter: blur(4px); }
  .ed-poignee span { overflow: hidden; text-overflow: ellipsis; }
  .ed-poignee svg { width: 22px; height: 22px; fill: #9FD0F5; flex-shrink: 0; }
  .ed-poignee.saisie { cursor: grabbing; background: #9FD0F5; color: #04223A; box-shadow: 0 12px 30px -8px rgb(4 34 58 / .6); z-index: 2; }
  .ed-poignee.saisie svg { fill: #04223A; }
  .ed-repere { position: absolute; left: 0; width: 100%; height: 4px; z-index: 66; background: #9FD0F5; box-shadow: 0 0 0 2px #04223A; border-radius: 2px; pointer-events: none; }
  .ed-actions { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: .45rem; }
  .ed-action { display: grid; justify-items: center; gap: .2rem; min-height: 64px; padding: .5rem .3rem; border: 1px solid #e3ebf2; border-radius: 14px; background: #f6f9fc; color: #04223A; font: 500 .74rem var(--f-label); letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
  .ed-action span { font-size: 1.25rem; line-height: 1; }
  .ed-action:disabled { opacity: .35; cursor: default; }
  .ed-action.danger { color: #a8322d; }
  .ed-choix { border: 0; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .4rem; }
  .ed-choix legend { width: 100%; margin-bottom: .35rem; font-size: .85rem; color: #555; }
  .ed-opt { min-height: 42px; padding: 0 .95rem; border: 1.5px solid #cbd7e2; border-radius: 999px; background: #fff; color: #04223A; font: 500 .85rem var(--f-texte); cursor: pointer; }
  .ed-opt.choisi { border-color: #0A4A7A; box-shadow: inset 0 0 0 1.5px #0A4A7A; font-weight: 600; }
  .ed-opt.fond-teinte { background: #e8f1f8; } .ed-opt.fond-sombre { background: #0A4A7A; color: #fff; } .ed-opt.fond-tres-sombre { background: #04223A; color: #fff; }
  .ed-opt.fond-sombre.choisi, .ed-opt.fond-tres-sombre.choisi { box-shadow: inset 0 0 0 2px #9FD0F5; border-color: #9FD0F5; }
  @media (max-width: 600px) { .ed-barre { width: calc(100vw - 1rem); gap: 0; } .ed-outil { flex: 1 1 0; min-width: 0; } }
  `;
  document.head.append(Object.assign(document.createElement('style'), { id: 'edition-styles', textContent: css }));
}
