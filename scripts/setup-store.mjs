/**
 * Kreira sve definicije i kolekciju u dev store-u. Idempotentno:
 * moze se pokretati koliko god puta, nista ne duplira.
 *
 * Idempotentnost ide obrascem "prvo pitaj, pa kreiraj ako fali", ne
 * oslanjanjem na kod greske. Kodovi se razlikuju izmedju mutacija i
 * menjaju se izmedju API verzija; postojanje se ne menja.
 *
 * Pokretanje: npm run setup
 */
import { napraviKlijenta } from './lib/admin.mjs';
import { NAMESPACE, METAFIELD_DEFINICIJE, METAOBJECT_DEFINICIJE, KOLEKCIJA } from './lib/definicije.mjs';

/* Klijent se pravi lenjo da bi se modul mogao importovati bez .env-a. */
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

const Q_METAOBJECT_DEF = `
  query DajMetaobjectDefiniciju($type: String!) {
    metaobjectDefinitionByType(type: $type) { id type }
  }`;

const M_METAOBJECT_DEF = `
  mutation KreirajMetaobjectDefiniciju($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message code }
    }
  }`;

const Q_METAFIELD_DEF = `
  query DajMetafieldDefiniciju($namespace: String!, $key: String!) {
    metafieldDefinitions(first: 1, ownerType: PRODUCT, namespace: $namespace, key: $key) {
      nodes { id key }
    }
  }`;

const M_METAFIELD_DEF = `
  mutation KreirajMetafieldDefiniciju($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition { id key }
      userErrors { field message code }
    }
  }`;

const Q_KOLEKCIJA = `
  query DajKolekciju($upit: String!) {
    collections(first: 1, query: $upit) { nodes { id handle } }
  }`;

const M_KOLEKCIJA = `
  mutation KreirajKolekciju($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection { id handle }
      userErrors { field message }
    }
  }`;

const Q_PUBLIKACIJE = `
  query DajPublikacije { publications(first: 25) { nodes { id name } } }`;

const M_OBJAVI = `
  mutation Objavi($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }`;

async function osigurajMetaobjectDefiniciju(definicija) {
  const postojeca = await pozovi(Q_METAOBJECT_DEF, { type: definicija.type });
  if (postojeca.metaobjectDefinitionByType) {
    console.log(`  = metaobjekat "${definicija.type}" vec postoji`);
    return postojeca.metaobjectDefinitionByType.id;
  }
  const nova = await pozovi(M_METAOBJECT_DEF, { definition: definicija });
  console.log(`  + metaobjekat "${definicija.type}"`);
  return nova.metaobjectDefinitionCreate.metaobjectDefinition.id;
}

export function ulazZaMetafield(definicija, gidoviMetaobjekata) {
  const ulaz = {
    name: definicija.name,
    namespace: NAMESPACE,
    key: definicija.key,
    description: definicija.opis,
    type: definicija.type,
    ownerType: 'PRODUCT',
    access: { storefront: 'PUBLIC_READ' },
  };

  if (definicija.type === 'rating') {
    ulaz.validations = [
      { name: 'scale_min', value: '1' },
      { name: 'scale_max', value: '5' },
    ];
  }

  if (definicija.metaobjekat) {
    ulaz.validations = [
      { name: 'metaobject_definition_id', value: gidoviMetaobjekata[definicija.metaobjekat] },
    ];
  }

  return ulaz;
}

async function osigurajMetafieldDefiniciju(definicija, gidoviMetaobjekata) {
  const postojeca = await pozovi(Q_METAFIELD_DEF, { namespace: NAMESPACE, key: definicija.key });
  if (postojeca.metafieldDefinitions.nodes.length > 0) {
    console.log(`  = ${NAMESPACE}.${definicija.key} vec postoji`);
    return;
  }

  await pozovi(M_METAFIELD_DEF, { definition: ulazZaMetafield(definicija, gidoviMetaobjekata) });
  console.log(`  + ${NAMESPACE}.${definicija.key} (${definicija.type})`);
}

async function osigurajKolekciju() {
  const postojeca = await pozovi(Q_KOLEKCIJA, { upit: `handle:${KOLEKCIJA.handle}` });
  if (postojeca.collections.nodes.length > 0) {
    console.log(`  = kolekcija "${KOLEKCIJA.handle}" vec postoji`);
    return postojeca.collections.nodes[0].id;
  }
  const nova = await pozovi(M_KOLEKCIJA, { input: KOLEKCIJA });
  console.log(`  + kolekcija "${KOLEKCIJA.handle}"`);
  return nova.collectionCreate.collection.id;
}

export async function dajOnlineStorePublikaciju() {
  const { publications } = await pozovi(Q_PUBLIKACIJE);
  const online = publications.nodes.find((p) => p.name === 'Online Store');
  if (!online) {
    throw new Error('Kanal "Online Store" nije pronadjen. Ukljuci ga u Settings -> Sales channels.');
  }
  return online.id;
}

export async function objavi(id, publikacijaId) {
  await pozovi(M_OBJAVI, { id, input: [{ publicationId: publikacijaId }] });
}

async function glavno() {
  console.log('Metaobject definicije:');
  const gidovi = {};
  for (const definicija of METAOBJECT_DEFINICIJE) {
    gidovi[definicija.type] = await osigurajMetaobjectDefiniciju(definicija);
  }

  console.log('\nMetafield definicije:');
  for (const definicija of METAFIELD_DEFINICIJE) {
    await osigurajMetafieldDefiniciju(definicija, gidovi);
  }

  console.log('\nKolekcija:');
  const kolekcijaId = await osigurajKolekciju();
  await objavi(kolekcijaId, await dajOnlineStorePublikaciju());
  console.log('  = objavljena na Online Store');

  console.log(`\nGotovo. ${METAFIELD_DEFINICIJE.length} metafield definicija, ${METAOBJECT_DEFINICIJE.length} metaobjekta.`);
}

/* Task 4 importuje `dajOnlineStorePublikaciju` i `objavi` iz ovog fajla.
   Bez ove zastite bi taj import pokrenuo ceo setup pri svakom seed-u. */
if (process.argv[1] === import.meta.filename) {
  glavno().catch((greska) => {
    console.error(`\nPUKLO: ${greska.message}`);
    if (greska.detalji) console.error(JSON.stringify(greska.detalji, null, 2));
    process.exit(1);
  });
}
