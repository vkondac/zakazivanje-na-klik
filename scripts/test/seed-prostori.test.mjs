import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { metafieldoviZa, prosecnaOcena } from '../seed-prostori.mjs';
import { METAFIELD_DEFINICIJE, NAMESPACE } from '../lib/definicije.mjs';

const { prostori } = JSON.parse(readFileSync(new URL('../seed-podaci.json', import.meta.url), 'utf8'));
const OWNER = 'gid://shopify/Product/1';
const GID_R = ['gid://shopify/Metaobject/10', 'gid://shopify/Metaobject/11'];
const GID_P = ['gid://shopify/Metaobject/20'];

const zaPrvi = () => metafieldoviZa(prostori[0], OWNER, GID_R, GID_P);

test('prosek se racuna na jednu decimalu', () => {
  assert.equal(prosecnaOcena([{ ocena: 5 }, { ocena: 4 }]), '4.5');
  assert.equal(prosecnaOcena([{ ocena: 5 }, { ocena: 4 }, { ocena: 4 }]), '4.3');
});

test('svaki prostor proizvodi tacno onoliko metafieldova koliko ima definicija', () => {
  for (const prostor of prostori) {
    const polja = metafieldoviZa(prostor, OWNER, GID_R, GID_P);
    assert.equal(polja.length, METAFIELD_DEFINICIJE.length, prostor.naziv);
  }
});

test('kljucevi i tipovi se poklapaju sa definicijama', () => {
  const poKljucu = new Map(METAFIELD_DEFINICIJE.map((d) => [d.key, d.type]));
  for (const polje of zaPrvi()) {
    assert.equal(polje.namespace, NAMESPACE);
    assert.equal(polje.ownerId, OWNER);
    assert.ok(poKljucu.has(polje.key), `${polje.key} nema definiciju`);
    assert.equal(polje.type, poKljucu.get(polje.key), `${polje.key} ima pogresan tip`);
  }
});

test('nijedna vrednost nije prazna, undefined ili "undefined"', () => {
  for (const prostor of prostori) {
    for (const polje of metafieldoviZa(prostor, OWNER, GID_R, GID_P)) {
      assert.ok(polje.value !== undefined && polje.value !== '', `${prostor.naziv}/${polje.key} je prazno`);
      assert.doesNotMatch(polje.value, /undefined|NaN|\[object Object\]/, `${prostor.naziv}/${polje.key}`);
    }
  }
});

test('liste su validan JSON niz', () => {
  for (const polje of zaPrvi()) {
    if (!polje.type.startsWith('list.')) continue;
    const razbijeno = JSON.parse(polje.value);
    assert.ok(Array.isArray(razbijeno), `${polje.key} nije niz`);
  }
});

test('korpe kapaciteta se slazu sa min i max iz istog zapisa', () => {
  for (const prostor of prostori) {
    const polja = metafieldoviZa(prostor, OWNER, GID_R, GID_P);
    const nadji = (k) => polja.find((p) => p.key === k).value;
    assert.equal(nadji('kapacitet_min'), String(prostor.kapacitet_min));
    assert.equal(nadji('kapacitet_max'), String(prostor.kapacitet_max));
    assert.ok(JSON.parse(nadji('kapacitet_opseg')).length > 0, `${prostor.naziv} nema nijednu korpu`);
  }
});

test('ocena nosi skalu, novac nosi valutu', () => {
  const polja = zaPrvi();
  const ocena = JSON.parse(polja.find((p) => p.key === 'ocena').value);
  assert.equal(ocena.scale_min, '1');
  assert.equal(ocena.scale_max, '5');
  assert.ok(Number(ocena.value) >= 1 && Number(ocena.value) <= 5);

  const novac = JSON.parse(polja.find((p) => p.key === 'min_potrosnja').value);
  assert.equal(novac.currency_code, 'RSD');
});

test('reference nose prosledjene gid-ove', () => {
  const polja = zaPrvi();
  assert.deepEqual(JSON.parse(polja.find((p) => p.key === 'recenzije').value), GID_R);
  assert.deepEqual(JSON.parse(polja.find((p) => p.key === 'paketi').value), GID_P);
});

test('broj_recenzija se slaze sa stvarnim brojem', () => {
  for (const prostor of prostori) {
    const polja = metafieldoviZa(prostor, OWNER, GID_R, GID_P);
    assert.equal(polja.find((p) => p.key === 'broj_recenzija').value, String(prostor.recenzije.length));
  }
});
