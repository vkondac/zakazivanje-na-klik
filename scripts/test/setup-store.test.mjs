import test from 'node:test';
import assert from 'node:assert/strict';
import { ulazZaMetafield } from '../setup-store.mjs';
import { METAFIELD_DEFINICIJE, NAMESPACE } from '../lib/definicije.mjs';

const GIDOVI = {
  recenzija: 'gid://shopify/MetaobjectDefinition/111',
  paket: 'gid://shopify/MetaobjectDefinition/222',
};

const nadji = (kljuc) => METAFIELD_DEFINICIJE.find((d) => d.key === kljuc);

test('svaka definicija dobija namespace, ownerType i storefront pristup', () => {
  for (const definicija of METAFIELD_DEFINICIJE) {
    const ulaz = ulazZaMetafield(definicija, GIDOVI);
    assert.equal(ulaz.namespace, NAMESPACE);
    assert.equal(ulaz.ownerType, 'PRODUCT');
    assert.deepEqual(ulaz.access, { storefront: 'PUBLIC_READ' });
    assert.ok(ulaz.name && ulaz.description, `${definicija.key} nema name ili description`);
  }
});

test('ocena dobija skalu 1-5', () => {
  const ulaz = ulazZaMetafield(nadji('ocena'), GIDOVI);
  assert.deepEqual(ulaz.validations, [
    { name: 'scale_min', value: '1' },
    { name: 'scale_max', value: '5' },
  ]);
});

test('reference dobijaju gid metaobject definicije', () => {
  assert.deepEqual(ulazZaMetafield(nadji('recenzije'), GIDOVI).validations, [
    { name: 'metaobject_definition_id', value: GIDOVI.recenzija },
  ]);
  assert.deepEqual(ulazZaMetafield(nadji('paketi'), GIDOVI).validations, [
    { name: 'metaobject_definition_id', value: GIDOVI.paket },
  ]);
});

test('obicna polja nemaju validacije', () => {
  for (const kljuc of ['kvart', 'adresa', 'lat', 'zauzeti_datumi', 'sadrzaji']) {
    assert.equal(ulazZaMetafield(nadji(kljuc), GIDOVI).validations, undefined, `${kljuc} ima nepotrebne validacije`);
  }
});

test('nedostajuci gid bi napravio referencu u prazno', () => {
  const ulaz = ulazZaMetafield(nadji('recenzije'), {});
  assert.equal(ulaz.validations[0].value, undefined,
    'ako ovo ikad prestane da bude undefined, orkestrator je vec resio gid');
});
