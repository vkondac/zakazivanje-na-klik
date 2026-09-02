/**
 * Deklarativni opis svega sto se kreira u store-u. Odvojeno od
 * orkestracije da bi se lista mogla procitati i proveriti bez citanja
 * GraphQL poziva.
 *
 * Namespace je `prostor`, ne `$app`, i to je namerno. Shopify-jeva
 * preporuka je app-owned namespace kroz shopify.app.toml, ali ovde ne
 * postoji aplikacija - postoji tema i tudja aplikacija (Search &
 * Discovery) koja mora da cita ove definicije da bi napravila filtere.
 * To je slucaj za koji Shopify izricito propisuje merchant-owned
 * namespace i runtime kreiranje kroz Admin API.
 *
 * Vidi spec 5.2 i 5.4.
 */
export const NAMESPACE = 'prostor';

export const METAOBJECT_DEFINICIJE = [
  {
    type: 'recenzija',
    name: 'Recenzija',
    fieldDefinitions: [
      { key: 'autor', name: 'Autor', type: 'single_line_text_field', required: true },
      { key: 'ocena', name: 'Ocena', type: 'number_integer', required: true },
      { key: 'tekst', name: 'Tekst', type: 'multi_line_text_field', required: true },
      { key: 'datum', name: 'Datum', type: 'date', required: true },
      { key: 'tip_proslave', name: 'Tip proslave', type: 'single_line_text_field', required: false },
    ],
  },
  {
    type: 'paket',
    name: 'Paket',
    fieldDefinitions: [
      { key: 'naziv', name: 'Naziv', type: 'single_line_text_field', required: true },
      { key: 'cena_po_osobi', name: 'Cena po osobi', type: 'money', required: true },
      { key: 'min_gostiju', name: 'Minimalno gostiju', type: 'number_integer', required: true },
      { key: 'ukljucuje', name: 'Ukljucuje', type: 'list.single_line_text_field', required: true },
      { key: 'opis', name: 'Opis', type: 'multi_line_text_field', required: false },
    ],
  },
];

export const METAFIELD_DEFINICIJE = [
  { key: 'kapacitet_min', name: 'Kapacitet - minimum', type: 'number_integer', opis: 'Najmanji broj gostiju.' },
  { key: 'kapacitet_max', name: 'Kapacitet - maksimum', type: 'number_integer', opis: 'Najveci broj gostiju.' },
  { key: 'kapacitet_opseg', name: 'Kapacitet - korpe', type: 'list.single_line_text_field', opis: 'FILTER. Sve korpe koje prostor preseca. Racuna seed skripta.' },
  { key: 'tipovi_proslava', name: 'Tipovi proslava', type: 'list.single_line_text_field', opis: 'FILTER. Za koje proslave je prostor pogodan.' },
  { key: 'sadrzaji', name: 'Sadrzaji', type: 'list.single_line_text_field', opis: 'FILTER. Parking, basta, klima, bina...' },
  { key: 'hrana_pice', name: 'Hrana i pice', type: 'list.single_line_text_field', opis: 'FILTER. Kuhinja, ketering, svedski sto...' },
  { key: 'muzika', name: 'Muzika', type: 'list.single_line_text_field', opis: 'FILTER. DJ, zivi bend, ogranicenje buke.' },
  { key: 'kvart', name: 'Kvart', type: 'single_line_text_field', opis: 'FILTER. Deo Novog Sada.' },
  { key: 'adresa', name: 'Adresa', type: 'single_line_text_field', opis: 'Ulica i broj.' },
  { key: 'lat', name: 'Geografska sirina', type: 'number_decimal', opis: 'Za mapu.' },
  { key: 'lng', name: 'Geografska duzina', type: 'number_decimal', opis: 'Za mapu.' },
  { key: 'zauzeti_datumi', name: 'Zauzeti datumi', type: 'list.date', opis: 'Kalendar i klijentski filter po datumu.' },
  { key: 'ocena', name: 'Prosecna ocena', type: 'rating', opis: 'Skala 1-5. Racuna seed skripta iz recenzija.' },
  { key: 'broj_recenzija', name: 'Broj recenzija', type: 'number_integer', opis: 'Denormalizovano, za karticu.' },
  { key: 'recenzije', name: 'Recenzije', type: 'list.metaobject_reference', metaobjekat: 'recenzija', opis: 'Reference na metaobjekte recenzija.' },
  { key: 'paketi', name: 'Paketi', type: 'list.metaobject_reference', metaobjekat: 'paket', opis: 'Reference na metaobjekte paketa.' },
  { key: 'min_potrosnja', name: 'Minimalna potrosnja', type: 'money', opis: 'Prikaz, bez filtera.' },
  { key: 'kontakt_telefon', name: 'Kontakt telefon', type: 'single_line_text_field', opis: 'Prikaz.' },
];

/** Filteri koje Search & Discovery moze da napravi od ovih definicija. */
export const FILTRABILNI = [
  'kapacitet_opseg', 'tipovi_proslava', 'sadrzaji', 'hrana_pice', 'muzika', 'kvart',
];

export const KOLEKCIJA = {
  title: 'Svi prostori',
  handle: 'svi-prostori',
  descriptionHtml: '<p>Svi prostori za proslave u Novom Sadu.</p>',
  sortOrder: 'ALPHA_ASC',
  ruleSet: {
    appliedDisjunctively: false,
    rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'prostor' }],
  },
};
