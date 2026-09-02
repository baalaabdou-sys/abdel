# ASSURLEAD AI

Plateforme de génération de leads pour un courtier ou un cabinet d'assurance en France.

Elle transforme une base de contacts existante en flux de leads qualifiés :

```
BASE DE CONTACTS → NETTOYAGE / VÉRIFICATION → SEGMENTATION → CAMPAGNE EMAIL
→ CLIC → LANDING PAGE → FORMULAIRE → LEAD → QUALIFICATION → NOTIFICATION
COMMERCIALE → CRM → SUIVI → ANALYSE → OPTIMISATION
```

L'indicateur central du produit est le **nombre de leads qualifiés par jour**
(objectif par défaut : 10 minimum, 20 en cible haute), et non le nombre d'emails envoyés.

---

## Sommaire

1. [Ce que le produit fait — et ne fait pas](#1-ce-que-le-produit-fait--et-ne-fait-pas)
2. [Architecture](#2-architecture)
3. [Décisions techniques](#3-décisions-techniques)
4. [Modèle de données](#4-modèle-de-données)
5. [Démarrage rapide](#5-démarrage-rapide)
6. [Variables d'environnement](#6-variables-denvironnement)
7. [Fournisseurs externes](#7-fournisseurs-externes)
8. [Authentification de domaine](#8-authentification-de-domaine)
9. [Webhooks](#9-webhooks)
10. [Landing pages et domaines](#10-landing-pages-et-domaines)
11. [Pages externes : capture sur un site existant](#11-pages-externes--capture-sur-un-site-existant)
12. [Rôles et permissions](#12-rôles-et-permissions)
13. [Conformité et traçabilité](#13-conformité-et-traçabilité)
14. [Tests](#14-tests)
15. [Déploiement en production](#15-déploiement-en-production)
16. [Sauvegardes](#16-sauvegardes)
17. [Sécurité](#17-sécurité)
18. [Comptes de test](#18-comptes-de-test)
19. [État de livraison](#19-état-de-livraison)

---

## 1. Ce que le produit fait — et ne fait pas

Ces limites sont volontaires et visibles dans l'interface.

**Le produit fait :**

- Importer, dédupliquer et nettoyer une base de contacts (CSV/XLSX) en conservant la provenance de chaque enregistrement.
- Vérifier les adresses email via un fournisseur externe ou une vérification locale (syntaxe, domaines jetables, MX).
- Segmenter la base côté base de données, y compris sur des segments de plus de 100 000 contacts.
- Rédiger des emails avec assistance IA, sous contraintes explicites (aucun tarif, aucune économie chiffrée, aucune garantie inventée).
- Envoyer par lots, avec limites quotidiennes, montée en charge progressive, reprises et idempotence.
- Publier des landing pages et des formulaires multi-étapes, et créer un lead par soumission.
- Qualifier chaque lead avec un score explicable, notifier l'équipe, assigner, suivre le délai de première réponse.
- Mesurer l'intégralité de l'entonnoir à partir d'événements réellement enregistrés.
- Surveiller la délivrabilité : SPF/DKIM/DMARC, rebonds, plaintes, volumes.

**Le produit ne fait pas :**

- **Aucune garantie de placement en boîte de réception principale.** Aucun outil ne peut l'offrir. L'application parle d'« améliorer la délivrabilité », jamais de la garantir.
- **Aucun contournement de filtre anti-spam**, et aucun réseau de faux échanges destiné à manipuler la réputation. Le « warm-up » consiste à augmenter progressivement des volumes légitimes.
- **Aucune déduction de consentement.** Un consentement non documenté reste « inconnu ».
- **Aucune évaluation juridique.** L'application fournit la traçabilité (consentement, provenance, suppression, audit) ; la légalité de chaque envoi reste sous la responsabilité de l'annonceur.
- **Aucun envoi automatique de réponse.** L'IA propose un brouillon ; un humain valide et envoie.

---

## 2. Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Next.js 14 — App Router                                     │
│                                                              │
│  app/(app)/…      Interface authentifiée (React, Tailwind)   │
│  app/(auth)/…     Connexion et inscription                   │
│  app/p/[slug]     Landing pages publiques                    │
│  app/c/[token]    Redirection CTA + suivi du clic            │
│  app/u/[token]    Désinscription                             │
│  app/api/…        Webhooks, upload, recherche, notifications │
└───────────────┬──────────────────────────────────────────────┘
                │ Server Actions (toutes les mutations)
┌───────────────▼──────────────────────────────────────────────┐
│  server/context.ts   Garde d'autorisation — chaque action    │
│                      passe par requireWorkspace(permission)  │
│                                                              │
│  server/services/    Logique métier                          │
│    sending           File d'envoi, invariants, idempotence   │
│    suppression       Liste de suppression (invariant dur)    │
│    segments          Compilation des règles → SQL            │
│    lead-intake       Formulaire → contact → lead → automat.  │
│    lead-scoring      Qualification explicable                │
│    readiness         Contrôle de préparation d'une campagne  │
│    analytics         Entonnoir, objectifs, prévisions        │
│    automations       Règles « quand … alors … »              │
│    deliverability    Vérifications DNS                       │
│    webhooks          Ingestion idempotente                   │
│    import            CSV/XLSX par tranches                   │
│    queue             File durable PostgreSQL                 │
│                                                              │
│  server/providers/   Adaptateurs remplaçables                │
│    email             SMTP · Brevo · Mailgun · SES · Postmark │
│                      · DEMO                                  │
│    ai                Anthropic · OpenAI · DEMO               │
│    verification      ZeroBounce · NeverBounce · Hunter ·     │
│                      local (MX) · DEMO                       │
└───────────────┬──────────────────────────────────────────────┘
                │ Prisma
┌───────────────▼──────────────────────────────────────────────┐
│  PostgreSQL — données métier + file de tâches                │
└──────────────────────────────────────────────────────────────┘
                ▲
┌───────────────┴──────────────────────────────────────────────┐
│  Worker (`npm run worker`)                                   │
│  Envoi par lots · vérification · imports volumineux ·        │
│  alertes de délai · notifications email                      │
└──────────────────────────────────────────────────────────────┘
```

### Cloisonnement multi-espaces

Chaque table métier porte un `workspaceId`. Toute lecture et toute écriture
passe par `requireWorkspace(permission)`, qui résout l'appartenance de
l'utilisateur avant de rendre la main. Aucune requête ne fait confiance à un
identifiant fourni par le client. Un test vérifie explicitement qu'un espace ne
peut pas atteindre les contacts d'un autre.

---

## 3. Décisions techniques

### File d'attente sur PostgreSQL plutôt que Redis / BullMQ

Le cahier des charges suggérait Redis et BullMQ. La file est implémentée sur
PostgreSQL avec `SELECT … FOR UPDATE SKIP LOCKED`.

Raison : la garantie « un destinataire ne reçoit jamais deux fois le même
email » est plus solide quand la prise du job et la transition d'état du
destinataire vivent dans la même base. Avec un courtier séparé, il existe une
fenêtre « envoyé mais non enregistré » en cas de panne entre les deux systèmes.
`FOR UPDATE SKIP LOCKED` supporte plusieurs workers concurrents, offre la
persistance, les reprises avec backoff exponentiel et la récupération des jobs
dont le worker est mort.

Le module `server/services/queue.ts` expose une API (`enqueue`, `claimJobs`,
`completeJob`, `failJob`) derrière laquelle un pilote BullMQ peut être ajouté
si un besoin de très haut débit apparaît. Redis reste utile pour un cache ou
une limitation de débit partagée entre instances (`REDIS_URL`).

### Authentification maison plutôt qu'Auth.js

Un seul mode de connexion est nécessaire (email + mot de passe) avec des
sessions révocables côté serveur. L'implémentation retenue : `bcrypt` pour le
hachage, un cookie httpOnly contenant un JWT signé (`jose`), et une ligne
`Session` en base — la révocation est donc immédiate et réelle. Auth.js reste
substituable : tout passe par `lib/auth.ts` et `server/context.ts`.

### Fournisseurs DEMO

Sans clé d'API, l'application reste entièrement fonctionnelle grâce à des
implémentations DEMO qui respectent les mêmes interfaces :

- **Email DEMO** : aucun message n'est transmis. Chaque « envoi » est tracé
  dans le journal d'audit avec le corps personnalisé et l'URL de CTA réelle, ce
  qui permet de dérouler tout le parcours.
- **IA DEMO** : générateur déterministe à base de règles — ce n'est pas un
  modèle de langage. Chaque réponse est marquée `simulated` et affichée comme
  « DEMO » dans l'interface.
- **Vérification DEMO / locale** : la version locale effectue une vraie
  résolution MX et détecte les domaines jetables et les adresses génériques.
  Elle ne teste pas l'existence de la boîte : son meilleur verdict est
  « probablement valide », jamais un « valide » issu d'un sondage SMTP.

Aucun comportement simulé n'est présenté comme un comportement de production.

### Rendu des landing pages

Les pages sont stockées comme une liste de sections typées (JSON) et rendues
par un composant unique, utilisé à la fois par la page publique et par l'aperçu
en direct de l'éditeur. L'aperçu montre donc exactement le rendu final, et une
soumission depuis l'aperçu est explicitement simulée.

---

## 4. Modèle de données

Modèles principaux (`prisma/schema.prisma`) :

| Domaine | Modèles |
|---|---|
| Tenance | `User`, `Workspace`, `WorkspaceMember`, `Session`, `CompliancePolicy`, `InsuranceProduct` |
| Contacts | `Contact`, `ContactSource`, `ConsentRecord`, `ContactCustomField`, `ImportBatch`, `VerificationResult` |
| Segments | `Segment`, `SegmentContact` |
| Envoi | `SendingDomain`, `EmailAccount`, `EmailThread`, `EmailMessage` |
| Campagnes | `Campaign`, `CampaignVariant`, `CampaignRecipient`, `CampaignEvent`, `Template` |
| Acquisition | `LandingPage`, `LandingPageVersion`, `Form`, `FormField`, `FormSubmission` |
| CRM | `Lead`, `LeadScore`, `LeadAssignment`, `LeadActivity`, `Task` |
| Conformité | `SuppressionEntry`, `AuditLog` |
| Ops | `AutomationRule`, `AutomationExecution`, `Integration`, `Notification`, `DailyGoal`, `ApiUsage`, `Job` |

Points structurants :

- `CampaignRecipient.sendKey` est **unique** : dérivée de `(campaignId, contactId)`, elle rend impossible un second envoi.
- `CampaignEvent.dedupeKey` est **unique** : un webhook rejoué ne crée aucun doublon.
- `Lead.submissionId` est **unique** : une soumission produit exactement un lead.
- `Job.dedupeKey` est **unique** : un job planifié deux fois n'est enregistré qu'une fois.
- Index sur `(workspaceId, …)` pour toutes les listes paginées.

---

## 5. Démarrage rapide

### Prérequis

- Node.js 20 ou 22
- PostgreSQL 14 ou supérieur

### Installation

```bash
cd assurlead
npm install

cp .env.example .env
# Renseignez au minimum DATABASE_URL, AUTH_SECRET et ENCRYPTION_KEY.
# Générer un secret : openssl rand -base64 32

npx prisma migrate deploy      # ou `npm run db:push` en développement
npm run seed                   # comptes de test + espace de travail
npm run seed:demo              # 5 000 contacts et un historique de démonstration
```

### Lancement

```bash
npm run dev        # application  → http://localhost:3000
npm run worker     # worker de tâches de fond (second terminal)
```

Le worker traite la file d'envoi, la vérification des adresses, les imports
volumineux et les alertes de délai. Sans lui, l'application reste utilisable :
les imports de moins de 3 000 lignes s'exécutent immédiatement, et un bouton
« Traiter un lot maintenant » permet de faire avancer une campagne à la main.

### Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Serveur de production |
| `npm run worker` | Worker de tâches de fond |
| `npm run lint` | ESLint |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires et d'intégration (Vitest) |
| `npm run test:e2e` | Tests navigateur (Playwright) |
| `npm run e2e` | Vérification du parcours complet contre l'app lancée |
| `npm run db:migrate` | Nouvelle migration Prisma |
| `npm run db:deploy` | Appliquer les migrations en production |
| `npm run db:studio` | Explorateur de base Prisma |
| `npm run seed` | Comptes de test |
| `npm run seed:demo` | Données de démonstration |

---

## 6. Variables d'environnement

`.env.example` documente chaque variable. Résumé :

### Obligatoires

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL |
| `AUTH_SECRET` | Signature des sessions — 32 caractères aléatoires minimum |
| `ENCRYPTION_KEY` | Chiffrement AES-256-GCM des identifiants fournisseurs stockés en base |
| `APP_URL` | URL publique — liens de suivi, landing pages, webhooks |

> Modifier `ENCRYPTION_KEY` rend illisibles les identifiants déjà enregistrés :
> ils devront être ressaisis.

### Fournisseurs (facultatifs — DEMO par défaut)

| Variable | Valeurs |
|---|---|
| `EMAIL_PROVIDER` | `demo` · `smtp` · `brevo` · `mailgun` · `ses` · `postmark` |
| `VERIFICATION_PROVIDER` | `local` · `demo` · `zerobounce` · `neverbounce` · `hunter` |
| `AI_PROVIDER` | `demo` · `anthropic` · `openai` |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Clé et modèle Anthropic |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Clé et modèle OpenAI |
| `ZEROBOUNCE_API_KEY`, `NEVERBOUNCE_API_KEY`, `HUNTER_API_KEY` | Vérification d'adresses |
| `AI_MONTHLY_REQUEST_CAP` | Plafond mensuel de requêtes IA par espace (défaut : 5 000) |

Les identifiants d'envoi sont normalement saisis dans l'interface
(« Comptes Email ») et stockés chiffrés ; les variables ci-dessus servent de
repli et de configuration globale.

### Exploitation

| Variable | Défaut | Rôle |
|---|---|---|
| `WORKER_POLL_MS` | `2000` | Intervalle de scrutation du worker |
| `WORKER_BATCH` | `10` | Jobs pris par cycle |
| `UPLOAD_DIR` | `.uploads` | Fichiers d'import en transit |
| `REDIS_URL` | — | Facultatif : cache / limitation de débit partagée |

---

## 7. Fournisseurs externes

### Clés encore nécessaires pour un usage réel

| Fournisseur | Nécessaire pour | Sans clé |
|---|---|---|
| Envoi (Brevo, Mailgun, SES, Postmark ou SMTP) | Envoyer de vrais emails | Fournisseur DEMO : parcours complet, aucun envoi réel |
| Vérification (ZeroBounce, NeverBounce, Hunter) | Confirmer l'existence des boîtes | Vérification locale : syntaxe, domaines jetables, MX |
| IA (Anthropic ou OpenAI) | Rédaction et analyse par modèle de langage | Générateur DEMO déterministe, signalé comme tel |

### Connecter un fournisseur d'envoi

1. **Comptes Email → Ajouter un compte d'envoi**
2. Choisir le fournisseur, renseigner l'expéditeur et les identifiants.
3. **Tester la connexion**, puis **Email de test**.
4. Renseigner le secret de webhook dans **Intégrations** (voir §9).

Champs par fournisseur :

- **SMTP** — serveur, port, TLS, utilisateur, mot de passe
- **Brevo** — clé API
- **Mailgun** — clé API, domaine, région (`eu` ou `us`)
- **Amazon SES** — access key, secret key, région
- **Postmark** — server token, message stream

---

## 8. Authentification de domaine

Trois enregistrements DNS conditionnent l'acceptation de vos messages.
L'écran **Délivrabilité** les vérifie réellement (résolution DNS) et affiche les
valeurs à créer.

| Type | Hôte | Valeur |
|---|---|---|
| TXT | `votredomaine.fr` | `v=spf1 include:<fournisseur> -all` |
| TXT | `assurlead._domainkey.votredomaine.fr` | `v=DKIM1; k=rsa; p=<clé publique du fournisseur>` |
| TXT | `_dmarc.votredomaine.fr` | `v=DMARC1; p=none; rua=mailto:dmarc@votredomaine.fr` |
| CNAME | `liens.votredomaine.fr` | domaine de tracking du fournisseur *(facultatif)* |

Démarrez DMARC en observation (`p=none`), analysez les rapports pendant
quelques semaines, puis passez à `quarantine` puis `reject`.

La propagation DNS peut prendre plusieurs heures. Ces réglages **améliorent** la
délivrabilité ; ils ne la garantissent pas.

---

## 9. Webhooks

Les webhooks remontent délivrances, rebonds, plaintes et désinscriptions.

**URL** — visible dans **Délivrabilité** :

```
https://votre-app.fr/api/webhooks/<fournisseur>?ws=<workspaceId>
```

`<fournisseur>` : `brevo`, `mailgun`, `postmark` ou `ses`.

**Signature** — renseignez le secret dans **Intégrations → webhooks**. En
production, un événement dont la signature n'est pas vérifiable est **refusé**
(HTTP 401). En développement, l'absence de secret est tolérée.

| Fournisseur | Vérification |
|---|---|
| Brevo | Jeton partagé dans l'en-tête `x-sib-token` |
| Mailgun | HMAC-SHA256 sur `timestamp + token` |
| Postmark | Jeton dans l'en-tête `x-postmark-token` |
| Amazon SES | Jeton partagé dans `x-assurlead-token` |

**Idempotence** — chaque événement porte une `dedupeKey` unique. Une
redélivrance est comptée comme doublon et ignorée : ni événement dupliqué, ni
effet de bord rejoué. Un test couvre ce comportement.

Effets automatiques : un rebond définitif ou une plainte ajoute l'adresse à la
liste de suppression et marque le destinataire ; une désinscription retire le
consentement et annule les envois programmés.

---

## 10. Landing pages et domaines

Une page publiée est servie sur :

```
https://votre-app.fr/p/<slug>
```

Le CTA d'un email pointe vers `/c/<jeton>` : le clic est enregistré, puis le
visiteur est redirigé vers la page avec son jeton de suivi, ce qui relie visite,
formulaire et lead à la campagne d'origine.

**Domaine personnalisé** — le champ est disponible dans l'onglet SEO de
l'éditeur. Pour l'activer :

1. Créez un `CNAME` de `devis.votredomaine.fr` vers l'hôte de l'application.
2. Ajoutez le domaine dans votre hébergeur (par exemple le tableau de bord Vercel) pour obtenir un certificat TLS.
3. Renseignez-le dans l'éditeur.

Le routage par domaine personnalisé nécessite un reverse-proxy ou un middleware
qui associe l'hôte entrant à la page correspondante ; la valeur est stockée et
prête à être exploitée.

---

## 11. Pages externes : capture sur un site existant

Le client n'est pas obligé d'utiliser les landing pages de l'application. Quand
la page existe déjà — par exemple `https://choix-senior.online/etude-comparative` —
une campagne peut pointer directement dessus et les leads reviennent quand même
dans l'entonnoir, rattachés à la campagne et au contact d'origine.

### Déclarer le site

*Intégrations → Pages externes → Ajouter une page.* On y renseigne l'URL, le
formulaire de destination (créé en un clic si besoin), le produit, le texte de
consentement et les **origines autorisées**. Deux clés sont générées :

| Clé | Préfixe | Usage | Visibilité |
| --- | --- | --- | --- |
| Clé publique | `alp_…` | appels depuis le navigateur du visiteur | publique, contrôlée par l'origine |
| Clé secrète | `als_…` | appels serveur-à-serveur (`Authorization: Bearer …`) | affichée **une seule fois**, stockée hachée |

La clé publique seule ne suffit pas : une requête navigateur n'est acceptée que
si son en-tête `Origin` figure dans la liste des origines autorisées, sinon la
réponse est `403`.

### Brancher la page

Une seule ligne à ajouter dans le `<head>` de la page du client :

```html
<script src="https://votre-app.fr/api/embed" data-key="alp_votre_cle" defer></script>
```

Le script est autonome (aucune dépendance), et :

- mémorise le paramètre `alid` ajouté par le CTA de l'email, pour toute la session ;
- enregistre la visite (`LANDING_VIEW`) ;
- surveille les formulaires de la page et transmet leur contenu à la soumission ;
- expose `window.assurlead.submit(champs)`, `.step(n)` et `.start()` pour les
  formulaires pilotés en JavaScript ;
- ignore tout formulaire portant l'attribut `data-assurlead-ignore` ;
- n'interrompt jamais le fonctionnement de la page hôte en cas d'erreur.

### Envoi depuis le serveur du client

```bash
curl -X POST https://votre-app.fr/api/capture/lead \
  -H 'authorization: Bearer als_votre_cle_secrete' \
  -H 'content-type: application/json' \
  -d '{"key":"alp_votre_cle","token":"<alid>","fields":{"Prénom":"Simone","E-mail":"s@exemple.fr","Téléphone":"0612345678","consentement_rgpd":true}}'
```

Les noms de champs sont normalisés puis rapprochés d'une table d'alias
(`prenom`, `nom`, `e-mail`, `telephone`, `code postal`, …), donc les libellés
du formulaire existant n'ont pas besoin d'être renommés. Une requête sans email
**ni** téléphone est refusée (`422`) : sans moyen de contact il n'y a pas de lead.

### Ce que la capture externe ne fait pas

- **Le consentement n'est jamais supposé.** Sans case cochée transmise, le
  contact est créé avec un consentement `INCONNU` et n'entre pas dans les
  audiences d'envoi. C'est au client d'ajouter la case sur sa page.
- **Un jeton `alid` d'un autre espace de travail est rejeté**, jamais rattaché.
- **La provenance est ajoutée, jamais écrasée** : un contact déjà connu conserve
  sa source d'origine et reçoit une ligne de provenance supplémentaire.

Vérification de bout en bout, contre l'application lancée :

```bash
npm run e2e:capture     # 19 étapes : redirection CTA, snippet, capture navigateur,
                        # origine refusée, capture serveur, clé invalide,
                        # consentement inconnu, entonnoir, compteurs
```

---

## 12. Rôles et permissions

| Rôle | Périmètre |
|---|---|
| **Propriétaire** | Tout, y compris la gestion de l'espace de travail |
| **Administrateur** | Campagnes, contacts, leads, paramètres, intégrations |
| **Marketing** | Contacts, segments, campagnes, landing pages, templates, analytics |
| **Commercial** | Leads, CRM, tâches, inbox, notes |
| **Lecteur** | Lecture seule |

Les permissions sont déclarées dans `lib/rbac.ts` et vérifiées **côté serveur**
à chaque action. Les contrôles côté client ne servent qu'à masquer ce qui est de
toute façon refusé par le serveur.

---

## 13. Conformité et traçabilité

L'application fournit des outils ; elle ne rend pas un avis juridique.

**Traçabilité par contact** : source, détail de la source, date d'import,
état du consentement email et téléphone, date et origine du consentement,
note de base légale, historique complet des changements de consentement,
date de désinscription.

**Politique configurable** (*Paramètres → Conformité*) — c'est le client qui
décide, pas l'application :

- Exiger un consentement enregistré, ou non.
- Autoriser ou exclure les contacts au consentement inconnu.
- Exiger une source documentée.
- Traiter les adresses catch-all, risquées ou non vérifiées.
- Choisir quels avertissements **bloquent** le lancement d'une campagne.
- Fixer un score de préparation minimum.

**Toujours appliqué, non configurable** : les adresses `INVALIDE` et les
contacts de la liste de suppression sont exclus de tout envoi.

**Liste de suppression** — motifs : désinscription, ne pas contacter, rebond
définitif, plainte, blocage manuel, adresse invalide. Import et export CSV.
Le contrôle est refait **au moment de chaque envoi**, jamais seulement à la
création de la campagne.

**Droits des personnes** : export complet des données d'un contact (JSON),
suppression définitive, historique de consentement horodaté, journal d'audit.

**Journal d'audit** : imports, lancements et pauses de campagne, modifications
de consentement, ajouts et retraits de suppression, changements de rôle,
modifications de politique, exports.

---

## 14. Tests

```bash
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm test               # Vitest — invariants, entonnoir, webhooks, isolation
npm run test:e2e       # Playwright — parcours navigateur
npm run e2e            # Parcours complet contre l'app lancée
```

Les tests Vitest utilisent la base configurée par `DATABASE_URL` et créent un
espace de travail isolé qu'ils suppriment ensuite. Pour une base dédiée, créez
un `.env.test`.

Les tests Playwright ont besoin d'une base peuplée (`npm run seed` puis
`npm run seed:demo`). Ils démarrent le serveur de développement par défaut ;
pour les exécuter contre un build de production — plus rapide et plus proche du
réel :

```bash
npm run build && npx next start -p 3100 &
APP_URL=http://localhost:3100 PLAYWRIGHT_NO_SERVER=1 npm run test:e2e
```

La suite se connecte **une seule fois** (projet `setup`) et réutilise la
session : se reconnecter à chaque test déclencherait la limitation de débit sur
la page de connexion. Le formulaire de connexion lui-même est testé dans un
contexte non authentifié dédié. Le projet `mobile` rejoue les parcours au format
téléphone et vérifie qu'aucune page ne déborde horizontalement.

### Invariants couverts

| # | Invariant | Fichier |
|---|---|---|
| 1 | Un contact supprimé ne reçoit jamais d'email — y compris si la suppression arrive après la constitution de la liste | `sending-invariants` |
| 2 | Une adresse invalide ne reçoit jamais d'email | `sending-invariants` |
| 3 | Une reprise de job ne produit jamais de doublon, y compris sur envois concurrents | `sending-invariants` |
| 4 | Un webhook rejoué ne crée jamais d'événement en double | `webhooks-isolation` |
| 5 | Une désinscription annule immédiatement tous les envois programmés | `webhooks-isolation` |
| 6 | Une campagne ne part jamais sans lancement explicite | `sending-invariants` |
| 7 | Un espace de travail ne voit jamais les données d'un autre | `webhooks-isolation` |
| 8 | Une soumission de formulaire crée exactement un lead | `funnel` |
| 9 | Les analytics reflètent les événements réellement enregistrés | `funnel` |
| 10 | L'import traite un gros fichier côté serveur, sans hypothèse sur la mémoire du navigateur | `webhooks-isolation` |

Sont également couverts : la politique de conformité qui pilote l'éligibilité,
la personnalisation (jamais « Bonjour undefined »), le scoring des leads, et
l'enregistrement des visites de landing page.

### Vérification du parcours complet

`npm run e2e` déroule, contre l'application lancée, les 27 étapes du parcours :
import → vérification → segment → rédaction IA → landing page → expéditeur →
contrôle de préparation → lancement explicite → file d'envoi → envoi → clic HTTP
réel → chargement de la page → soumission → lead → score → notification →
assignation → tâche → CRM → chronologie → analytics → objectif du jour →
désinscription.

---

## 15. Déploiement en production

### Avant la mise en ligne

- [ ] `AUTH_SECRET` et `ENCRYPTION_KEY` générés aléatoirement et stockés dans un gestionnaire de secrets
- [ ] `APP_URL` sur le domaine public en HTTPS
- [ ] `npx prisma migrate deploy` exécuté
- [ ] Un fournisseur d'envoi réel connecté et testé
- [ ] SPF, DKIM et DMARC vérifiés au vert
- [ ] Secrets de webhook renseignés (sinon les événements sont refusés)
- [ ] Politique de conformité et mentions légales complétées
- [ ] Données de démonstration supprimées (*Paramètres → Espace*)
- [ ] Worker lancé et supervisé
- [ ] Sauvegardes PostgreSQL en place

### Processus

Deux processus partagent la même base et le même `UPLOAD_DIR` :

```bash
npm run build && npm start   # web
npm run worker               # worker (au moins un, plusieurs possibles)
```

Plusieurs workers peuvent tourner en parallèle : `FOR UPDATE SKIP LOCKED`
garantit qu'un job n'est traité que par un seul.

### Docker

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./
EXPOSE 3000
CMD ["npm", "start"]
```

Le worker utilise la même image avec `CMD ["npm", "run", "worker"]`.

### Plateformes gérées

Sur Vercel ou équivalent, l'application web se déploie directement. Le worker
étant un processus long, hébergez-le ailleurs (conteneur, VM) ou déclenchez
`dispatchCampaignBatch` par tâche planifiée. Le répertoire d'import doit être un
volume partagé ou un stockage objet.

---

## 16. Sauvegardes

Toutes les données métier sont dans PostgreSQL.

```bash
# Sauvegarde quotidienne
pg_dump --format=custom --file=assurlead-$(date +%F).dump "$DATABASE_URL"

# Restauration
pg_restore --clean --if-exists --dbname="$DATABASE_URL" assurlead-2026-09-02.dump
```

Points d'attention :

- Conservez `ENCRYPTION_KEY` avec la sauvegarde : sans elle, les identifiants fournisseurs restaurés sont illisibles.
- `UPLOAD_DIR` ne contient que des fichiers d'import en transit ; il n'a pas besoin d'être sauvegardé.
- Testez une restauration régulièrement.
- Purgez les données au-delà de la durée de conservation configurée (*Paramètres → Conformité*).

---

## 17. Sécurité

- **Mots de passe** : bcrypt, coût 11.
- **Sessions** : cookie httpOnly, `SameSite=Lax`, `Secure` en production ; JWT signé HS256 ; ligne `Session` en base permettant une révocation immédiate.
- **Autorisation** : `requireWorkspace(permission)` sur chaque action serveur, avant toute requête.
- **Cloisonnement** : `workspaceId` obligatoire sur toutes les requêtes métier.
- **Validation** : Zod sur toutes les entrées, y compris les formulaires publics (les champs obligatoires sont revérifiés côté serveur).
- **Secrets** : identifiants fournisseurs chiffrés en AES-256-GCM ; jamais renvoyés au navigateur, seulement masqués.
- **Webhooks** : signature vérifiée ; comparaison en temps constant ; refus en production sans secret.
- **Limitation de débit** : connexion, soumission de formulaire, désinscription, téléversement, requêtes IA et webhooks.
- **Injection SQL** : requêtes paramétrées via Prisma ; les rares requêtes brutes utilisent des paramètres liés.
- **XSS** : échappement systématique dans le HTML des emails ; React échappe le reste ; aucun `dangerouslySetInnerHTML`.
- **En-têtes** : `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Jetons** : liens de suivi et de désinscription en 144 bits, non devinables.
- **IP** : hachées avec sel avant stockage, jamais conservées en clair.
- **Budget** : plafond mensuel de requêtes IA pour éviter toute dépense accidentelle.

À prévoir avant une exposition large : rotation des secrets, journalisation
centralisée, surveillance des erreurs, et une limitation de débit partagée
(Redis) si plusieurs instances web tournent en parallèle.

---

## 18. Comptes de test

Créés par `npm run seed` — **à supprimer avant toute mise en production**.

| Rôle | Email | Mot de passe |
|---|---|---|
| Propriétaire | `owner@assurlead.fr` | `Assurlead2026!` |
| Administrateur | `admin@assurlead.fr` | `Assurlead2026!` |
| Marketing | `marketing@assurlead.fr` | `Assurlead2026!` |
| Commercial | `sales@assurlead.fr` | `Assurlead2026!` |
| Commercial | `sales2@assurlead.fr` | `Assurlead2026!` |
| Lecteur | `viewer@assurlead.fr` | `Assurlead2026!` |

`npm run seed:demo` ajoute 5 000 contacts, 4 segments, 3 campagnes avec leur
historique, 5 landing pages publiées et environ 70 leads. **Toutes ces données
portent le marqueur DÉMO** et sont supprimables en un clic depuis
*Paramètres → Espace*.

---

## 19. État de livraison

### Livré et vérifié

Import CSV/XLSX avec reconnaissance des colonnes, détection des doublons et
quatre stratégies de fusion · vérification des adresses · segmentation statique
et dynamique, avec proposition assistée par IA · assistant de campagne complet ·
rédaction IA sous contraintes · moteur d'envoi par lots avec limites,
montée en charge et idempotence · contrôle de préparation avec score ·
constructeur de landing pages avec aperçu en direct · constructeur de
formulaires multi-étapes avec champs conditionnels · qualification des leads
avec explication · CRM par glisser-déposer · tâches · inbox avec classification
IA et réponse validée par un humain · automatisations · analytics d'entonnoir ·
objectifs quotidiens et prévisions étiquetées comme estimations · délivrabilité
avec vérification DNS réelle · webhooks idempotents et signés · liste de
suppression · journal d'audit · rôles et permissions · interface française et
anglaise · thèmes clair, sombre et système · PWA installable · capture de leads
depuis une page hébergée par le client (script embarquable, API navigateur et
API serveur-à-serveur, contrôle d'origine et clé secrète hachée).

### Partiellement livré

| Sujet | État |
|---|---|
| **Test A/B** | Répartition déterministe des variantes, suivi des résultats par variante et interface à deux versions en place. L'écran de comparaison statistique dédié (taille d'échantillon, intervalle de confiance) reste à construire ; les données nécessaires sont déjà enregistrées. |
| **Synchronisation des réponses** | Rattachement au contact, à la campagne et au lead, classification IA et réponse depuis l'inbox : opérationnels. L'ingestion se fait par webhook lorsque le fournisseur l'expose, ou par saisie manuelle. Il n'y a pas encore de connecteur IMAP ni OAuth Gmail/Microsoft. |
| **Domaines personnalisés** | Champ, stockage et instructions DNS en place. Le routage par hôte demande un middleware ou un reverse-proxy à configurer selon l'hébergement. |
| **Notifications SMS / Slack / WhatsApp** | Le service de notification est conçu en adaptateurs ; seuls les canaux in-app et email sont implémentés. |
| **Facturation** | La consommation (emails, vérifications, requêtes et jetons IA) est mesurée et affichée, avec un plafond mensuel pour l'IA. Aucun système de facturation n'est branché. |
| **Google Sheets** | Non implémenté ; l'import passe par CSV/XLSX. |

### À prévoir avant une exploitation à grande échelle

- Limitation de débit partagée (Redis) si plusieurs instances web tournent.
- Supervision du worker et alerte sur les jobs en échec.
- Purge planifiée des données au-delà de la durée de conservation configurée.
- Rotation des secrets et journalisation centralisée.
