import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Date au format AAAA-MM-JJ (heure de Casablanca). */
const jour = z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.date()]);

const evenements = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/evenements' }),
  schema: ({ image }) =>
    z.object({
      titre: z.string(),
      resume: z.string().describe('Une ou deux phrases, utilisées dans les cartes et le SEO.'),
      dateDebut: jour,
      dateFin: jour.optional(),
      heure: z.string().regex(/^\d{1,2}:\d{2}$/).default('09:00'),
      heureFin: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
      lieu: z.string(),
      lieuDetail: z.string().optional(),
      programme: z.array(z.string()).default([]),
      anneeUniversitaire: z.string().optional(),
      affiche: image().optional(),
      afficheAlt: z.string().optional(),
      /** Lien d'inscription externe ; par défaut, la page « Rejoindre ». */
      inscription: z.string().optional(),
      aVerifier: z.boolean().default(false),
      brouillon: z.boolean().default(false),
    }),
});

const projets = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projets' }),
  schema: ({ image }) =>
    z.object({
      titre: z.string(),
      type: z.enum(['Projet', 'Atelier', 'Formation', 'Compétition']),
      resume: z.string(),
      date: jour,
      statut: z.enum(['En cours', 'Terminé', 'À venir']).default('En cours'),
      membres: z.array(z.string()).default([]),
      couverture: image().optional(),
      couvertureAlt: z.string().optional(),
      photos: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      enAvant: z.boolean().default(false).describe('Afficher sur la page d’accueil'),
      aVerifier: z.boolean().default(false),
      brouillon: z.boolean().default(false),
    }),
});

export const collections = { evenements, projets };
