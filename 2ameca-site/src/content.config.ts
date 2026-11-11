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
      heure: z.string().regex(/^\d{1,2}:\d{2}$/).optional().describe('Laisser vide si l’heure n’est pas connue.'),
      heureFin: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
      lieu: z.string(),
      lieuDetail: z.string().optional(),
      programme: z.array(z.string()).default([]),
      anneeUniversitaire: z.string().optional(),
      affiche: image().optional(),
      afficheAlt: z.string().optional(),
      /** Photos de l'événement, affichées sur sa page. */
      photos: z.array(z.object({ src: image(), alt: z.string() })).default([]),
      /** Légende de l'album de la galerie (ajouté depuis le tableau de bord) dont les photos s'affichent aussi. */
      album: z.string().optional(),
      /** Lien d'inscription externe ; par défaut, la page « Rejoindre ». */
      inscription: z.string().optional(),
      aVerifier: z.boolean().default(false),
      brouillon: z.boolean().default(false),
    }),
});

export const collections = { evenements };
