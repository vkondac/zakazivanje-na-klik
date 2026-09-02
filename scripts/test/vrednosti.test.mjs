import test from 'node:test';
import assert from 'node:assert/strict';
import { kodirajVrednost } from '../lib/vrednosti.mjs';

test('tekst ide kao goli string', () => {
  assert.equal(kodirajVrednost('single_line_text_field', 'Liman'), 'Liman');
});

test('ceo broj ide kao string', () => {
  assert.equal(kodirajVrednost('number_integer', 120), '120');
});

test('decimalni broj cuva preciznost', () => {
  assert.equal(kodirajVrednost('number_decimal', 45.2517), '45.2517');
});

test('lista teksta ide kao JSON niz', () => {
  assert.equal(kodirajVrednost('list.single_line_text_field', ['Parking', 'Basta']), '["Parking","Basta"]');
});

test('lista datuma ide kao JSON niz', () => {
  assert.equal(kodirajVrednost('list.date', ['2026-10-15']), '["2026-10-15"]');
});

test('ocena ide kao JSON objekat sa skalom', () => {
  assert.equal(kodirajVrednost('rating', 4.6), '{"value":"4.6","scale_min":"1","scale_max":"5"}');
});

test('novac ide kao JSON objekat sa valutom', () => {
  assert.equal(kodirajVrednost('money', 50000), '{"amount":"50000","currency_code":"RSD"}');
});

test('lista referenci ide kao JSON niz gid-ova', () => {
  const gid = 'gid://shopify/Metaobject/1';
  assert.equal(kodirajVrednost('list.metaobject_reference', [gid]), `["${gid}"]`);
});

test('nepoznat tip je greska, ne tiho propustanje', () => {
  assert.throws(() => kodirajVrednost('izmisljen_tip', 'x'), /izmisljen_tip/);
});
