import { SUPABASE_URL } from '../config';

/** Adresse publique d'une image du stockage « medias » (galerie, logos). */
export const urlMedia = (chemin: string) => `${SUPABASE_URL}/storage/v1/object/public/medias/${chemin}`;

/**
 * Réduit une photo avant l'envoi (téléphones : souvent 4 à 8 Mo).
 * Plus grand côté ≤ `max` px, JPEG qualité 0,82. Les PNG (logos) restent en PNG.
 */
export async function reduireImage(fichier: File, max = 1600): Promise<{ blob: Blob; ext: string; type: string }> {
  const png = fichier.type === 'image/png';
  const bitmap = await createImageBitmap(fichier).catch(() => null);
  if (!bitmap) return { blob: fichier, ext: png ? '.png' : '.jpg', type: fichier.type || 'image/jpeg' };
  const echelle = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * echelle);
  canvas.height = Math.round(bitmap.height * echelle);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = png ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('Image illisible'))), type, 0.82));
  return { blob, ext: png ? '.png' : '.jpg', type };
}
