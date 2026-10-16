/**
 * ─────────────────────────────────────────────────────────────
 *  CONFIGURATION DU SITE — le seul fichier à modifier pour
 *  les coordonnées, les réseaux sociaux et le formulaire.
 *  Laisser une valeur à `null` affiche « [À fournir] » sur le site.
 * ─────────────────────────────────────────────────────────────
 */
export const SITE = {
  nom: 'Club 2AMECA',
  nomComplet: "Club 2AMECA — Atelier d'Applications Mécanique",
  sousTitre: "Atelier d'Applications Mécanique",
  slogan: 'Esprit citoyen au centre',
  description:
    "Club 2AMECA, l'Atelier d'Applications Mécanique de la Faculté des Sciences Aïn Chock (Université Hassan II de Casablanca). Projets, ateliers et événements autour de la mécanique, ouverts à tous les étudiants.",
  anneeUniversitaire: '2026–2027',
};

/**
 * Formulaire d'inscription — Google Forms.
 * Tous les boutons « S'inscrire » du site ouvrent ce lien.
 * Pour en changer : coller ici le lien « Envoyer → lien » du formulaire.
 */
export const INSCRIPTION_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSeOE51y_t9fpp6j0MiJB6xGt-ZFVQR4KPaVknp-bSmnsXn9JQ/viewform';

export const CONTACT = {
  /** ex. 'club2ameca@gmail.com' */
  email: null as string | null,
  /** Identifiant Instagram sans @, ex. '2ameca.fsac' */
  instagram: '2ameca_fsac' as string | null,
  /** Adresse complète de la page LinkedIn, ex. 'https://www.linkedin.com/company/…' */
  linkedin: 'https://www.linkedin.com/company/2ameca' as string | null,
  /** Numéro WhatsApp au format international sans + ni espaces, ex. '212600000000' */
  whatsapp: null as string | null,
  lieu: 'Faculté des Sciences Aïn Chock',
  lieuDetail: '[Salle / local du club à préciser]',
  adresse: 'Km 8 Route d’El Jadida, B.P. 5366 Maârif, 20100 Casablanca',
  /** Lien Google Maps vers la faculté */
  carte: 'https://www.google.com/maps/search/?api=1&query=Facult%C3%A9+des+Sciences+A%C3%AFn+Chock+Casablanca',
};

export const FSAC = {
  nom: 'Faculté des Sciences Aïn Chock',
  universite: 'Université Hassan II de Casablanca',
  url: 'https://fsac.univh2c.ma',
};
