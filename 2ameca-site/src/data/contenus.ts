/**
 * Textes par défaut du site. Le bureau les remplace depuis le tableau de bord
 * (Contenus du site → Le club / Contact & FAQ / Bureau) : la version enregistrée
 * dans la base s'affiche alors à la place de celle-ci.
 * Un texte entre crochets [ … ] s'affiche comme « à compléter ».
 */
import { CONTACT } from '../config';

export interface Etape { quand: string; quoi: string; detail: string }
export interface Valeur { titre: string; texte: string }
export interface Club { intro: string; histoire: string; mission: string; etapes: Etape[]; valeurs: Valeur[] }
export interface Contact { email: string; whatsapp: string; instagram: string; linkedin: string; local: string }
export interface QuestionFaq { q: string; r: string }

export const CLUB_DEFAUT: Club = {
  intro:
    '2AMECA — Atelier d’Applications Mécanique — est un club étudiant de la Faculté des Sciences Aïn Chock. ' +
    'Il réunit des étudiants de toutes les filières autour de la mécanique appliquée, de l’automobile et de l’aéronautique, ' +
    'avec un même état d’esprit : l’esprit citoyen au centre.',
  histoire: '[Texte à fournir : l’histoire du club en quelques paragraphes — qui l’a fondé, pourquoi, et ce qu’il a accompli depuis.]',
  mission:
    '2AMECA donne aux étudiants de la FSAC un lieu pour mettre en pratique ce qu’ils apprennent : concevoir et fabriquer en équipe, ' +
    'se former aux outils de la mécanique, et rencontrer des professionnels du secteur.',
  etapes: [
    { quand: '[Année de création]', quoi: 'Création du club 2AMECA à la Faculté des Sciences Aïn Chock.', detail: '[Texte à fournir : fondateurs, contexte de création.]' },
    { quand: 'Novembre 2024', quoi: 'Journée d’intégration de la famille 2AMECA.', detail: 'Rencontres, jeu en binômes et places de cinéma offertes par Pathé Californie Casablanca.' },
    { quand: 'Décembre 2024', quoi: 'Séminaire « Initiation aux logiciels CAD ».', detail: 'AutoCAD, SolidWorks et CATIA, avec Mohammed Amine El Hariri et Zouhair Baslam.' },
    { quand: 'Novembre 2025', quoi: '« The Career Workshop » avec Xperience, puis « Cap sur l’Espace ».', detail: 'CV et LinkedIn avec Ali El Harti, puis ingénierie aérospatiale avec Idir Loudaoui, en ligne.' },
    { quand: 'Décembre 2025', quoi: '1re édition de « De l’Amphi à l’Entreprise ».', detail: 'Cinq invités et une journée d’échanges avec des professionnels, à l’amphithéâtre de la FSAC.' },
    { quand: 'Décembre 2025', quoi: 'ANSYS Workshop, puis RISE : « Votre plan de carrière en 180 minutes ».', detail: 'Simulation avec Ayoub Elmouhri (Analytics Systems Africa), puis carrière avec Mohamed Reffadi (You & Me Consulting).' },
    { quand: 'Avril 2026', quoi: 'Formation Data Mining avec l’AI & DEV Community.', detail: 'Une séance de la série « NEXTGEN AI: Morocco Tech Series », en salle 17 de la FSAC.' },
    { quand: 'Octobre 2026', quoi: 'Journées portes ouvertes d’intégration.', detail: 'Trois jours pour accueillir les nouveaux étudiants de l’année 2026–2027.' },
  ],
  valeurs: [
    { titre: 'Esprit citoyen', texte: 'Mettre nos compétences au service de la faculté et de la société : c’est le sens de notre devise.' },
    { titre: 'Apprendre en faisant', texte: 'La théorie de l’amphi prend tout son sens quand on la met en pratique, à l’atelier.' },
    { titre: 'Ouverture', texte: 'Le club est ouvert à toutes les filières et à tous les niveaux, débutants compris.' },
    { titre: 'Esprit d’équipe', texte: 'Chaque projet est collectif : on partage les idées, les outils et les réussites.' },
  ],
};

export const CONTACT_DEFAUT: Contact = {
  email: CONTACT.email ?? '',
  whatsapp: CONTACT.whatsapp ?? '',
  instagram: CONTACT.instagram ?? '',
  linkedin: CONTACT.linkedin ?? '',
  local: CONTACT.lieuDetail,
};

export const FAQ_DEFAUT: QuestionFaq[] = [
  { q: 'Faut-il avoir de l’expérience en mécanique pour rejoindre le club ?', r: 'Non. Le club est ouvert aux débutants : les ateliers et les projets en équipe sont justement là pour apprendre. La motivation compte plus que le niveau.' },
  { q: 'Je ne suis pas en filière physique ou mécanique, puis-je m’inscrire ?', r: 'Oui. Tous les étudiants de la FSAC sont les bienvenus, quelle que soit leur filière. Les projets ont aussi besoin de profils en informatique, en communication ou en organisation.' },
  { q: 'Comment s’inscrire ?', r: 'Créez votre compte sur le site (bouton « Rejoindre »), puis inscrivez-vous aux activités depuis votre espace membre.' },
  { q: 'L’adhésion est-elle payante ?', r: '[Réponse à fournir : gratuité ou montant de la cotisation annuelle.]' },
  { q: 'Combien de temps faut-il consacrer au club ?', r: '[Réponse à fournir : fréquence des réunions et des ateliers.] Chacun participe selon ses disponibilités, en fonction de son emploi du temps.' },
];
