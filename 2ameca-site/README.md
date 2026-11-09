# Site du Club 2AMECA — Atelier d'Applications Mécanique

Site officiel du Club 2AMECA (Faculté des Sciences Aïn Chock, Université Hassan II de Casablanca).

**Adresse du site : https://2amcclub.netlify.app**
*Esprit citoyen au centre.*

Site statique construit avec [Astro](https://astro.build) et du CSS simple (variables CSS, sans framework).
Les événements et les projets sont de simples fichiers Markdown : on peut en ajouter sans toucher au code.

---

## 1. Lancer le site sur son ordinateur

Prérequis : [Node.js](https://nodejs.org) **22.22 ou plus récent**.

```bash
cd 2ameca-site
npm install        # une seule fois
npm run dev        # → http://localhost:4321
```

Autres commandes :

| Commande          | Effet                                                   |
| ----------------- | ------------------------------------------------------- |
| `npm run build`   | Construit le site final dans `dist/`                    |
| `npm run preview` | Affiche le site construit, pour une vérification finale |
| `npm run check`   | Vérifie les erreurs (types, contenu mal rempli)         |

---

## 2. Les réglages : `src/config.ts`

**C'est le seul fichier à modifier** pour :

- le lien du **formulaire d'inscription** Google Forms (`INSCRIPTION_URL`) : tous les boutons « S'inscrire » l'ouvrent ;
- l'e-mail, l'Instagram, le LinkedIn et le WhatsApp du club (`CONTACT`) ;
- le local du club à la FSAC (`lieuDetail`).

Une valeur laissée à `null` s'affiche sur le site comme « [À fournir] ».

### Changer le formulaire d'inscription

Les inscriptions passent par Google Forms : les réponses arrivent dans le Google Sheet du formulaire.
Pour utiliser un autre formulaire, ouvrez-le dans Google Forms, cliquez sur **Envoyer → icône lien**, copiez le lien et collez-le dans `src/config.ts` :

```ts
export const INSCRIPTION_URL = 'https://docs.google.com/forms/d/e/…/viewform';
```

Un événement peut avoir son propre lien d'inscription grâce au champ `inscription:` (voir ci-dessous).

---

## 3. Ajouter un événement

1. Créer un fichier dans `src/content/evenements/`, par exemple `atelier-cao-2026.md`.
   Le nom du fichier devient l'adresse de la page : `/evenements/atelier-cao-2026/`.
2. Copier ce modèle et le remplir :

```markdown
---
titre: "Atelier CAO — initiation"
resume: "Une ou deux phrases qui résument l'événement (cartes et partage sur WhatsApp)."
dateDebut: 2026-11-18          # AAAA-MM-JJ, heure de Casablanca
dateFin: 2026-11-18            # facultatif, pour un événement sur plusieurs jours
heure: "14:00"                 # heure de début
heureFin: "17:00"              # facultatif
lieu: "FSAC — Salle B12"
lieuDetail: "2e étage"         # facultatif
programme:
  - "Présentation du logiciel"
  - "Premier modèle en équipe"
anneeUniversitaire: "2026–2027"
affiche: ./images/atelier-cao.jpg   # facultatif : image placée dans src/content/evenements/images/
afficheAlt: "Description de l'affiche pour les personnes malvoyantes"
inscription: "https://…"       # facultatif : lien d'inscription propre à l'événement (sinon → formulaire du club)
---

Texte libre de la page, en Markdown : **gras**, listes, sous-titres `## …`
```

- **Fuseau horaire** : les dates et les heures s'entendent en heure de Casablanca. Le changement d'heure du Ramadan est géré automatiquement.
- **À venir / passé** : un événement reste « à venir » jusqu'à la fin de son dernier jour. Le **plus proche** est mis en avant sur la page d'accueil, avec le compte à rebours.
- Pour masquer un événement sans le supprimer, ajouter `brouillon: true`.
- Un fichier `.ics` (ajout à l'agenda) est généré automatiquement pour chaque événement.

## 4. Ajouter un projet ou un atelier

1. Créer un fichier dans `src/content/projets/`, par exemple `drone-2026.md`.
2. Mettre les photos dans `src/content/projets/images/`. Elles sont optimisées et redimensionnées automatiquement.

```markdown
---
titre: "Conception d'un drone"
type: "Projet"                 # Projet | Atelier | Formation | Compétition
resume: "Une ou deux phrases pour la carte."
date: 2026-11-01
statut: "En cours"             # En cours | Terminé | À venir
membres:
  - "Nom Prénom"
  - "Nom Prénom"
couverture: ./images/drone-couverture.jpg
couvertureAlt: "Le drone posé sur l'établi de l'atelier"
photos:
  - src: ./images/drone-1.jpg
    alt: "Assemblage du châssis"
  - src: ./images/drone-2.jpg
    alt: "Premier vol d'essai"
enAvant: true                  # afficher dans « Projets à la une » sur l'accueil (3 maximum)
---

Description du projet : objectif, démarche, outils, résultats…
```

Ajoutez `aVerifier: true` pour afficher une mention « à confirmer » sur la page, le temps de vérifier les informations.

## 5. Modifier le bureau (l'équipe)

Le fichier `src/data/bureau.json` contient un bloc par membre :

```json
{ "nom": "Prénom Nom", "role": "Président(e)", "photo": "/equipe/prenom-nom.jpg" }
```

- Mettre les photos dans `public/equipe/` (format portrait 4:5, environ 600 × 750 px, en JPG).
- Laisser `"photo": ""` pour afficher un cadre « [Photo] » en attendant.
- L'ordre du fichier est l'ordre d'affichage.

## 6. Les autres textes

| Contenu                                    | Fichier                     |
| ------------------------------------------ | --------------------------- |
| Histoire, mission, valeurs                 | `src/pages/le-club.astro`   |
| Présentation sur l'accueil                 | `src/pages/index.astro`     |
| Raisons de rejoindre, étapes d'inscription | `src/pages/rejoindre.astro` |
| Questions fréquentes (FAQ)                 | `src/pages/contact.astro`   |

Les passages à compléter sont signalés entre crochets, par exemple `[Texte à fournir : …]`.
Une recherche de `[` dans `src/` les retrouve tous.

---

## 7. Espace membre et tableau de bord du bureau (Supabase)

Les comptes membres, les inscriptions, les présences, les supports et les attestations
sont gérés avec [Supabase](https://supabase.com) (plan gratuit). Le site reste statique :
il parle directement à Supabase depuis le navigateur.

| Page | Pour qui | Rôle |
| --- | --- | --- |
| `/connexion/` | tout le monde | se connecter, créer un compte, mot de passe oublié |
| `/espace/` | membres | s'inscrire aux activités, historique, QR code de présence, supports, attestations PDF |
| `/bureau/` | bureau | chiffres clés, activités, membres (recherche, rôles, export Excel) |
| `/bureau/activite/` | bureau | créer / modifier une activité, présences (case à cocher ou scan des QR codes), export Excel, dépôt des supports |
| `/formations/` | tout le monde | activités publiées à venir |
| `/verifier/` | tout le monde | vérifier une attestation grâce à son code |
| `/bureau/contenus/` | bureau | textes du club (présentation, histoire, mission, dates clés, valeurs), membres du bureau, coordonnées, FAQ, galerie photos, partenaires, ressources, annonces |
| `/galerie/` | tout le monde | photos des activités (avec filtre par activité) |
| `/ressources/` | tout le monde | ressources publiques ; les membres connectés voient aussi les leurs |
| `/activites/realisation/` | tout le monde | compte-rendu et photos d'une activité passée |

**Rôles** : *membre* (par défaut), *responsable* (gère les activités, les présences et les supports),
*administrateur* (gère aussi les membres et leurs rôles). Les règles d'accès sont appliquées par
Supabase lui-même : un membre ne peut ni voir les autres membres, ni télécharger un support,
ni obtenir une attestation sans présence validée.

**Règles automatiques**

- Une présence validée crée l'attestation (avec un code de vérification) et ouvre l'accès aux supports.
- Une présence annulée retire l'attestation.
- Une activité qui a délivré des attestations ne peut pas être supprimée (historique conservé) : dépubliez-la.
- Notifications dans l'espace membre : nouvelle activité publiée (tous), nouveau support et attestation disponible (personnes concernées), annonces du bureau.
- Les participants présents peuvent noter l'activité (1 à 5) et laisser un commentaire ; le bureau voit les avis et la note moyenne.
- Boîte à idées (membres → bureau, avec statut), formulaire de contact public (clubs, partenaires, entreprises → onglet *Messages*).
- Bibliothèque de ressources : chaque fichier est *public*, réservé aux *membres* ou au *bureau*.
- Les administrateurs modifient ou suppriment un membre depuis l'onglet *Membres* (suppression définitive).

**Installation (déjà faite pour le club)**

1. Créer un projet Supabase, puis coller `supabase/schema.sql`, `supabase/schema-v2.sql` et `supabase/schema-v3.sql`, dans cet ordre, dans *SQL Editor* → *Run*.
2. *Authentication → Sign In / Providers* : désactiver « Confirm email » tant qu'aucun service
   d'e-mail n'est configuré (l'envoi d'e-mails par défaut de Supabase est réservé à l'équipe du projet).
3. *Authentication → URL Configuration* : Site URL = l'adresse du site.
4. Mettre l'URL du projet et la clé **publishable** dans `src/config.ts` (jamais la clé *secret*).

**Nommer un administrateur** : la personne crée son compte sur le site, puis, dans *SQL Editor* :

```sql
update public.profiles set role = 'admin' where email = 'adresse@exemple.com';
```

Ensuite, les administrateurs changent les rôles directement depuis le tableau de bord (onglet *Membres*).

## 8. Mettre le site en ligne

### Option A — Vercel (recommandé, le plus simple)

1. Mettre le projet sur GitHub.
2. Sur [vercel.com](https://vercel.com) : *Add New → Project*, puis choisir le dépôt.
3. Si le site se trouve dans un sous-dossier du dépôt, régler **Root Directory** sur `2ameca-site`.
4. Vercel détecte Astro automatiquement : cliquer sur *Deploy*.
5. Dans *Settings → Environment Variables*, ajouter `SITE_URL` = l'adresse finale du site
   (ex. `https://2ameca.vercel.app` ou votre nom de domaine). Elle sert aux liens de partage et au plan du site.

Chaque modification poussée sur GitHub republie le site automatiquement.

**Mise à jour des événements** : le site est statique, et la liste « à venir / passé » est calculée à chaque publication.
Le navigateur corrige déjà l'affichage tout seul, mais pour que la page reste exacte, créez un *Deploy Hook*
(*Settings → Git → Deploy Hooks*). Appelez-le ensuite une fois par jour, par exemple avec un *Cron Job* gratuit sur [cron-job.org](https://cron-job.org).

### Option B — GitHub Pages

1. Mettre le contenu de ce dossier à la **racine** d'un dépôt GitHub.
2. Dans le dépôt : *Settings → Pages → Build and deployment → Source : GitHub Actions*.
3. Pousser sur la branche `main`. Le fichier `.github/workflows/deploy.yml` construit et publie le site.
   Il le reconstruit aussi chaque nuit, pour que les événements passés changent de section.

L'adresse et le sous-dossier (`https://<compte>.github.io/<depot>/`) sont réglés automatiquement par le workflow.

---

## Organisation du projet

```
2ameca-site/
├─ astro.config.mjs          configuration Astro (adresse du site, sous-dossier)
├─ docs/flyer.png            affiche de référence pour le style
├─ public/                   fichiers servis tels quels
│  ├─ logos/                 2ameca.png, 2ameca-white.png, fsac.png (+ versions allégées)
│  ├─ equipe/                photos du bureau
│  └─ og.jpg                 image de partage (WhatsApp, Instagram, Facebook)
└─ src/
   ├─ config.ts              ← réglages : formulaire, contacts, réseaux
   ├─ content.config.ts      champs autorisés pour les événements et les projets
   ├─ content/evenements/    un fichier .md par événement (+ images/)
   ├─ content/projets/       un fichier .md par projet ou atelier (+ images/)
   ├─ data/bureau.json       membres du bureau
   ├─ components/            en-tête, pied de page, cartes, compte à rebours…
   ├─ layouts/Base.astro     structure commune (SEO, en-tête, pied de page)
   ├─ lib/                   dates (heure de Casablanca), collections, liens
   ├─ pages/                 une page par fichier
   └─ styles/global.css      couleurs, typographies, boutons
```

## Charte graphique

- **Couleurs** (variables dans `src/styles/global.css`) : bleu `#0A4A7A`, marine `#04223A`, bleu ciel `#9FD0F5`, blanc, anthracite `#2D2D2D`.
- **Polices** (Google Fonts) : *Anton* pour les grands titres, *Oswald* pour les sous-titres, étiquettes et boutons, *Barlow* pour le texte. *Mrs Saint Delafield* sert aux touches manuscrites, avec **une seule** par page au maximum.
- **Décor** : fines « lignes de construction » diagonales, reprises du logo (`src/components/Lignes.astro`).
- Le logo FSAC est toujours posé sur une carte blanche arrondie (`src/components/Fsac.astro`).
