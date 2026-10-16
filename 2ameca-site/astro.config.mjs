// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL : adresse publique du site (ex. https://2ameca.vercel.app).
// BASE_PATH : sous-dossier éventuel (ex. /nom-du-depot pour GitHub Pages).
// Les deux sont lus depuis l'environnement ; voir README.md › Déploiement.
const site = process.env.SITE_URL || 'https://club-2ameca.vercel.app';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
