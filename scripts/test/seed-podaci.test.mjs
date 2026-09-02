import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proveriProstor, SADRZAJI, HRANA_PICE, MUZIKA, TIPOVI_PROSLAVA } from '../lib/recnici.mjs';
import { korpeZaKapacitet } from '../lib/kapacitet.mjs';

const ucitaj = (ime) => JSON.parse(readFileSync(new URL(ime, import.meta.url), 'utf8'));
const { prostori } = ucitaj('../seed-podaci.json');

test('ima tacno 20 prostora', () => {
  assert.equal(prostori.length, 20);
});

test('svaki prostor prolazi validaciju', () => {
  const greske = prostori.flatMap((prostor, i) => proveriProstor(prostor, i));
  assert.deepEqual(greske, [], `\n${greske.join('\n')}`);
});

test('handle-ovi su jedinstveni', () => {
  const handleovi = prostori.map((p) => p.handle);
  assert.equal(new Set(handleovi).size, handleovi.length);
});

test('najjeftiniji paket ima istu cenu kao prostor', () => {
  for (const prostor of prostori) {
    const najjeftiniji = Math.min(...prostor.paketi.map((p) => p.cena_po_osobi));
    assert.equal(najjeftiniji, prostor.cena_po_osobi,
      `${prostor.naziv}: paket ${najjeftiniji} vs prostor ${prostor.cena_po_osobi}`);
  }
});

test('svaka vrednost recnika se koristi bar jednom - nema mrtvih filter opcija', () => {
  const provere = [
    ['sadrzaji', SADRZAJI], ['hrana_pice', HRANA_PICE],
    ['muzika', MUZIKA], ['tipovi_proslava', TIPOVI_PROSLAVA],
  ];
  for (const [polje, recnik] of provere) {
    const koriscene = new Set(prostori.flatMap((p) => p[polje]));
    const mrtve = recnik.filter((v) => !koriscene.has(v));
    assert.deepEqual(mrtve, [], `${polje} ima neiskoriscene vrednosti`);
  }
});

test('sve korpe kapaciteta su pokrivene', () => {
  const koriscene = new Set(prostori.flatMap((p) => korpeZaKapacitet(p.kapacitet_min, p.kapacitet_max)));
  assert.equal(koriscene.size, 6, `pokriveno ${koriscene.size} od 6 korpi`);
});

test('bar 6 prostora je zauzeto 2026-10-15 - demo filtera po datumu', () => {
  const zauzeti = prostori.filter((p) => p.zauzeti_datumi.includes('2026-10-15'));
  assert.ok(zauzeti.length >= 6, `samo ${zauzeti.length} prostora zauzeto tog datuma`);
});

test('prosecne ocene nisu sve iste', () => {
  const proseci = prostori.map((p) => p.recenzije.reduce((z, r) => z + r.ocena, 0) / p.recenzije.length);
  assert.ok(new Set(proseci.map((o) => o.toFixed(2))).size > 5, 'ocene su previse uniformne');
});

test('svaki prostor ima bar jednu ocenu ispod 5 - prosek nije svuda savrsen', () => {
  for (const prostor of prostori) {
    assert.ok(prostor.recenzije.some((r) => r.ocena < 5), `${prostor.naziv} ima samo petice`);
  }
});

test('svaka kategorija koju prostori koriste ima fotografije u slike.json', () => {
  const slike = ucitaj('../slike.json');
  for (const kategorija of new Set(prostori.map((p) => p.kategorija))) {
    assert.ok(Array.isArray(slike[kategorija]) && slike[kategorija].length > 0,
      `kategorija "${kategorija}" nema fotografije u slike.json`);
  }
});

test('koordinate su u okolini Novog Sada', () => {
  for (const prostor of prostori) {
    assert.ok(prostor.lat > 45.1 && prostor.lat < 45.4, `${prostor.naziv}: lat ${prostor.lat} nije u NS`);
    assert.ok(prostor.lng > 19.6 && prostor.lng < 20.0, `${prostor.naziv}: lng ${prostor.lng} nije u NS`);
  }
});
