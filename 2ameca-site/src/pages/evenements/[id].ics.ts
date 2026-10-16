import type { APIRoute, GetStaticPaths } from 'astro';
import { getEvenements, type Evenement } from '../../lib/collections';
import { casablanca, ymd } from '../../lib/dates';

export const getStaticPaths = (async () => {
  const evts = await getEvenements();
  return evts.map((e) => ({ params: { id: e.id }, props: { evenement: e } }));
}) satisfies GetStaticPaths;

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');

/** Fichier .ics : un créneau par jour pour les événements sur plusieurs jours. */
export const GET: APIRoute = ({ props, site }) => {
  const e = (props as { evenement: Evenement }).evenement;
  const debut = new Date(`${ymd(e.data.dateDebut)}T12:00:00Z`);
  const fin = new Date(`${ymd(e.data.dateFin ?? e.data.dateDebut)}T12:00:00Z`);
  const lieu = [e.data.lieu, e.data.lieuDetail].filter(Boolean).join(', ');
  const lignes = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Club 2AMECA//Site//FR', 'CALSCALE:GREGORIAN'];
  for (let d = debut; d <= fin; d = new Date(d.getTime() + 864e5)) {
    const jour = d.toISOString().slice(0, 10);
    const s = casablanca(jour, e.data.heure);
    const f = casablanca(jour, e.data.heureFin ?? '17:00');
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${e.id}-${jour}@2ameca`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(s)}`,
      `DTEND:${stamp(f)}`,
      `SUMMARY:${esc(e.data.titre)} — Club 2AMECA`,
      `LOCATION:${esc(lieu)}`,
      `DESCRIPTION:${esc(e.data.resume)}`,
      `URL:${new URL(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/evenements/${e.id}/`, site)}`,
      'END:VEVENT',
    );
  }
  lignes.push('END:VCALENDAR');
  return new Response(lignes.join('\r\n'), { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
};
