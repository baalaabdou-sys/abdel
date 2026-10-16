/** Fuseau horaire de référence pour toutes les dates du site. */
export const TZ = 'Africa/Casablanca';

/**
 * Convertit une date « murale » de Casablanca (AAAA-MM-JJ + HH:MM)
 * en instant absolu, en tenant compte du décalage réel ce jour-là
 * (UTC+1 la majeure partie de l'année, UTC+0 pendant le Ramadan).
 */
export function casablanca(date: string, heure = '00:00'): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = heure.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (t: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hourCycle: 'h23',
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
    }).formatToParts(new Date(t));
    const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute')) - t;
  };
  let t = guess - offsetAt(guess);
  t = guess - offsetAt(t);
  return new Date(t);
}

/** Valeur AAAA-MM-JJ, que le frontmatter fournisse une chaîne ou une Date. */
export function ymd(v: string | Date): string {
  return typeof v === 'string' ? v : v.toISOString().slice(0, 10);
}

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...opts });

function asUtcNoon(v: string | Date) {
  return new Date(`${ymd(v)}T12:00:00Z`);
}

/** « 28 octobre 2026 » */
export function dateLongue(v: string | Date) {
  return fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(asUtcNoon(v));
}

/** « mercredi 28 octobre 2026 » */
export function dateAvecJour(v: string | Date) {
  return fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(asUtcNoon(v));
}

/** « octobre 2026 » */
export function moisAnnee(v: string | Date) {
  return fmt({ month: 'long', year: 'numeric' }).format(asUtcNoon(v));
}

/**
 * Plage lisible : « 28 · 29 · 30 octobre 2026 » pour des jours consécutifs
 * d'un même mois (style de l'affiche), sinon « 30 octobre → 2 novembre 2026 ».
 */
export function plageDates(debut: string | Date, fin?: string | Date) {
  const a = asUtcNoon(debut);
  if (!fin || ymd(fin) === ymd(debut)) return dateLongue(debut);
  const b = asUtcNoon(fin);
  const jours = Math.round((b.getTime() - a.getTime()) / 864e5);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) {
    if (jours <= 4) {
      const liste = Array.from({ length: jours + 1 }, (_, i) => a.getUTCDate() + i).join(' · ');
      return `${liste} ${moisAnnee(debut)}`;
    }
    return `${a.getUTCDate()} → ${dateLongue(fin)}`;
  }
  return `${fmt({ day: 'numeric', month: 'long' }).format(a)} → ${dateLongue(fin)}`;
}

/** « mercredi → vendredi » */
export function plageJours(debut: string | Date, fin?: string | Date) {
  const j = fmt({ weekday: 'long' });
  if (!fin || ymd(fin) === ymd(debut)) return j.format(asUtcNoon(debut));
  return `${j.format(asUtcNoon(debut))} → ${j.format(asUtcNoon(fin))}`;
}

/** « 9h00 » */
export function heureFr(h?: string) {
  if (!h) return '';
  const [hh, mm] = h.split(':');
  return `${Number(hh)}h${mm}`;
}
