import { getCollection, type CollectionEntry } from 'astro:content';
import { casablanca, ymd } from './dates';

export type Evenement = CollectionEntry<'evenements'> & { debut: Date; fin: Date };

/** Tous les événements publiés, triés du plus proche au plus lointain. */
export async function getEvenements(): Promise<Evenement[]> {
  const all = await getCollection('evenements', ({ data }) => !data.brouillon);
  return all
    .map((e) => ({
      ...e,
      debut: casablanca(ymd(e.data.dateDebut), e.data.heure),
      // Un événement reste « à venir » jusqu'à la fin de son dernier jour.
      fin: casablanca(ymd(e.data.dateFin ?? e.data.dateDebut), e.data.heureFin ?? '23:59'),
    }))
    .sort((a, b) => a.debut.getTime() - b.debut.getTime());
}

/** Sépare à venir / passés selon l'heure de construction du site. */
export async function getEvenementsParPeriode() {
  const now = Date.now();
  const all = await getEvenements();
  return {
    aVenir: all.filter((e) => e.fin.getTime() >= now),
    passes: all.filter((e) => e.fin.getTime() < now).reverse(),
  };
}

export async function getProjets() {
  const all = await getCollection('projets', ({ data }) => !data.brouillon);
  return all.sort((a, b) => ymd(b.data.date).localeCompare(ymd(a.data.date)));
}
