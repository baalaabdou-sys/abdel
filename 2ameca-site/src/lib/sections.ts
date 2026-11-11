/**
 * Sections des pages publiques que le bureau contrôle (Contenus du site → Sections) :
 * afficher / masquer, changer l'ordre, renommer le titre.
 */
export interface ItemSection { cle: string; nom: string; titre?: string; aide?: string }
export const SECTIONS: { page: string; lien: string; deplacable: boolean; items: ItemSection[] }[] = [
  { page: 'Accueil', lien: '/', deplacable: false, items: [
    { cle: 'accueil-club', nom: 'Le club en bref', titre: 'De l’amphi à l’atelier', aide: 'présentation, points forts et vidéo' },
    { cle: 'accueil-piliers', nom: 'Points forts (Projets, Ateliers, Rencontres)' },
    { cle: 'accueil-video', nom: 'Vidéo du logo' },
  ] },
  { page: 'Le club', lien: '/le-club/', deplacable: true, items: [
    { cle: 'club-presentation', nom: 'Présentation', titre: 'Atelier d’Application Mécanique et Esprit au Citoyen' },
    { cle: 'club-histoire', nom: 'Histoire', titre: 'D’où vient 2AMECA' },
    { cle: 'club-mission', nom: 'Mission', titre: 'Relier la théorie, la pratique et le monde professionnel' },
    { cle: 'club-valeurs', nom: 'Valeurs', titre: 'Ce qui nous guide' },
    { cle: 'club-equipe', nom: 'L’équipe (bureau)', titre: 'L’équipe' },
    { cle: 'club-partenaires', nom: 'Partenaires', titre: 'Nos partenaires' },
    { cle: 'club-faculte', nom: 'Notre faculté', titre: 'Faculté des Sciences Aïn Chock' },
  ] },
  { page: 'Toutes les pages', lien: '/', deplacable: false, items: [
    { cle: 'bandeau-rejoindre', nom: 'Bandeau « Rejoindre » en bas des pages', titre: 'Rejoignez l’atelier' },
  ] },
];

/** Réglage enregistré : { visible, titre } par section, et l'ordre choisi. */
export interface ReglageSections { [cle: string]: unknown; __ordre?: string[] }
export const lire = (r: ReglageSections | undefined, cle: string): { visible: boolean; titre: string } => {
  const v = r?.[cle];
  if (typeof v === 'boolean') return { visible: v, titre: '' };              // ancien format
  const o = (v ?? {}) as { visible?: boolean; titre?: string };
  return { visible: o.visible !== false, titre: o.titre?.trim() ?? '' };
};

/** Applique le réglage à la page : sections masquées, titres, ordre. */
export function appliquerSections(r: ReglageSections | undefined) {
  if (!r) return;
  const blocs = [...document.querySelectorAll<HTMLElement>('[data-section]')];
  for (const el of blocs) {
    const { visible, titre } = lire(r, el.dataset.section!);
    el.toggleAttribute('data-masquee', !visible);
    const h2 = el.querySelector('h2');
    if (h2) {
      if (!h2.dataset.titreDefaut) h2.dataset.titreDefaut = h2.innerHTML;
      if (titre) h2.textContent = titre; else h2.innerHTML = h2.dataset.titreDefaut;
    }
  }
  // Ordre : seules les sections sœurs (même conteneur) sont réordonnées entre elles.
  const ordre = r.__ordre ?? [];
  if (!ordre.length) return;
  const parents = new Set(blocs.map((b) => b.parentElement));
  for (const p of parents) {
    if (!p) continue;
    const soeurs = blocs.filter((b) => b.parentElement === p && ordre.includes(b.dataset.section!));
    if (soeurs.length < 2) continue;
    const repere = document.createComment('sections');
    p.insertBefore(repere, soeurs[0]);
    soeurs.sort((a, b) => ordre.indexOf(a.dataset.section!) - ordre.indexOf(b.dataset.section!))
      .forEach((b) => p.insertBefore(b, repere));
    repere.remove();
  }
}
