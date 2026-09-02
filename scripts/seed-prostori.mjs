/**
 * Useje 20 prostora sa recenzijama, paketima, slikama i svih 18
 * metafieldova. Idempotentno po handle-u.
 *
 * Redosled je bitan: metaobjekti prvi, jer proizvod cuva reference na njih.
 *
 * Metaobjekti se pisu kroz `metaobjectUpsert` sa determinisitickim
 * handle-om (npr. recenzija-restoran-dunavska-terasa-1). Sa `metaobjectCreate`
 * bi svako ponovno pokretanje pravilo nove entitete, a proizvod bi pokazivao
 * samo na poslednje - stari bi ostajali kao sirocad u adminu.
 *
 * Pokretanje: npm run seed
 */
import { readFileSync } from 'node:fs';
import { napraviKlijenta } from './lib/admin.mjs';
import { korpeZaKapacitet } from './lib/kapacitet.mjs';
import { kodirajVrednost } from './lib/vrednosti.mjs';
import { proveriProstor } from './lib/recnici.mjs';
import { NAMESPACE } from './lib/definicije.mjs';
import { dajOnlineStorePublikaciju, objavi } from './setup-store.mjs';

let klijent = null;

function pozovi(upit, promenljive, opcije) {
  if (!klijent) {
    klijent = napraviKlijenta({
      domen: process.env.SHOPIFY_STORE_DOMAIN,
      token: process.env.SHOPIFY_ADMIN_TOKEN,
    });
  }
  return klijent(upit, promenljive, opcije);
}

const ucitaj = (ime) => JSON.parse(readFileSync(new URL(ime, import.meta.url), 'utf8'));

const Q_PROIZVOD = `
  query DajProizvod($upit: String!) {
    products(first: 1, query: $upit) {
      nodes { id handle media(first: 1) { nodes { id } } variants(first: 1) { nodes { id } } }
    }
  }`;

const M_PROIZVOD = `
  mutation KreirajProizvod($input: ProductInput!) {
    productCreate(input: $input) {
      product { id handle variants(first: 1) { nodes { id } } }
      userErrors { field message }
    }
  }`;

const M_VARIJANTE = `
  mutation AzurirajVarijante($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      productVariants { id price }
      userErrors { field message }
    }
  }`;

const M_METAFIELDOVI = `
  mutation PostaviMetafieldove($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { key }
      userErrors { field message code }
    }
  }`;

const M_MEDIJI = `
  mutation DodajMedije($productId: ID!, $media: [CreateMediaInput!]!) {
    productCreateMedia(productId: $productId, media: $media) {
      media { alt }
      mediaUserErrors { field message code }
    }
  }`;

const M_METAOBJEKAT = `
  mutation UpisiMetaobjekat($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message code }
    }
  }`;

async function upisiMetaobjekat(tip, handle, polja) {
  const rezultat = await pozovi(M_METAOBJEKAT, {
    handle: { type: tip, handle },
    metaobject: { fields: Object.entries(polja).map(([key, value]) => ({ key, value })) },
  });
  return rezultat.metaobjectUpsert.metaobject.id;
}

async function upisiRecenzije(prostor) {
  const gidovi = [];
  for (const [redni, recenzija] of prostor.recenzije.entries()) {
    gidovi.push(await upisiMetaobjekat('recenzija', `recenzija-${prostor.handle}-${redni + 1}`, {
      autor: recenzija.autor,
      ocena: String(recenzija.ocena),
      tekst: recenzija.tekst,
      datum: recenzija.datum,
      tip_proslave: recenzija.tip_proslave ?? '',
    }));
  }
  return gidovi;
}

async function upisiPakete(prostor) {
  const gidovi = [];
  for (const [redni, paket] of prostor.paketi.entries()) {
    gidovi.push(await upisiMetaobjekat('paket', `paket-${prostor.handle}-${redni + 1}`, {
      naziv: paket.naziv,
      cena_po_osobi: kodirajVrednost('money', paket.cena_po_osobi),
      min_gostiju: String(paket.min_gostiju),
      ukljucuje: JSON.stringify(paket.ukljucuje),
      opis: paket.opis ?? '',
    }));
  }
  return gidovi;
}

export function prosecnaOcena(recenzije) {
  const zbir = recenzije.reduce((ukupno, recenzija) => ukupno + recenzija.ocena, 0);
  return (zbir / recenzije.length).toFixed(1);
}

export function metafieldoviZa(prostor, ownerId, gidoviRecenzija, gidoviPaketa) {
  const polja = [
    ['kapacitet_min', 'number_integer', prostor.kapacitet_min],
    ['kapacitet_max', 'number_integer', prostor.kapacitet_max],
    ['kapacitet_opseg', 'list.single_line_text_field', korpeZaKapacitet(prostor.kapacitet_min, prostor.kapacitet_max)],
    ['tipovi_proslava', 'list.single_line_text_field', prostor.tipovi_proslava],
    ['sadrzaji', 'list.single_line_text_field', prostor.sadrzaji],
    ['hrana_pice', 'list.single_line_text_field', prostor.hrana_pice],
    ['muzika', 'list.single_line_text_field', prostor.muzika],
    ['kvart', 'single_line_text_field', prostor.kvart],
    ['adresa', 'single_line_text_field', prostor.adresa],
    ['lat', 'number_decimal', prostor.lat],
    ['lng', 'number_decimal', prostor.lng],
    ['zauzeti_datumi', 'list.date', prostor.zauzeti_datumi],
    ['ocena', 'rating', prosecnaOcena(prostor.recenzije)],
    ['broj_recenzija', 'number_integer', prostor.recenzije.length],
    ['recenzije', 'list.metaobject_reference', gidoviRecenzija],
    ['paketi', 'list.metaobject_reference', gidoviPaketa],
    ['min_potrosnja', 'money', prostor.min_potrosnja],
    ['kontakt_telefon', 'single_line_text_field', prostor.kontakt_telefon],
  ];

  return polja.map(([key, type, vrednost]) => ({
    ownerId,
    namespace: NAMESPACE,
    key,
    type,
    value: kodirajVrednost(type, vrednost),
  }));
}

async function useJedan(prostor, slike, publikacija) {
  const postojeci = await pozovi(Q_PROIZVOD, { upit: `handle:${prostor.handle}` });
  let proizvod = postojeci.products.nodes[0];
  let imaMedije = Boolean(proizvod?.media?.nodes?.length);

  if (!proizvod) {
    const kreiran = await pozovi(M_PROIZVOD, {
      input: {
        handle: prostor.handle,
        title: prostor.naziv,
        descriptionHtml: prostor.opis,
        productType: prostor.kategorija,
        vendor: prostor.vlasnik,
        tags: ['prostor'],
        status: 'ACTIVE',
      },
    });
    proizvod = kreiran.productCreate.product;
    imaMedije = false;
  }

  await pozovi(M_VARIJANTE, {
    productId: proizvod.id,
    variants: [{
      id: proizvod.variants.nodes[0].id,
      price: String(prostor.cena_po_osobi),
      inventoryPolicy: 'CONTINUE',
      inventoryItem: { tracked: false },
    }],
  });

  const gidoviRecenzija = await upisiRecenzije(prostor);
  const gidoviPaketa = await upisiPakete(prostor);

  await pozovi(M_METAFIELDOVI, {
    metafields: metafieldoviZa(prostor, proizvod.id, gidoviRecenzija, gidoviPaketa),
  });

  if (!imaMedije) {
    await pozovi(M_MEDIJI, {
      productId: proizvod.id,
      media: (slike[prostor.kategorija] ?? []).map((url, redni) => ({
        originalSource: url,
        alt: `${prostor.naziv} — fotografija ${redni + 1}`,
        mediaContentType: 'IMAGE',
      })),
    });
  }

  await objavi(proizvod.id, publikacija);
  console.log(`  + ${prostor.naziv}`);
}

async function glavno() {
  const { prostori } = ucitaj('./seed-podaci.json');
  const slike = ucitaj('./slike.json');

  const greske = prostori.flatMap((prostor, i) => proveriProstor(prostor, i));
  if (greske.length > 0) {
    console.error('Seed podaci nisu ispravni:\n' + greske.join('\n'));
    process.exit(1);
  }

  const publikacija = await dajOnlineStorePublikaciju();
  console.log(`Useja se ${prostori.length} prostora:`);
  for (const prostor of prostori) {
    await useJedan(prostor, slike, publikacija);
  }
  console.log('\nGotovo.');
}

if (process.argv[1] === import.meta.filename) {
  glavno().catch((greska) => {
    console.error(`\nPUKLO: ${greska.message}`);
    if (greska.detalji) console.error(JSON.stringify(greska.detalji, null, 2));
    process.exit(1);
  });
}
