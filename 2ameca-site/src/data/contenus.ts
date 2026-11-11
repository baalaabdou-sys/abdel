/**
 * Textes d'origine du site. Les administrateurs les modifient directement sur la page,
 * avec le Mode édition (src/lib/edition) : la version publiée s'affiche par-dessus.
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
    '2AMECA est un club estudiantin de la Faculté des Sciences Aïn Chock, relevant de l’Université Hassan II de Casablanca. '
    + 'Ouvert aux étudiants de toutes les filières, il constitue un espace d’échange, d’apprentissage, de créativité et de partage.\n\n'
    + 'À travers des activités scientifiques, techniques, culturelles et citoyennes, le club encourage l’esprit d’initiative, '
    + 'le travail collaboratif et le développement des compétences, tout en favorisant l’ouverture sur le monde professionnel.',
  histoire:
    'Le Club 2AMECA a été créé par des étudiants de la Faculté des Sciences Aïn Chock avec une ambition commune : '
    + 'faire de la vie universitaire un espace d’apprentissage, d’initiative et d’épanouissement.\n\n'
    + 'Depuis sa création, le club œuvre à rapprocher les connaissances théoriques de la pratique, à encourager la découverte '
    + 'de nouveaux domaines et à offrir aux étudiants des opportunités pour développer leurs compétences.\n\n'
    + 'À travers des ateliers, des formations, des conférences, des visites, des projets collaboratifs et des actions citoyennes, '
    + '2AMECA rassemble des étudiants de différentes filières autour de valeurs communes : le partage, l’innovation, '
    + 'l’engagement et l’esprit d’équipe.\n\n'
    + 'Parce que les idées n’ont pas de filière, 2AMECA est un espace ouvert à tous les étudiants de la FSAC.',
  mission:
    '2AMECA donne aux étudiants de la FSAC un lieu pour mettre en pratique ce qu’ils apprennent : concevoir et fabriquer en équipe, ' +
    'se former aux outils de la mécanique, et rencontrer des professionnels du secteur.',
  etapes: [
    { quand: 'Novembre 2024', quoi: 'Journée d’intégration de la famille 2AMECA.', detail: 'Rencontres, jeu en binômes et places de cinéma offertes par Pathé Californie Casablanca.' },
    { quand: 'Décembre 2024', quoi: 'Séminaire « Initiation aux logiciels CAD ».', detail: 'AutoCAD, SolidWorks et CATIA, avec Mohammed Amine El Hariri et Zouhair Baslam.' },
    { quand: 'Novembre 2025', quoi: '« The Career Workshop » avec Xperience, puis « Cap sur l’Espace ».', detail: 'CV et LinkedIn avec Ali El Harti, puis ingénierie aérospatiale avec Idir Loudaoui, en ligne.' },
    { quand: 'Décembre 2025', quoi: '1re édition de « De l’Amphi à l’Entreprise ».', detail: 'Cinq invités et une journée d’échanges avec des professionnels, à l’amphithéâtre de la FSAC.' },
    { quand: 'Décembre 2025', quoi: 'ANSYS Workshop, puis RISE : « Votre plan de carrière en 180 minutes ».', detail: 'Simulation avec Ayoub Elmouhri (Analytics Systems Africa), puis carrière avec Mohamed Reffadi (You & Me Consulting).' },
    { quand: 'Mars 2026', quoi: 'Conférence « Femmes Leaders à l’ère de l’Intelligence Artificielle ».', detail: 'Pour la Journée internationale des droits des femmes, avec le Club Santé et d’autres clubs de la FSAC.' },
    { quand: 'Avril 2026', quoi: '« Machine Learning Training » avec El Mehdi Lghaouch.', detail: 'Deux séances intensives en salle digitale de la FSAC, dans la série NEXTGEN AI, avec l’AI & DEV Community et la FSBM.' },
    { quand: 'Octobre 2026', quoi: 'Journées portes ouvertes d’intégration.', detail: 'Trois jours pour accueillir les nouveaux étudiants de l’année 2026–2027.' },
    { quand: 'Novembre 2026', quoi: '1re Journée d’Excellence 2AMECA.', detail: 'Rencontres, partage d’expériences, jeux et challenges, à l’amphithéâtre de la FSAC.' },
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
  { q: 'L’adhésion est-elle payante ?', r: 'Non. L’inscription au club est gratuite, tout comme la participation aux activités, aux formations et aux attestations.' },
  { q: 'Combien de temps faut-il consacrer au club ?', r: 'Autant que vous le souhaitez. Il n’y a aucune obligation de présence : chacun participe quand il veut, selon son emploi du temps et ses envies.' },
];
