/**
 * Petites icônes au trait (style « dessin technique » du site) associées aux rôles du bureau.
 * Elles tournent autour de la photo quand on touche la carte d'un membre.
 */

const I: Record<string, string> = {
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M8 10.5V17M8 7.2v.1M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17"/>',
  coeur: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/>',
  bulle: '<path d="M4 5.5h16v10.5H10l-6 4z"/><path d="M8.5 10.8h.1M12 10.8h.1M15.5 10.8h.1"/>',
  partage: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8"/>',
  appareil: '<path d="M3.5 8h3.5l2-3h6l2 3h3.5v11.5h-17z"/><circle cx="12" cy="13.3" r="3.6"/>',
  lecture: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  megaphone: '<path d="M3.5 10v4h3.5l8.5 5V5L7 10z"/><path d="M18.5 9a4.2 4.2 0 0 1 0 6"/>',
  micro: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  etoile: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  drapeau: '<path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11"/>',
  mains: '<path d="M3 11.5l3.5-3.5 4 2.5 2.5-2 4.5 1 3.5 3.5"/><path d="M6.5 13.5l3.5 3.5 2.5-.5 2-1.5 2-2M10 17l1.5-1.5M13 16.5l1.3-1.3"/>',
  cible: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  calendrier: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M8.5 14h.1M12 14h.1M15.5 14h.1"/>',
  liste: '<rect x="5" y="4.5" width="14" height="16.5" rx="2"/><path d="M9 4.5h6v3H9zM9 14l2 2 4-4.5"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  coche: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.3l2.8 2.8L16 9.5"/>',
  ampoule: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  ordinateur: '<rect x="5" y="5" width="14" height="10" rx="1.2"/><path d="M3 19h18"/>',
  regle: '<path d="M3.5 16.5L16.5 3.5l4 4-13 13z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  puce: '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 3.5V7M14 3.5V7M10 17v3.5M14 17v3.5M3.5 10H7M3.5 14H7M17 10h3.5M17 14h3.5"/>',
  stylo: '<path d="M4 20l4.2-1 11-11-3.2-3.2-11 11z"/><path d="M14 6.8l3.2 3.2"/>',
  document: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  enveloppe: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  dossier: '<path d="M3 6.5h6l2 2h10V19H3z"/>',
  ballon: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.8 2.8-1.4 4.4H9.6l-1.4-4.4z"/><path d="M12 3.5v4M15.8 10.3l4.2-1.3M14.4 14.7l2.5 3.6M9.6 14.7l-2.5 3.6M8.2 10.3L4 9"/>',
  musique: '<path d="M9 18V5.5l10.5-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17" cy="16.5" r="2.5"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 1.9-.9 1.9-1.8s-.9-1.4-.9-2.3.8-1.7 1.8-1.7h1.7a4 4 0 0 0 4-4C20.5 6.6 16.7 3.5 12 3.5z"/><circle cx="7.5" cy="12" r="1"/><circle cx="9.5" cy="7.8" r="1"/><circle cx="14.5" cy="7.8" r="1"/>',
  trophee: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20.5h6M10 17h4"/>',
  badge: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10.8" r="2"/><path d="M6 16a3 3 0 0 1 6 0M14.5 10h4M14.5 14h4"/>',
  ajout: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
  pinceau: '<path d="M14 4.5l5.5 5.5-7.5 7.5L6.5 12z"/><path d="M6.5 12L3.5 18.5l6.5-3"/>',
  formes: '<circle cx="8" cy="8" r="4.5"/><rect x="12" y="12" width="8.5" height="8.5" rx="1"/><path d="M15.5 3.5l4 6.5h-8z"/>',
};

const ROLES: [RegExp, string[]][] = [
  [/r[ée]seaux|social/i, ['instagram', 'linkedin', 'coeur', 'bulle', 'partage']],
  [/design/i, ['palette', 'pinceau', 'stylo', 'formes']],
  [/m[ée]dia|communication|photo|vid[ée]o/i, ['appareil', 'lecture', 'megaphone', 'micro', 'image']],
  [/pr[ée]sid/i, ['etoile', 'drapeau', 'mains', 'cible']],
  [/organisation|logistique/i, ['calendrier', 'liste', 'horloge', 'coche']],
  [/atelier|technique|formation/i, ['regle', 'ordinateur', 'ampoule', 'puce']],
  [/secr[ée]tariat|secr[ée]taire/i, ['stylo', 'document', 'enveloppe', 'dossier']],
  [/parascolaire|activit[ée]s|sport|culture/i, ['ballon', 'musique', 'palette', 'trophee']],
  [/inscription|adh[ée]sion|membres/i, ['badge', 'ajout', 'liste', 'coche']],
  [/tr[ée]sor|finance/i, ['liste', 'document', 'cible', 'coche']],
];

/** Icônes (SVG) correspondant à un rôle, en texte HTML sûr (aucune donnée du rôle n'y est insérée). */
export function iconesDuRole(role: string): string[] {
  const noms = ROLES.find(([re]) => re.test(role))?.[1] ?? ['etoile', 'ampoule', 'mains', 'coche'];
  return noms.map((n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${I[n]}</svg>`);
}
