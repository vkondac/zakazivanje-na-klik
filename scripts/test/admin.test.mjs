import test from 'node:test';
import assert from 'node:assert/strict';
import { napraviKlijenta, skupiUserErrors, AdminGreska } from '../lib/admin.mjs';

function lazniFetch(telo, { ok = true, status = 200 } = {}) {
  return async () => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Unauthorized',
    json: async () => telo,
    text: async () => JSON.stringify(telo),
  });
}

const OSNOVA = { domen: 'test.myshopify.com', token: 'shpat_test' };

test('bez tokena klijent odbija da se napravi', () => {
  assert.throws(() => napraviKlijenta({ domen: 'a.myshopify.com' }), AdminGreska);
});

test('uspesan poziv vraca data', async () => {
  const pozovi = napraviKlijenta({ ...OSNOVA, fetchFn: lazniFetch({ data: { shop: { name: 'Test' } } }) });
  assert.deepEqual(await pozovi('{ shop { name } }'), { shop: { name: 'Test' } });
});

test('HTTP greska podize AdminGresku', async () => {
  const pozovi = napraviKlijenta({ ...OSNOVA, fetchFn: lazniFetch({}, { ok: false, status: 401 }) });
  await assert.rejects(() => pozovi('{ shop { name } }'), /HTTP 401/);
});

test('GraphQL greska podize AdminGresku', async () => {
  const pozovi = napraviKlijenta({ ...OSNOVA, fetchFn: lazniFetch({ errors: [{ message: 'Polje ne postoji' }] }) });
  await assert.rejects(() => pozovi('{ nepostojece }'), /GraphQL greska/);
});

test('userErrors podizu gresku sa citljivom porukom', async () => {
  const telo = {
    data: {
      metafieldDefinitionCreate: {
        userErrors: [{ field: ['definition', 'key'], message: 'Kljuc je zauzet', code: 'TAKEN' }],
      },
    },
  };
  const pozovi = napraviKlijenta({ ...OSNOVA, fetchFn: lazniFetch(telo) });
  await assert.rejects(() => pozovi('mutation {}'), /definition\.key: Kljuc je zauzet/);
});

test('tolerisani kod ne podize gresku - omogucava idempotentnost', async () => {
  const telo = {
    data: {
      metafieldDefinitionCreate: {
        createdDefinition: null,
        userErrors: [{ field: ['definition', 'key'], message: 'Kljuc je zauzet', code: 'TAKEN' }],
      },
    },
  };
  const pozovi = napraviKlijenta({ ...OSNOVA, fetchFn: lazniFetch(telo) });
  const data = await pozovi('mutation {}', {}, { tolerisi: ['TAKEN'] });
  assert.equal(data.metafieldDefinitionCreate.createdDefinition, null);
});

test('skupiUserErrors kupi greske iz vise mutacija odjednom', () => {
  const greske = skupiUserErrors({
    a: { userErrors: [{ message: 'prva' }] },
    b: { userErrors: [] },
    c: { userErrors: [{ message: 'druga' }] },
    d: { nesto: 'bez userErrors' },
  });
  assert.deepEqual(greske.map((g) => g.message), ['prva', 'druga']);
});
