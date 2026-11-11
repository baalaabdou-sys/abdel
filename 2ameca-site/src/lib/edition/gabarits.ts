/**
 * Sections prêtes à l'emploi pour « Ajouter une section » (Mode édition).
 * Elles reprennent les classes du site (section, conteneur, surtitre, titre-2, trait, btn…),
 * donc elles ont exactement le même style que les autres pages. Leurs textes d'exemple
 * se remplacent ensuite en les touchant, comme n'importe quel texte du site.
 */
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const PHOTO = `${base}/edition/photo.svg`;
const tete = (surtitre: string, titre: string) =>
  `<span class="surtitre">${surtitre}</span><h2 class="titre-2">${titre}</h2><hr class="trait" />`;

export const GABARITS: Record<string, { nom: string; aide: string; classe: string; html: string }> = {
  texte: {
    nom: 'Texte', aide: 'Un titre et quelques paragraphes.', classe: 'section',
    html: `<div class="conteneur bl-texte">${tete('Surtitre', 'Titre de la section')}
      <p>Écrivez ici votre texte. Touchez ce paragraphe pour le remplacer.</p>
      <p>Un deuxième paragraphe, si besoin.</p></div>`,
  },
  'texte-photo': {
    nom: 'Texte et photo', aide: 'Texte à gauche, photo à droite (l’un sous l’autre sur téléphone).', classe: 'section',
    html: `<div class="conteneur bl-media"><div>${tete('Surtitre', 'Titre de la section')}
      <p>Présentez un projet, une sortie ou un atelier en quelques phrases.</p>
      <div class="boutons"><a class="btn" href="${base}/contact/">Bouton <span class="fleche" aria-hidden="true">→</span></a></div></div>
      <img src="${PHOTO}" alt="" width="1200" height="900" loading="lazy" decoding="async" /></div>`,
  },
  cartes: {
    nom: 'Trois cartes', aide: 'Trois points forts, étapes ou activités côte à côte.', classe: 'section teinte',
    html: `<div class="conteneur"><div class="entete-section"><div>${tete('Surtitre', 'Titre de la section')}</div></div>
      <ul class="grille grille-3 bl-cartes" role="list">
      ${[1, 2, 3].map((n) => `<li class="bl-carte"><span class="bl-num" aria-hidden="true">0${n}</span><h3 class="titre-3">Titre ${n}</h3><p>Une phrase courte pour expliquer ce point.</p></li>`).join('')}
      </ul></div>`,
  },
  chiffres: {
    nom: 'Chiffres clés', aide: 'Trois chiffres marquants du club.', classe: 'section serree',
    html: `<div class="conteneur"><ul class="bl-chiffres" role="list">
      ${[['120', 'membres'], ['15', 'activités par an'], ['6', 'partenaires']].map(([c, l]) => `<li><p class="bl-chiffre">${c}</p><p>${l}</p></li>`).join('')}
      </ul></div>`,
  },
  citation: {
    nom: 'Citation', aide: 'Une phrase mise en avant, avec son auteur.', classe: 'section tres-sombre',
    html: `<div class="conteneur"><figure class="bl-citation"><blockquote><p>« Une phrase forte d’un membre, d’un invité ou d’un partenaire. »</p></blockquote>
      <figcaption>Prénom Nom, fonction</figcaption></figure></div>`,
  },
  appel: {
    nom: 'Appel à l’action', aide: 'Un titre et deux boutons sur fond bleu.', classe: 'section sombre',
    html: `<div class="conteneur bl-appel"><h2 class="titre-2">Titre accrocheur</h2>
      <p class="chapo">Une phrase qui donne envie de passer à l’action.</p>
      <div class="boutons"><a class="btn btn-clair" href="${base}/rejoindre/">Rejoindre le club <span class="fleche" aria-hidden="true">→</span></a>
      <a class="btn btn-contour" href="${base}/evenements/">Nos événements</a></div></div>`,
  },
  questions: {
    nom: 'Questions et réponses', aide: 'Trois questions fréquentes avec leur réponse.', classe: 'section',
    html: `<div class="conteneur bl-texte">${tete('Questions', 'Vous vous demandez…')}
      <dl class="bl-faq">${[1, 2, 3].map((n) => `<dt>Question ${n} ?</dt><dd>La réponse, en une ou deux phrases.</dd>`).join('')}</dl></div>`,
  },
  photo: {
    nom: 'Grande photo', aide: 'Une photo sur toute la largeur, avec une légende.', classe: 'section serree',
    html: `<div class="conteneur"><figure class="bl-photo"><img src="${PHOTO}" alt="" width="1600" height="900" loading="lazy" decoding="async" />
      <figcaption>Légende de la photo.</figcaption></figure></div>`,
  },
};
export const PREFIXE = 'modele:';
export const estGabarit = (de: string) => de.startsWith(PREFIXE);

/** Construit la section d'un gabarit (null si le nom est inconnu). */
export function construire(de: string): HTMLElement | null {
  const g = GABARITS[de.slice(PREFIXE.length)];
  if (!g) return null;
  const s = document.createElement('section');
  s.className = g.classe;
  s.innerHTML = g.html;
  return s;
}
