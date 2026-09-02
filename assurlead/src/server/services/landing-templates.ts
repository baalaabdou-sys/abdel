import type { InsuranceType } from '@prisma/client';
import { insuranceLabel } from '@/lib/domain';

/** Section model used by the landing page builder and the public renderer. */
export type LandingSection =
  | { id: string; type: 'hero'; visible: boolean; headline: string; subheadline: string; eyebrow?: string; imageUrl?: string; ctaLabel: string }
  | { id: string; type: 'benefits'; visible: boolean; title: string; items: { title: string; body: string }[] }
  | { id: string; type: 'trust'; visible: boolean; title: string; items: string[] }
  | { id: string; type: 'steps'; visible: boolean; title: string; items: { title: string; body: string }[] }
  | { id: string; type: 'form'; visible: boolean; title: string; description: string }
  | { id: string; type: 'faq'; visible: boolean; title: string; items: { question: string; answer: string }[] }
  | { id: string; type: 'legal'; visible: boolean; body: string }
  | { id: string; type: 'footer'; visible: boolean; body: string };

export type LandingTheme = {
  accent: string;
  background: string;
  radius: 'sm' | 'md' | 'lg';
  layout: 'split' | 'centered';
};

export const DEFAULT_THEME: LandingTheme = { accent: '#1d4ed8', background: '#f8fafc', radius: 'lg', layout: 'split' };

export type FormFieldSeed = {
  key: string; label: string; type: string; step: number; order: number;
  required: boolean; options?: { value: string; label: string }[]; placeholder?: string; helpText?: string;
  conditionField?: string; conditionValue?: string;
};

export type LandingTemplate = {
  key: string;
  name: string;
  product: InsuranceType;
  description: string;
  sections: LandingSection[];
  formSteps: { key: string; title: string; description: string }[];
  formFields: FormFieldSeed[];
  consentText: string;
};

const CONSENT =
  "J'accepte d'être contacté(e) par téléphone et par email au sujet de ma demande. Mes données sont utilisées pour traiter cette demande et je peux demander leur suppression à tout moment.";

const CONTACT_FIELDS = (step: number): FormFieldSeed[] => [
  { key: 'prenom', label: 'Prénom', type: 'text', step, order: 1, required: true, placeholder: 'Marie' },
  { key: 'nom', label: 'Nom', type: 'text', step, order: 2, required: true, placeholder: 'Durand' },
  { key: 'email', label: 'Email', type: 'email', step, order: 3, required: true, placeholder: 'marie.durand@exemple.fr' },
  { key: 'telephone', label: 'Téléphone', type: 'tel', step, order: 4, required: true, placeholder: '06 12 34 56 78' },
  { key: 'code_postal', label: 'Code postal', type: 'postal', step, order: 5, required: true, placeholder: '75011' },
  { key: 'ville', label: 'Ville', type: 'text', step, order: 6, required: false, placeholder: 'Paris' },
];

const CONSENT_FIELDS = (step: number): FormFieldSeed[] => [
  { key: 'rappel', label: 'Moment de rappel préféré', type: 'select', step, order: 1, required: false,
    options: [
      { value: 'matin', label: 'Le matin (9h–12h)' },
      { value: 'apres_midi', label: "L'après-midi (14h–18h)" },
      { value: 'soir', label: 'En soirée (18h–20h)' },
      { value: 'indifferent', label: 'Peu importe' },
    ] },
  { key: 'message', label: 'Votre message (facultatif)', type: 'textarea', step, order: 2, required: false, placeholder: 'Précisez votre besoin…' },
  { key: 'consentement', label: CONSENT, type: 'checkbox', step, order: 3, required: true },
];

function hero(product: InsuranceType, headline: string, subheadline: string, cta: string): LandingSection {
  return { id: 'hero', type: 'hero', visible: true, eyebrow: insuranceLabel(product), headline, subheadline, ctaLabel: cta };
}

const STEPS_SECTION: LandingSection = {
  id: 'steps', type: 'steps', visible: true, title: 'Comment ça marche',
  items: [
    { title: '1. Vous décrivez votre situation', body: 'Quelques questions simples, deux minutes suffisent.' },
    { title: '2. Un conseiller étudie votre dossier', body: 'Nous comparons les offres de nos partenaires selon vos besoins.' },
    { title: '3. Vous recevez une proposition', body: 'Vous décidez librement de la suite, sans engagement.' },
  ],
};

const LEGAL_SECTION: LandingSection = {
  id: 'legal', type: 'legal', visible: true,
  body: "Les informations recueillies sur ce formulaire sont utilisées pour traiter votre demande d'étude d'assurance et vous recontacter. Vous disposez d'un droit d'accès, de rectification, d'opposition et de suppression de vos données.",
};

const FOOTER_SECTION: LandingSection = {
  id: 'footer', type: 'footer', visible: true,
  body: "Ce site est édité par un intermédiaire en assurance. Aucune souscription n'est réalisée en ligne : votre demande est étudiée par un conseiller.",
};

export const LANDING_TEMPLATES: LandingTemplate[] = [
  {
    key: 'auto',
    name: 'Assurance Auto — Devis',
    product: 'AUTO',
    description: 'Parcours en 4 étapes : besoin, véhicule, contrat actuel, coordonnées.',
    sections: [
      hero('AUTO', 'Votre assurance auto, étudiée par un conseiller', 'Répondez à quelques questions : nous comparons les offres de nos partenaires et un conseiller vous rappelle avec une proposition adaptée.', 'Demander mon étude gratuite'),
      { id: 'benefits', type: 'benefits', visible: true, title: 'Pourquoi faire le point maintenant',
        items: [
          { title: 'Étude gratuite', body: "Sans engagement de votre part, à tout moment." },
          { title: 'Un interlocuteur unique', body: 'Un conseiller suit votre dossier du début à la fin.' },
          { title: 'Vos garanties d’abord', body: 'Nous partons de votre usage réel du véhicule, pas d’un tarif d’appel.' },
        ] },
      STEPS_SECTION,
      { id: 'trust', type: 'trust', visible: true, title: 'Nos engagements',
        items: [
          'Aucune souscription automatique : vous gardez la main.',
          'Vos données servent uniquement à traiter votre demande.',
          'Vous pouvez demander la suppression de vos données à tout moment.',
        ] },
      { id: 'form', type: 'form', visible: true, title: 'Recevoir mon étude', description: 'Deux minutes suffisent.' },
      LEGAL_SECTION,
      FOOTER_SECTION,
    ],
    formSteps: [
      { key: 'besoin', title: 'Votre besoin', description: 'Que souhaitez-vous faire ?' },
      { key: 'vehicule', title: 'Votre véhicule', description: 'Quelques informations sur le véhicule à assurer.' },
      { key: 'contrat', title: 'Votre contrat actuel', description: 'Pour comparer sur une base juste.' },
      { key: 'contact', title: 'Vos coordonnées', description: 'Pour vous transmettre l’étude.' },
      { key: 'validation', title: 'Validation', description: 'Dernière étape.' },
    ],
    formFields: [
      { key: 'besoin', label: 'Quel est votre besoin ?', type: 'radio', step: 1, order: 1, required: true,
        options: [
          { value: 'changer', label: "Changer d'assurance" },
          { value: 'comparer', label: 'Comparer mon contrat actuel' },
          { value: 'nouveau', label: 'Assurer un nouveau véhicule' },
          { value: 'autre', label: 'Autre' },
        ] },
      { key: 'type_vehicule', label: 'Type de véhicule', type: 'select', step: 2, order: 1, required: true,
        options: [
          { value: 'citadine', label: 'Citadine' }, { value: 'berline', label: 'Berline' },
          { value: 'suv', label: 'SUV / 4x4' }, { value: 'utilitaire', label: 'Utilitaire' },
          { value: 'autre', label: 'Autre' },
        ] },
      { key: 'marque', label: 'Marque', type: 'text', step: 2, order: 2, required: true, placeholder: 'Renault' },
      { key: 'modele', label: 'Modèle', type: 'text', step: 2, order: 3, required: false, placeholder: 'Clio' },
      { key: 'annee', label: 'Année du véhicule', type: 'number', step: 2, order: 4, required: false, placeholder: '2019' },
      { key: 'date_mise_circulation', label: 'Date de mise en circulation', type: 'date', step: 2, order: 5, required: false },
      { key: 'assureur_actuel', label: 'Assureur actuel', type: 'text', step: 3, order: 1, required: false, placeholder: 'Nom de votre assureur' },
      { key: 'date_echeance', label: 'Date d’échéance du contrat', type: 'date', step: 3, order: 2, required: false, helpText: 'Nous adaptons le calendrier de l’étude à votre échéance.' },
      { key: 'bonus_malus', label: 'Coefficient bonus / malus', type: 'text', step: 3, order: 3, required: false, placeholder: '0.68' },
      ...CONTACT_FIELDS(4),
      ...CONSENT_FIELDS(5),
    ],
    consentText: CONSENT,
  },
  {
    key: 'sante',
    name: 'Mutuelle Santé — Devis',
    product: 'SANTE',
    description: 'Parcours court, sans question de santé : besoin, situation, coordonnées.',
    sections: [
      hero('SANTE', 'Votre mutuelle santé, comparée sans engagement', 'Un conseiller étudie votre situation et vous propose des formules adaptées à vos besoins de couverture.', 'Être rappelé(e) gratuitement'),
      { id: 'benefits', type: 'benefits', visible: true, title: 'Ce que nous regardons avec vous',
        items: [
          { title: 'Vos priorités de couverture', body: 'Optique, dentaire, hospitalisation : vous nous dites ce qui compte.' },
          { title: 'Votre situation familiale', body: 'Seul, en couple, avec enfants : la formule n’est pas la même.' },
          { title: 'Votre budget', body: 'Nous cherchons le meilleur équilibre garanties / cotisation.' },
        ] },
      STEPS_SECTION,
      { id: 'trust', type: 'trust', visible: true, title: 'Notre approche',
        items: [
          "Nous ne posons aucune question médicale dans ce formulaire.",
          'Vos données servent uniquement à préparer votre étude.',
          'Aucune souscription n’est réalisée sans votre accord explicite.',
        ] },
      { id: 'form', type: 'form', visible: true, title: 'Demander mon étude', description: 'Sans question de santé.' },
      LEGAL_SECTION,
      FOOTER_SECTION,
    ],
    formSteps: [
      { key: 'besoin', title: 'Votre besoin', description: 'Que recherchez-vous ?' },
      { key: 'situation', title: 'Votre situation', description: 'Pour dimensionner la formule.' },
      { key: 'contact', title: 'Vos coordonnées', description: 'Pour vous transmettre l’étude.' },
      { key: 'validation', title: 'Validation', description: 'Dernière étape.' },
    ],
    formFields: [
      { key: 'besoin', label: 'Quel est votre besoin ?', type: 'radio', step: 1, order: 1, required: true,
        options: [
          { value: 'changer', label: 'Changer de mutuelle' },
          { value: 'comparer', label: 'Comparer ma mutuelle actuelle' },
          { value: 'premiere', label: 'Souscrire une première mutuelle' },
          { value: 'autre', label: 'Autre' },
        ] },
      { key: 'situation_familiale', label: 'Votre situation', type: 'select', step: 2, order: 1, required: true,
        options: [
          { value: 'seul', label: 'Seul(e)' }, { value: 'couple', label: 'En couple' },
          { value: 'famille', label: 'Famille avec enfant(s)' },
        ] },
      { key: 'priorites', label: 'Vos priorités de couverture', type: 'select', step: 2, order: 2, required: false,
        options: [
          { value: 'optique', label: 'Optique' }, { value: 'dentaire', label: 'Dentaire' },
          { value: 'hospitalisation', label: 'Hospitalisation' }, { value: 'equilibre', label: 'Une couverture équilibrée' },
        ] },
      { key: 'assureur_actuel', label: 'Mutuelle actuelle', type: 'text', step: 2, order: 3, required: false },
      { key: 'date_echeance', label: 'Date d’échéance', type: 'date', step: 2, order: 4, required: false },
      ...CONTACT_FIELDS(3),
      ...CONSENT_FIELDS(4),
    ],
    consentText: CONSENT,
  },
  {
    key: 'habitation',
    name: 'Assurance Habitation — Devis',
    product: 'HABITATION',
    description: 'Parcours logement : statut, bien, coordonnées.',
    sections: [
      hero('HABITATION', 'Votre assurance habitation, revue avec un conseiller', 'Locataire ou propriétaire, nous vérifions que vos garanties correspondent à votre logement réel.', 'Demander mon étude'),
      { id: 'benefits', type: 'benefits', visible: true, title: 'Les points que nous vérifions',
        items: [
          { title: 'La surface et les pièces', body: 'Une déclaration inexacte peut poser problème en cas de sinistre.' },
          { title: 'Le contenu à assurer', body: 'Mobilier, équipements, objets de valeur.' },
          { title: 'Les garanties annexes', body: 'Dégât des eaux, bris de glace, responsabilité civile.' },
        ] },
      STEPS_SECTION,
      { id: 'form', type: 'form', visible: true, title: 'Recevoir mon étude', description: 'Deux minutes suffisent.' },
      LEGAL_SECTION,
      FOOTER_SECTION,
    ],
    formSteps: [
      { key: 'logement', title: 'Votre logement', description: 'Quelques informations sur le bien.' },
      { key: 'contrat', title: 'Votre contrat', description: 'Pour comparer sur une base juste.' },
      { key: 'contact', title: 'Vos coordonnées', description: 'Pour vous transmettre l’étude.' },
      { key: 'validation', title: 'Validation', description: 'Dernière étape.' },
    ],
    formFields: [
      { key: 'statut', label: 'Vous êtes', type: 'radio', step: 1, order: 1, required: true,
        options: [
          { value: 'locataire', label: 'Locataire' }, { value: 'proprietaire', label: 'Propriétaire occupant' },
          { value: 'bailleur', label: 'Propriétaire bailleur' },
        ] },
      { key: 'type_logement', label: 'Type de logement', type: 'select', step: 1, order: 2, required: true,
        options: [{ value: 'appartement', label: 'Appartement' }, { value: 'maison', label: 'Maison' }] },
      { key: 'surface', label: 'Surface (m²)', type: 'number', step: 1, order: 3, required: false, placeholder: '65' },
      { key: 'nb_pieces', label: 'Nombre de pièces', type: 'number', step: 1, order: 4, required: false, placeholder: '3' },
      { key: 'assureur_actuel', label: 'Assureur actuel', type: 'text', step: 2, order: 1, required: false },
      { key: 'date_echeance', label: 'Date d’échéance', type: 'date', step: 2, order: 2, required: false },
      ...CONTACT_FIELDS(3),
      ...CONSENT_FIELDS(4),
    ],
    consentText: CONSENT,
  },
  {
    key: 'moto',
    name: 'Assurance Moto — Devis',
    product: 'MOTO',
    description: 'Parcours deux-roues : véhicule, usage, coordonnées.',
    sections: [
      hero('MOTO', 'Votre assurance moto, adaptée à votre usage', 'Trajets quotidiens ou balades du week-end : les garanties utiles ne sont pas les mêmes.', 'Demander mon étude'),
      { id: 'benefits', type: 'benefits', visible: true, title: 'Ce qui change vraiment votre contrat',
        items: [
          { title: 'La cylindrée', body: 'Elle conditionne une grande partie des garanties.' },
          { title: 'Le stationnement', body: 'Box fermé ou voie publique : le risque n’est pas le même.' },
          { title: 'L’usage', body: 'Trajets domicile-travail, loisir, ou usage occasionnel.' },
        ] },
      STEPS_SECTION,
      { id: 'form', type: 'form', visible: true, title: 'Recevoir mon étude', description: 'Deux minutes suffisent.' },
      LEGAL_SECTION,
      FOOTER_SECTION,
    ],
    formSteps: [
      { key: 'vehicule', title: 'Votre deux-roues', description: 'Quelques informations sur le véhicule.' },
      { key: 'usage', title: 'Votre usage', description: 'Comment utilisez-vous votre moto ?' },
      { key: 'contact', title: 'Vos coordonnées', description: 'Pour vous transmettre l’étude.' },
      { key: 'validation', title: 'Validation', description: 'Dernière étape.' },
    ],
    formFields: [
      { key: 'marque', label: 'Marque', type: 'text', step: 1, order: 1, required: true, placeholder: 'Yamaha' },
      { key: 'modele', label: 'Modèle', type: 'text', step: 1, order: 2, required: false },
      { key: 'cylindree', label: 'Cylindrée (cm³)', type: 'number', step: 1, order: 3, required: false, placeholder: '125' },
      { key: 'annee', label: 'Année', type: 'number', step: 1, order: 4, required: false },
      { key: 'usage', label: 'Usage principal', type: 'radio', step: 2, order: 1, required: true,
        options: [
          { value: 'quotidien', label: 'Trajets quotidiens' }, { value: 'loisir', label: 'Loisir / week-end' },
          { value: 'occasionnel', label: 'Occasionnel' },
        ] },
      { key: 'stationnement', label: 'Stationnement habituel', type: 'select', step: 2, order: 2, required: false,
        options: [
          { value: 'box', label: 'Box ou garage fermé' }, { value: 'parking', label: 'Parking collectif' },
          { value: 'rue', label: 'Voie publique' },
        ] },
      { key: 'assureur_actuel', label: 'Assureur actuel', type: 'text', step: 2, order: 3, required: false },
      { key: 'date_echeance', label: 'Date d’échéance', type: 'date', step: 2, order: 4, required: false },
      ...CONTACT_FIELDS(3),
      ...CONSENT_FIELDS(4),
    ],
    consentText: CONSENT,
  },
  {
    key: 'rc_pro',
    name: 'RC Pro — Devis',
    product: 'RC_PRO',
    description: 'Parcours professionnel : activité, chiffre d’affaires, coordonnées.',
    sections: [
      hero('RC_PRO', 'Votre responsabilité civile professionnelle', 'Indépendant, artisan ou société : nous ajustons la couverture à votre activité réelle.', 'Demander mon étude'),
      { id: 'benefits', type: 'benefits', visible: true, title: 'Adapté à votre activité',
        items: [
          { title: 'Votre métier', body: 'Les risques d’un consultant et d’un artisan n’ont rien à voir.' },
          { title: 'Votre volume d’activité', body: 'Le chiffre d’affaires conditionne les plafonds utiles.' },
          { title: 'Vos obligations', body: 'Certaines activités imposent une couverture spécifique.' },
        ] },
      STEPS_SECTION,
      { id: 'form', type: 'form', visible: true, title: 'Recevoir mon étude', description: 'Deux minutes suffisent.' },
      LEGAL_SECTION,
      FOOTER_SECTION,
    ],
    formSteps: [
      { key: 'activite', title: 'Votre activité', description: 'Décrivez votre métier.' },
      { key: 'entreprise', title: 'Votre structure', description: 'Quelques chiffres.' },
      { key: 'contact', title: 'Vos coordonnées', description: 'Pour vous transmettre l’étude.' },
      { key: 'validation', title: 'Validation', description: 'Dernière étape.' },
    ],
    formFields: [
      { key: 'activite', label: 'Votre activité principale', type: 'text', step: 1, order: 1, required: true, placeholder: 'Consultant en informatique' },
      { key: 'statut_juridique', label: 'Statut juridique', type: 'select', step: 1, order: 2, required: false,
        options: [
          { value: 'micro', label: 'Micro-entreprise' }, { value: 'ei', label: 'Entreprise individuelle' },
          { value: 'sasu', label: 'SASU / SAS' }, { value: 'sarl', label: 'SARL / EURL' }, { value: 'autre', label: 'Autre' },
        ] },
      { key: 'chiffre_affaires', label: 'Chiffre d’affaires annuel (€)', type: 'number', step: 2, order: 1, required: false, placeholder: '80000' },
      { key: 'nb_salaries', label: 'Nombre de salariés', type: 'number', step: 2, order: 2, required: false, placeholder: '0' },
      { key: 'date_echeance', label: 'Date d’échéance du contrat actuel', type: 'date', step: 2, order: 3, required: false },
      ...CONTACT_FIELDS(3),
      ...CONSENT_FIELDS(4),
    ],
    consentText: CONSENT,
  },
  {
    key: 'general',
    name: 'Demande de devis générale',
    product: 'AUTRE',
    description: 'Formulaire court, tous produits.',
    sections: [
      hero('AUTRE', 'Demandez votre étude d’assurance', 'Dites-nous ce que vous souhaitez assurer : un conseiller vous rappelle.', 'Être rappelé(e)'),
      { id: 'benefits', type: 'benefits', visible: true, title: 'Simple et sans engagement',
        items: [
          { title: 'Une seule demande', body: 'Un conseiller vous oriente vers la bonne solution.' },
          { title: 'Réponse rapide', body: 'Nous vous recontactons dans les meilleurs délais.' },
          { title: 'Aucun engagement', body: 'Vous décidez librement de la suite.' },
        ] },
      { id: 'form', type: 'form', visible: true, title: 'Votre demande', description: 'Une minute suffit.' },
      LEGAL_SECTION,
      FOOTER_SECTION,
    ],
    formSteps: [
      { key: 'besoin', title: 'Votre besoin', description: 'Que souhaitez-vous assurer ?' },
      { key: 'contact', title: 'Vos coordonnées', description: 'Pour vous recontacter.' },
    ],
    formFields: [
      { key: 'type_assurance', label: 'Type d’assurance', type: 'select', step: 1, order: 1, required: true,
        options: [
          { value: 'AUTO', label: 'Auto' }, { value: 'MOTO', label: 'Moto' },
          { value: 'HABITATION', label: 'Habitation' }, { value: 'SANTE', label: 'Santé / Mutuelle' },
          { value: 'PREVOYANCE', label: 'Prévoyance' }, { value: 'EMPRUNTEUR', label: 'Emprunteur' },
          { value: 'RC_PRO', label: 'RC Pro' }, { value: 'AUTRE', label: 'Autre' },
        ] },
      { key: 'besoin', label: 'Précisez votre besoin', type: 'radio', step: 1, order: 2, required: false,
        options: [
          { value: 'changer', label: "Changer d'assurance" }, { value: 'comparer', label: 'Comparer' },
          { value: 'nouveau', label: 'Nouveau contrat' }, { value: 'autre', label: 'Autre' },
        ] },
      ...CONTACT_FIELDS(2),
      { key: 'consentement', label: CONSENT, type: 'checkbox', step: 2, order: 7, required: true },
    ],
    consentText: CONSENT,
  },
];

export function templateFor(key: string): LandingTemplate {
  return LANDING_TEMPLATES.find((t) => t.key === key) ?? LANDING_TEMPLATES[LANDING_TEMPLATES.length - 1];
}
