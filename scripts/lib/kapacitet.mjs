/**
 * Korpe kapaciteta. Shopify ne ume upit "koji prostor prima 80 gostiju"
 * nad opsegom, pa svaki prostor unapred dobija sve korpe koje preseca
 * i filter postaje obican multi-select.
 *
 * Granice se ne preklapaju: 'Do 30' je 1-30, '30-50' je 31-50, itd.
 * Oznake su ono sto korisnik vidi u filteru i moraju koristiti ASCII crticu.
 */
export const KORPE = [
  { oznaka: 'Do 30', donja: 1, gornja: 30 },
  { oznaka: '30-50', donja: 31, gornja: 50 },
  { oznaka: '50-100', donja: 51, gornja: 100 },
  { oznaka: '100-150', donja: 101, gornja: 150 },
  { oznaka: '150-250', donja: 151, gornja: 250 },
  { oznaka: '250+', donja: 251, gornja: 100000 },
];

export function korpeZaKapacitet(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError('kapacitet_min i kapacitet_max moraju biti celi brojevi');
  }
  if (min < 1) {
    throw new RangeError('kapacitet_min mora biti bar 1');
  }
  if (max < min) {
    throw new RangeError('kapacitet_max ne sme biti manji od kapacitet_min');
  }

  return KORPE.filter((korpa) => min <= korpa.gornja && max >= korpa.donja).map((korpa) => korpa.oznaka);
}
