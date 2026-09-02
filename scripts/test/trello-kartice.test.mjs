import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { napraviKlijenta } from '../trello-kartice.mjs';

const { liste, kartice } = JSON.parse(
  readFileSync(new URL('../trello-kartice.json', import.meta.url), 'utf8')
);

test('svaka kartica pripada deklarisanoj listi', () => {
  for (const kartica of kartice) {
    assert.ok(liste.includes(kartica.lista), `"${kartica.naziv}" je u nepoznatoj listi "${kartica.lista}"`);
  }
});

test('nazivi su jedinstveni - inace idempotentnost preskace pogresnu karticu', () => {
  const nazivi = kartice.map((k) => k.naziv);
  assert.equal(new Set(nazivi).size, nazivi.length);
});

test('svaka kartica ima opis i bar dve stavke u cek-listi', () => {
  for (const kartica of kartice) {
    assert.ok(kartica.opis && kartica.opis.length > 40, `"${kartica.naziv}" nema smislen opis`);
    assert.ok((kartica.checklist ?? []).length >= 2, `"${kartica.naziv}" ima premalo provera`);
  }
});

test('svaka lista ima bar jednu karticu', () => {
  for (const lista of liste) {
    assert.ok(kartice.some((k) => k.lista === lista), `lista "${lista}" je prazna`);
  }
});

test('klijent odbija da se napravi bez kljuca ili tokena', () => {
  assert.throws(() => napraviKlijenta({ token: 'x' }), /TRELLO_KEY/);
  assert.throws(() => napraviKlijenta({ kljuc: 'x' }), /TRELLO_TOKEN/);
});

test('klijent salje kljuc i token kao query parametre', async () => {
  let pogodjeni = '';
  const pozovi = napraviKlijenta({
    kljuc: 'k1', token: 't1',
    fetchFn: async (url) => {
      pogodjeni = url;
      return { ok: true, json: async () => ({ name: 'Tabla' }) };
    },
  });

  await pozovi('GET', '/boards/abc', { fields: 'name' });
  assert.match(pogodjeni, /^https:\/\/api\.trello\.com\/1\/boards\/abc\?/);
  assert.match(pogodjeni, /key=k1/);
  assert.match(pogodjeni, /token=t1/);
  assert.match(pogodjeni, /fields=name/);
});

test('HTTP greska nosi status i telo u poruci', async () => {
  const pozovi = napraviKlijenta({
    kljuc: 'k', token: 't',
    fetchFn: async () => ({ ok: false, status: 401, text: async () => 'invalid token' }),
  });

  await assert.rejects(() => pozovi('POST', '/cards'), /HTTP 401.*invalid token/s);
});
