import writeXlsxFile from 'write-excel-file/browser';

export interface Colonne<T> { titre: string; valeur: (ligne: T) => string | number; largeur?: number }

/** Télécharge un fichier Excel (.xlsx) à partir d'une liste d'objets. */
export async function exporterExcel<T>(lignes: T[], colonnes: Colonne<T>[], fichier: string, feuille = 'Feuille 1') {
  await writeXlsxFile(lignes, {
    sheet: feuille.slice(0, 31),
    stickyRowsCount: 1,
    columns: colonnes.map((c) => ({
      header: { value: c.titre, fontWeight: 'bold' },
      cell: (l: T) => c.valeur(l),
      width: c.largeur ?? 16,
    })),
  }).toFile(fichier);
}
