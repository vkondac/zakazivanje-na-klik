/**
 * Kontrolisani recnici iz speca, odeljak 5.3.
 *
 * Ovo su vrednosti koje korisnik doslovno vidi u filterima. Zato su
 * ovde, na jednom mestu, i zato seed podaci prolaze kroz `proveriProstor`
 * pre nego sto ijedan zavrsi u Shopify-ju: tipfeler ne bi pukao, nego bi
 * tiho napravio filter opciju sa jednim prostorom.
 */
export const KATEGORIJE = [
  'Restoran', 'Svečana sala', 'Dečija igraonica', 'Klub',
  'Kafić', 'Salaš', 'Terasa / krovna bašta', 'Konferencijska sala',
];

export const TIPOVI_PROSLAVA = [
  'Rođendan', 'Dečiji rođendan', 'Punoletstvo', 'Svadba', 'Krštenje',
  'Matura', 'Diplomiranje', 'Poslovni događaj', 'Privatna zabava',
];

export const SADRZAJI = [
  'Parking', 'Bašta', 'Otvoren prostor', 'Zatvoren prostor', 'Klima',
  'Bina', 'Ozvučenje', 'Projektor', 'Pristup za osobe sa invaliditetom',
  'Garderoba', 'Dečiji kutak', 'Roštilj', 'Bazen', 'Wi-Fi', 'Dekoracija uključena',
];

export const HRANA_PICE = [
  'Sopstvena kuhinja', 'Ketering dozvoljen', 'Donošenje hrane dozvoljeno',
  'Švedski sto', 'Meni po izboru', 'Vegetarijanski meni', 'Bez hrane',
  'Piće uključeno', 'Sopstveno piće dozvoljeno',
];

export const MUZIKA = [
  'DJ dozvoljen', 'Živi bend', 'Sopstveno ozvučenje',
  'Ograničenje buke posle 24h', 'Bez muzike',
];

export const KVARTOVI = [
  'Stari grad', 'Liman', 'Grbavica', 'Detelinara', 'Novo naselje',
  'Podbara', 'Salajka', 'Telep', 'Adice', 'Sremska Kamenica',
  'Petrovaradin', 'Futog', 'Veternik', 'Okolina Novog Sada',
];

const DATUM_OBLIK = /^\d{4}-\d{2}-\d{2}$/;

export function proveriProstor(prostor, indeks) {
  const greske = [];
  const ime = prostor?.naziv ?? '(bez naziva)';
  const zameri = (poruka) => greske.push(`prostor[${indeks}] "${ime}": ${poruka}`);

  const obavezna = ['handle', 'naziv', 'kategorija', 'vlasnik', 'opis', 'kvart', 'adresa', 'cena_po_osobi'];
  for (const polje of obavezna) {
    if (prostor?.[polje] === undefined || prostor[polje] === '') zameri(`nedostaje polje "${polje}"`);
  }

  if (!KATEGORIJE.includes(prostor?.kategorija)) zameri(`kategorija "${prostor?.kategorija}" nije u recniku`);
  if (!KVARTOVI.includes(prostor?.kvart)) zameri(`kvart "${prostor?.kvart}" nije u recniku`);

  const liste = [
    ['tipovi_proslava', TIPOVI_PROSLAVA],
    ['sadrzaji', SADRZAJI],
    ['hrana_pice', HRANA_PICE],
    ['muzika', MUZIKA],
  ];
  for (const [polje, recnik] of liste) {
    const vrednosti = prostor?.[polje];
    if (!Array.isArray(vrednosti) || vrednosti.length === 0) {
      zameri(`"${polje}" mora biti neprazna lista`);
      continue;
    }
    for (const vrednost of vrednosti) {
      if (!recnik.includes(vrednost)) zameri(`"${polje}" sadrzi "${vrednost}", nije u recniku`);
    }
  }

  if (!Number.isInteger(prostor?.kapacitet_min) || !Number.isInteger(prostor?.kapacitet_max)) {
    zameri('kapacitet_min i kapacitet_max moraju biti celi brojevi');
  } else if (prostor.kapacitet_max < prostor.kapacitet_min) {
    zameri('kapacitet_max je manji od kapacitet_min');
  }

  for (const datum of prostor?.zauzeti_datumi ?? []) {
    if (!DATUM_OBLIK.test(datum)) zameri(`zauzet datum "${datum}" nije u obliku YYYY-MM-DD`);
  }

  if (!Array.isArray(prostor?.slike) || prostor.slike.length === 0) {
    zameri('mora imati bar jednu sliku');
  }

  const recenzije = prostor?.recenzije ?? [];
  for (const recenzija of recenzije) {
    if (!Number.isInteger(recenzija.ocena) || recenzija.ocena < 1 || recenzija.ocena > 5) {
      zameri(`recenzija "${recenzija.autor}" ima ocenu van opsega 1-5`);
    }
  }
  if (recenzije.length < 3) zameri('mora imati bar 3 recenzije');

  if ((prostor?.paketi ?? []).length < 2) zameri('mora imati bar 2 paketa');

  return greske;
}
