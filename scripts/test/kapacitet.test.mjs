import test from 'node:test';
import assert from 'node:assert/strict';
import { korpeZaKapacitet, KORPE } from '../lib/kapacitet.mjs';

test('prostor koji prima 40-150 gostiju pokriva tri srednje korpe', () => {
  assert.deepEqual(korpeZaKapacitet(40, 150), ['30-50', '50-100', '100-150']);
});

test('mali prostor pokriva samo najmanju korpu', () => {
  assert.deepEqual(korpeZaKapacitet(10, 25), ['Do 30']);
});

test('veliki prostor pokriva samo najvecu korpu', () => {
  assert.deepEqual(korpeZaKapacitet(300, 600), ['250+']);
});

test('prostor sa sirokim opsegom pokriva sve korpe', () => {
  assert.deepEqual(korpeZaKapacitet(20, 400), KORPE.map((k) => k.oznaka));
});

test('granicna vrednost ne curi u sledecu korpu', () => {
  assert.deepEqual(korpeZaKapacitet(150, 150), ['100-150']);
});

test('max manji od min je greska', () => {
  assert.throws(() => korpeZaKapacitet(100, 50), RangeError);
});

test('decimalni kapacitet je greska', () => {
  assert.throws(() => korpeZaKapacitet(10.5, 50), TypeError);
});
