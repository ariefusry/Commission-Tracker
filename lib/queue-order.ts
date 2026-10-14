// Urutan prioritas board: nilai tengah dua tetangga (jarak awal 1000).
// ponytail: tidak pernah dinormalisasi ulang; presisi double cukup untuk ±50 sisipan di titik yang sama.
const GAP = 1000;

/** Nilai queue_order untuk item yang diletakkan di antara `above` dan `below` (undefined = ujung kolom). */
export function orderBetween(above?: number, below?: number): number {
  if (above !== undefined && below !== undefined) return (above + below) / 2;
  if (above !== undefined) return above + GAP;
  if (below !== undefined) return below - GAP;
  return GAP;
}
