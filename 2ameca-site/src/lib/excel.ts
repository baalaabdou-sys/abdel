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

type Cellule = { value: string | number | null; fontWeight?: 'bold'; color?: string; backgroundColor?: string; fontSize?: number; columnSpan?: number } | null;
/** Fichier Excel en plusieurs parties (titre, résumé, puis une section par groupe : ex. Présents / Absents). */
export async function exporterSections<T>(titre: string, resume: [string, string | number][], sections: { titre: string; lignes: T[] }[],
  colonnes: Colonne<T>[], fichier: string, feuille = 'Feuille 1') {
  const n = colonnes.length;
  const vide = (): Cellule[] => colonnes.map(() => null);
  const fusion = (c: Exclude<Cellule, null>): Cellule[] => [{ ...c, columnSpan: n }, ...colonnes.slice(1).map(() => null)];
  const lignes: Cellule[][] = [];
  lignes.push(fusion({ value: titre, fontWeight: 'bold', fontSize: 14 }));
  for (const [k, v] of resume) lignes.push([{ value: k, fontWeight: 'bold' }, { value: v }, ...colonnes.slice(2).map(() => null)]);
  for (const s of sections) {
    lignes.push(vide());
    lignes.push(fusion({ value: `${s.titre} (${s.lignes.length})`, fontWeight: 'bold', color: '#FFFFFF', backgroundColor: '#0A4A7A' }));
    lignes.push(colonnes.map((c) => ({ value: c.titre, fontWeight: 'bold', backgroundColor: '#E6EFF6' })));
    for (const l of s.lignes) lignes.push(colonnes.map((c) => ({ value: c.valeur(l) })));
    if (!s.lignes.length) lignes.push(fusion({ value: 'Aucun' }));
  }
  await writeXlsxFile(lignes as never, { sheet: feuille.slice(0, 31), columns: colonnes.map((c) => ({ width: c.largeur ?? 16 })) }).toFile(fichier);
}
