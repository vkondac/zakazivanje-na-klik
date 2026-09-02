import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NAMESPACE, METAFIELD_DEFINICIJE, METAOBJECT_DEFINICIJE, FILTRABILNI, KOLEKCIJA,
} from '../lib/definicije.mjs';
import { kodirajVrednost } from '../lib/vrednosti.mjs';

/** Verifikovano uz Shopify dokumentaciju 2026-09-01. Vidi spec 4.6. */
const PODRZANO_ZA_FILTER = new Set([
  'single_line_text_field', 'list.single_line_text_field',
  'number_integer', 'number_decimal', 'boolean',
  'metaobject_reference', 'list.metaobject_reference',
]);

test('spec trazi tacno 18 metafield definicija', () => {
  assert.equal(METAFIELD_DEFINICIJE.length, 18);
});

test('kljucevi metafieldova su jedinstveni', () => {
  const kljucevi = METAFIELD_DEFINICIJE.map((d) => d.key);
  assert.equal(new Set(kljucevi).size, kljucevi.length);
});

test('namespace je merchant-owned, ne $app', () => {
  assert.equal(NAMESPACE, 'prostor');
});

test('svako filtrabilno polje postoji medju definicijama', () => {
  const kljucevi = new Set(METAFIELD_DEFINICIJE.map((d) => d.key));
  const nepostojeci = FILTRABILNI.filter((k) => !kljucevi.has(k));
  assert.deepEqual(nepostojeci, []);
});

test('Search & Discovery podrzava tip svakog filtrabilnog polja', () => {
  for (const kljuc of FILTRABILNI) {
    const definicija = METAFIELD_DEFINICIJE.find((d) => d.key === kljuc);
    assert.ok(
      PODRZANO_ZA_FILTER.has(definicija.type),
      `${kljuc} je ${definicija.type}, sto Search & Discovery ne prima kao filter`
    );
  }
});

test('reference pokazuju na deklarisan metaobjekat', () => {
  const tipovi = new Set(METAOBJECT_DEFINICIJE.map((d) => d.type));
  for (const definicija of METAFIELD_DEFINICIJE) {
    if (!definicija.metaobjekat) continue;
    assert.ok(tipovi.has(definicija.metaobjekat), `${definicija.key} pokazuje na nepostojeci ${definicija.metaobjekat}`);
    assert.match(definicija.type, /metaobject_reference$/);
  }
});

test('seed skripta ume da kodira svaki deklarisan tip', () => {
  const uzorci = {
    single_line_text_field: 'x',
    multi_line_text_field: 'x',
    date: '2026-10-15',
    number_integer: 1,
    number_decimal: 1.5,
    boolean: true,
    'list.single_line_text_field': ['x'],
    'list.date': ['2026-10-15'],
    'list.metaobject_reference': ['gid://shopify/Metaobject/1'],
    rating: 4.5,
    money: 1000,
  };

  const sviTipovi = [
    ...METAFIELD_DEFINICIJE.map((d) => d.type),
    ...METAOBJECT_DEFINICIJE.flatMap((d) => d.fieldDefinitions.map((f) => f.type)),
  ];

  for (const tip of new Set(sviTipovi)) {
    assert.ok(tip in uzorci, `nema uzorka za tip ${tip}`);
    assert.doesNotThrow(() => kodirajVrednost(tip, uzorci[tip]), `kodirajVrednost ne zna ${tip}`);
  }
});

test('metaobjekti imaju jedinstvene kljuceve polja', () => {
  for (const definicija of METAOBJECT_DEFINICIJE) {
    const kljucevi = definicija.fieldDefinitions.map((f) => f.key);
    assert.equal(new Set(kljucevi).size, kljucevi.length, `${definicija.type} ima duplirane kljuceve`);
  }
});

test('kolekcija je automatska po tagu prostor', () => {
  assert.equal(KOLEKCIJA.handle, 'svi-prostori');
  assert.deepEqual(KOLEKCIJA.ruleSet.rules, [{ column: 'TAG', relation: 'EQUALS', condition: 'prostor' }]);
  assert.equal(KOLEKCIJA.ruleSet.appliedDisjunctively, false);
});
