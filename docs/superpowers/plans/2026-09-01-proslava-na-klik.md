# Proslava na klik — plan implementacije

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shopify online store koji omogućava pretragu, filtriranje, poređenje i slanje upita za prostore za proslave u Novom Sadu.

**Architecture:** Prostori su Shopify proizvodi sa metafieldovima; fasetno filtriranje radi Search & Discovery aplikacija a tema ga iscrtava generički kroz `collection.filters`. Recenzije i paketi su metaobjekti. Sve što Shopify ne ume kao server-side filter — datum, poređenje, sortiranje po oceni — rešava klijentski JavaScript nad trenutnom stranicom rezultata.

**Tech Stack:** Shopify Liquid (Skeleton Theme), Shopify CLI, Search & Discovery app, Admin GraphQL API `2026-07`, Node.js 26 (seed skripte, `node --test`), vanilla JS bez biblioteka.

**Spec:** `docs/superpowers/specs/2026-09-01-proslava-na-klik-design.md`

---

## Global Constraints

Ovi zahtevi važe za **svaki** task. Ne ponavljaju se u tekstu taskova.

- **Jezik koda i identifikatora:** engleski se ne koristi za domenske pojmove. Nazivi fajlova, klasa, ključeva metafieldova i CSS klasa su na srpskom bez dijakritike (`prostor-kalendar`, `kartica-prostora`, `kapacitet_opseg`).
- **Nijedan korisnički vidljiv string se ne hardkoduje u Liquid.** Sve ide kroz `{{ 'kljuc' | t }}`. Ključevi su hijerarhijski, najviše 3 nivoa, `snake_case`.
- **Locale pravilo:** engleski tekst u `locales/en.default.json`, srpski u `locales/sr.json`. Isto za `*.schema.json`. Svaki task koji dodaje string dodaje ga u **oba** fajla.
- **CSS i JS po komponenti:** `{% stylesheet %}` i `{% javascript %}` tagovi u sekciji/snippetu. `assets/critical.css` sadrži samo reset, tokene i layout mrežu. Nikad `<style>` ni `<script>` inline osim `{% style %}` u `css-variables.liquid`.
- **Snippets i statički renderovani blokovi moraju imati `{% doc %}` header** sa `@param` i `@example`.
- **`{% schema %}` labele koriste `t:` prefiks** i moraju postojati u `*.schema.json`.
- **Liquid nema parentheze ni ternarni operator.** Više od jednog logičkog operatora → ugnežđeni `{% if %}`.
- **`shopify theme check` mora biti čist** na kraju svakog taska. Konfiguracija je `theme-check:recommended` u `.theme-check.yml`.
- **ASCII crtica u vrednostima filtera.** `50-100`, nikad `50–100`.
- **Vrednosti filtrabilnih polja moraju doslovno odgovarati rečnicima iz speca 5.3.** Jedno slovo razlike pravi novu, praznu vrednost u filteru.
- **Commit posle svakog taska.** Poruka na srpskom bez dijakritike, prefiks `feat:` / `fix:` / `chore:` / `docs:`.
- **Nikad ne reći „gotovo" bez izvršene smoke liste** iz taska.

### Zašto ovde nema `pytest` blokova

Za Liquid teme ne postoji smisleno okruženje za unit testove — nema runnera koji izvršava Liquid izolovano sa lažnim `product` objektom. Verifikacija je zato dvodelna i **oba dela su obavezna**:

1. `shopify theme check` — statička analiza, automatska.
2. **Smoke lista** — numerisana lista konkretnih provera sa očekivanim ishodom, izvršava se na `shopify theme dev`.

Node skripte u `scripts/` **jesu** pokrivene pravim testovima (`node --test`), jer su čist JavaScript. Tamo važi normalan TDD ciklus.

---

## Struktura fajlova

### `scripts/` — priprema store-a (Node, testabilno)

| Fajl | Odgovornost |
|---|---|
| `scripts/lib/admin.mjs` | GraphQL klijent nad Admin API-jem; jedna funkcija `pozovi()`, obrada `userErrors` |
| `scripts/lib/kapacitet.mjs` | Čista funkcija `korpeZaKapacitet(min, max)` → lista korpi |
| `scripts/lib/recnici.mjs` | Kontrolisani rečnici iz speca 5.3 plus `proveriProstor` |
| `scripts/lib/vrednosti.mjs` | `kodirajVrednost(tip, vrednost)` — metafield vrednost za Admin API |
| `scripts/lib/definicije.mjs` | Deklarativni opis 18 metafield i 2 metaobject definicije |
| `scripts/setup-store.mjs` | Orkestrator: definicije + kolekcija. Idempotentan |
| `scripts/seed-prostori.mjs` | Orkestrator: metaobjekti, proizvodi, slike, objavljivanje |
| `scripts/seed-podaci.json` | 20 prostora sa recenzijama i paketima |
| `scripts/slike.json` | 12 URL-ova fotografija, po tri za svaku kategoriju |
| `scripts/test/*.test.mjs` | `node --test` |

Spec pominje jedan `setup-store.mjs`; razdvojen je na klijent / podatke / orkestraciju jer se tako testira bez mrežnih poziva.

### `sections/` — nove i prepisane

| Fajl | Šablon |
|---|---|
| `hero-pretraga.liquid`, `kategorije-proslava.liquid`, `istaknuti-prostori.liquid`, `kako-radi.liquid` | index |
| `rezultati-prostora.liquid` | collection |
| `prostor-zaglavlje.liquid`, `prostor-detalji.liquid`, `prostor-paketi.liquid`, `prostor-kalendar.liquid`, `prostor-recenzije.liquid`, `prostor-upit.liquid` | product |
| `poredjenje.liquid` | page.poredjenje |
| `header.liquid` (prepis), `footer.liquid` (dorada) | globalno |

**Brišu se:** `hello-world.liquid`, `custom-section.liquid`, `product.liquid`, `collection.liquid`.

### `snippets/` — nove

`kartica-prostora`, `zvezdice`, `ikonica`, `filter-grupa`, `filter-cena`, `aktivni-filteri`, `zauzeti-datumi` · dorada `css-variables`

Spec 7.1 pominje i snippet `oznaka`; ispao je iz plana namerno — `.oznaka` je obična CSS klasa u `critical.css` i ne zaslužuje fajl.

### Ostalo

`templates/`: prepis `index.json`, `collection.json`, `product.json`; novi `page.poredjenje.json`
`locales/`: dorada `en.default.json`, `en.default.schema.json`; novi `sr.json`, `sr.schema.json`
`assets/`: prepis `critical.css`
`config/`: dorada `settings_schema.json`

---

## Redosled i zavisnosti

```
 1 Preduslovi: dev store, CLI, git, MCP
      ↓
 2 Admin klijent + rečnici (jedini pravi TDD u planu)
      ↓
 3 Definicije ── 4 Seed 20 prostora ── 5 Search & Discovery   ← KAPIJA
      ↓                                                          bez podataka i filtera
 6 Tokeni ── 7 Prevodi ── 8 Header + poređenje                   tema nema šta da prikaže
      ↓
 9 Snippets kartice ── 10 Snippets filtera
      ↓
11 Rezultati ── 12 Datum + sortiranje po oceni                 ← najveći rizik, rano
      ↓
13 Zaglavlje ── 14 Detalji ── 15 Paketi ── 16 Kalendar ── 17 Recenzije ── 18 Upit
      ↓
19 Hero pretraga ── 20 Kategorije, izdvojeni, kako radi        ← posle rezultata, jer forma
      ↓                                                          mora da gađa postojeći URL ugovor
21 Poređenje
      ↓
22 Čišćenje, navigacija, završna provera
```

---

## Task 1: Preduslovi — dev store, CLI, MCP

Ovaj task ne dodaje kod. On je kapija: bez njega nijedan sledeći task ne može da se izvrši ni proveri.

**Files:**
- Create: `.env.example`
- Modify: `.gitignore` (već sadrži `.env` — samo proveriti)

**Interfaces:**
- Consumes: ništa
- Produces: promenljive okruženja `SHOPIFY_STORE_DOMAIN` i `SHOPIFY_ADMIN_TOKEN`, koje koriste taskovi 2 i 3; radna `shopify` komanda, koju koriste svi taskovi od 5 naviše

- [ ] **Step 1: Napravi Shopify Partner nalog i development store**

Idi na `https://partners.shopify.com`, napravi nalog, pa **Stores → Add store → Create development store**.

- Store name: `Proslava na klik`
- Store purpose: **Test or build a new app or theme** (ovo je bitno — daje neograničen razvojni store bez plaćanja)
- Build version: **Current release**

Zapiši `.myshopify.com` domen — treba u sledećem koraku.

- [ ] **Step 2: Podesi valutu i jezik store-a**

U adminu store-a:

- **Settings → General → Store defaults** → Currency: **Serbian Dinar (RSD)**
- **Settings → Languages → Add language** → **Serbian (srpski)**, pa **Set as default**

Valuta mora biti RSD pre unosa proizvoda — menjanje valute posle unosa ne preračunava cene.

- [ ] **Step 3: Napravi custom app i uzmi Admin API token**

U adminu: **Settings → Apps and sales channels → Develop apps → Create an app**, naziv `Seed skripta`.

**Configuration → Admin API integration → Configure**, uključi scope-ove:

```
write_products
read_products
write_metaobject_definitions
read_metaobject_definitions
write_metaobjects
read_metaobjects
write_publications
read_publications
```

Pa **Install app** i **Reveal token once**. Token počinje sa `shpat_`.

- [ ] **Step 4: Napravi `.env.example` i `.env`**

```bash
cat > .env.example <<'EOF'
# Domen development store-a, bez https://
SHOPIFY_STORE_DOMAIN=proslava-na-klik.myshopify.com

# Admin API token iz custom app-a (pocinje sa shpat_)
SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EOF

cp .env.example .env
# Otvori .env i upisi prave vrednosti
```

- [ ] **Step 5: Proveri da `.env` NIJE praćen gitom**

Run: `git check-ignore -v .env`
Expected: ispisuje `.gitignore:NN:.env	.env`

Ako ne ispiše ništa, `.env` nije ignorisan — **stani** i dodaj ga u `.gitignore` pre nego što nastaviš. Token u istoriji gita se ne briše lako.

- [ ] **Step 6: Instaliraj Shopify CLI**

```bash
npm install -g @shopify/cli@latest
shopify version
```
Expected: ispisuje verziju, bez `command not found`

- [ ] **Step 7: Poveži temu sa store-om**

```bash
shopify theme dev --store proslava-na-klik.myshopify.com
```

Otvara browser za autorizaciju, pa diže lokalni preview na `http://127.0.0.1:9292`.
Expected: stranica se učitava i prikazuje „Hello, World!" iz starter sekcije.

Zaustavi sa `Ctrl+C`.

- [ ] **Step 8: Instaliraj Shopify AI Toolkit**

`AGENTS.md` traži `learn_shopify_api` alat kao obavezan za rad sa Liquid temama, a on trenutno nije dostupan.

```bash
npx skills add Shopify/shopify-ai-toolkit --list
```

Ili prema uputstvu na `https://shopify.dev/docs/apps/build/ai-toolkit` za ovaj agent host.

Expected: alat `learn_shopify_api` postaje dostupan. Ako instalacija ne uspe, zapiši to i nastavi — nije blokada, ali je gubitak: bez njega se Admin API shema i Liquid objekti proveravaju ručno kroz dokumentaciju.

- [ ] **Step 9: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: .env.example za Admin API pristup"
```

---

## Task 2: Admin GraphQL klijent i kontrolisani rečnici

Prvi task sa pravim kodom, i jedini sloj koji se testira automatski. Sve kasnije skripte zovu ovaj klijent.

**Files:**
- Create: `scripts/lib/admin.mjs`
- Create: `scripts/lib/kapacitet.mjs`
- Create: `scripts/lib/recnici.mjs`
- Create: `scripts/lib/vrednosti.mjs`
- Test: `scripts/test/admin.test.mjs`, `scripts/test/kapacitet.test.mjs`, `scripts/test/vrednosti.test.mjs`
- Create: `package.json`

**Interfaces:**
- Consumes: `.env` iz Taska 1
- Produces:
  - `napraviKlijenta({ domen, token, fetchFn }) → pozovi(upit, promenljive = {}, opcije = {}) → Promise<data>`; `opcije.tolerisi` je lista `userErrors.code` vrednosti koje se ne smatraju greškom
  - `AdminGreska extends Error` sa poljem `detalji`
  - `korpeZaKapacitet(min, max) → string[]`
  - `KORPE, KATEGORIJE, TIPOVI_PROSLAVA, SADRZAJI, HRANA_PICE, MUZIKA, KVARTOVI` — nizovi stringova
  - `proveriProstor(prostor, indeks) → string[]` — lista poruka o greškama, prazna ako je ispravan
  - `kodirajVrednost(tip, vrednost) → string` — metafield vrednost spremna za Admin API

- [ ] **Step 1: Napravi `package.json`**

```json
{
  "name": "proslava-na-klik-skripte",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test",
    "setup": "node --env-file=.env scripts/setup-store.mjs",
    "seed": "node --env-file=.env scripts/seed-prostori.mjs"
  }
}
```

`node --env-file` učitava `.env` bez ijedne zavisnosti — zato u ovom projektu nema `node_modules` za skripte.

**Ispravka tokom izvršavanja:** `node --test scripts/test/` na Node-u 26 pokušava da učita direktorijum kao modul i puca sa `MODULE_NOT_FOUND`. Golo `node --test` koristi podrazumevano otkrivanje, nađe `*.test.mjs` i preskoči `node_modules` — bez zavisnosti od shell globa.

- [ ] **Step 2: Napiši testove za `kapacitet.mjs` — oni moraju pasti**

Create `scripts/test/kapacitet.test.mjs`:

```js
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
```

- [ ] **Step 3: Pokreni testove i potvrdi da padaju**

Run: `node --test scripts/test/kapacitet.test.mjs`
Expected: FAIL sa `Cannot find module '../lib/kapacitet.mjs'`

- [ ] **Step 4: Napiši `scripts/lib/kapacitet.mjs`**

```js
/**
 * Korpe kapaciteta. Shopify ne ume upit "koji prostor prima 80 gostiju"
 * nad opsegom, pa svaki prostor unapred dobija sve korpe koje preseca
 * i filter postaje obican multi-select.
 *
 * Granice se ne preklapaju: 'Do 30' je 1-30, '30-50' je 31-50, itd.
 * Oznake su ono sto korisnik vidi u filteru i moraju koristiti ASCII crticu.
 */
export const KORPE = [
  { oznaka: 'Do 30', donja: 1, gornja: 30 },
  { oznaka: '30-50', donja: 31, gornja: 50 },
  { oznaka: '50-100', donja: 51, gornja: 100 },
  { oznaka: '100-150', donja: 101, gornja: 150 },
  { oznaka: '150-250', donja: 151, gornja: 250 },
  { oznaka: '250+', donja: 251, gornja: 100000 },
];

export function korpeZaKapacitet(min, max) {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError('kapacitet_min i kapacitet_max moraju biti celi brojevi');
  }
  if (min < 1) {
    throw new RangeError('kapacitet_min mora biti bar 1');
  }
  if (max < min) {
    throw new RangeError('kapacitet_max ne sme biti manji od kapacitet_min');
  }

  return KORPE.filter((korpa) => min <= korpa.gornja && max >= korpa.donja).map((korpa) => korpa.oznaka);
}
```

- [ ] **Step 5: Pokreni testove i potvrdi da prolaze**

Run: `node --test scripts/test/kapacitet.test.mjs`
Expected: PASS, 7 testova

- [ ] **Step 6: Napiši testove za `vrednosti.mjs` — moraju pasti**

Create `scripts/test/vrednosti.test.mjs`:

```js
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
```

- [ ] **Step 7: Pokreni i potvrdi da padaju**

Run: `node --test scripts/test/vrednosti.test.mjs`
Expected: FAIL sa `Cannot find module '../lib/vrednosti.mjs'`

- [ ] **Step 8: Napiši `scripts/lib/vrednosti.mjs`**

```js
/**
 * Admin API prima svaku metafield vrednost kao string. Kako se string
 * formira zavisi od tipa i to je najcesci izvor tihih gresaka pri seed-u:
 * pogresno kodirana vrednost prolazi bez userError-a i zavrsi kao prazno
 * polje u temi. Zato je mapiranje na jednom mestu i pod testom.
 */
const VALUTA = 'RSD';
const SKALA_OCENE = { scale_min: '1', scale_max: '5' };

export function kodirajVrednost(tip, vrednost) {
  switch (tip) {
    case 'single_line_text_field':
    case 'multi_line_text_field':
    case 'date':
      return String(vrednost);

    case 'number_integer':
    case 'number_decimal':
      return String(vrednost);

    case 'boolean':
      return vrednost ? 'true' : 'false';

    case 'list.single_line_text_field':
    case 'list.date':
    case 'list.metaobject_reference':
      return JSON.stringify(vrednost);

    case 'rating':
      return JSON.stringify({ value: String(vrednost), ...SKALA_OCENE });

    case 'money':
      return JSON.stringify({ amount: String(vrednost), currency_code: VALUTA });

    default:
      throw new Error(`Nepoznat tip metafielda: ${tip}`);
  }
}
```

- [ ] **Step 9: Pokreni i potvrdi da prolaze**

Run: `node --test scripts/test/vrednosti.test.mjs`
Expected: PASS, 9 testova

- [ ] **Step 10: Napiši testove za `admin.mjs` — moraju pasti**

Create `scripts/test/admin.test.mjs`:

```js
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

test('tolerisani kod ne podize gresku — omogucava idempotentnost', async () => {
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
```

- [ ] **Step 11: Pokreni i potvrdi da padaju**

Run: `node --test scripts/test/admin.test.mjs`
Expected: FAIL sa `Cannot find module '../lib/admin.mjs'`

- [ ] **Step 12: Napiši `scripts/lib/admin.mjs`**

```js
/**
 * Tanak klijent nad Shopify Admin GraphQL API-jem.
 *
 * Kljucna stvar: Shopify na neuspelu mutaciju vraca HTTP 200 sa
 * `userErrors` u telu. Ko to ne proveri, misli da je seed prosao a store
 * je prazan. Zato svaki poziv sam trazi `userErrors` i podize gresku,
 * osim za kodove koje pozivalac izricito tolerise (npr. TAKEN, koji
 * znaci "vec postoji" i cini skriptu idempotentnom).
 *
 * API verzija se menja kvartalno. Ako mutacija odbije oblik ulaza,
 * poruka iz `userErrors` ili `errors` tacno kaze koje polje smeta.
 */
const API_VERZIJA = '2026-07';

export class AdminGreska extends Error {
  constructor(poruka, detalji) {
    super(poruka);
    this.name = 'AdminGreska';
    this.detalji = detalji;
  }
}

export function skupiUserErrors(data) {
  const skup = [];
  for (const vrednost of Object.values(data ?? {})) {
    if (vrednost && Array.isArray(vrednost.userErrors)) {
      skup.push(...vrednost.userErrors);
    }
  }
  return skup;
}

function formatiraj(greska) {
  const polje = Array.isArray(greska.field) ? greska.field.join('.') : greska.field;
  const kod = greska.code ? ` [${greska.code}]` : '';
  return `${polje ?? '(bez polja)'}: ${greska.message}${kod}`;
}

export function napraviKlijenta({ domen, token, fetchFn = fetch }) {
  if (!domen) throw new AdminGreska('Nedostaje SHOPIFY_STORE_DOMAIN u .env');
  if (!token) throw new AdminGreska('Nedostaje SHOPIFY_ADMIN_TOKEN u .env');

  const url = `https://${domen}/admin/api/${API_VERZIJA}/graphql.json`;

  return async function pozovi(upit, promenljive = {}, opcije = {}) {
    const tolerisi = new Set(opcije.tolerisi ?? []);

    const odgovor = await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
      body: JSON.stringify({ query: upit, variables: promenljive }),
    });

    if (!odgovor.ok) {
      throw new AdminGreska(`HTTP ${odgovor.status} ${odgovor.statusText}`, await odgovor.text());
    }

    const telo = await odgovor.json();

    if (telo.errors) {
      throw new AdminGreska(`GraphQL greska: ${telo.errors.map((g) => g.message).join('; ')}`, telo.errors);
    }

    const greske = skupiUserErrors(telo.data).filter((greska) => !tolerisi.has(greska.code));
    if (greske.length > 0) {
      throw new AdminGreska(greske.map(formatiraj).join('\n'), greske);
    }

    return telo.data;
  };
}
```

- [ ] **Step 13: Pokreni i potvrdi da prolaze**

Run: `node --test scripts/test/admin.test.mjs`
Expected: PASS, 7 testova

- [ ] **Step 14: Napiši `scripts/lib/recnici.mjs`**

Vrednosti moraju **doslovno** odgovarati specu 5.3. One završe u URL-u i u filteru; jedno slovo razlike pravi novu, praznu opciju.

```js
/**
 * Kontrolisani recnici iz speca, odeljak 5.3.
 *
 * Ovo su vrednosti koje korisnik doslovno vidi u filterima. Zato su
 * ovde, na jednom mestu, i zato seed podaci prolaze kroz `proveriProstor`
 * pre nego sto ijedan zavrsi u Shopify-ju: tipfeler ne bi pukao, nego bi
 * tiho napravio filter opciju sa jednim prostorom.
 */
export const KATEGORIJE = [
  'Restoran', 'Svečana sala', 'Dečija igraonica', 'Klub',
  'Kafić', 'Salaš', 'Terasa / krovna bašta', 'Konferencijska sala',
];

export const TIPOVI_PROSLAVA = [
  'Rođendan', 'Dečiji rođendan', 'Punoletstvo', 'Svadba', 'Krštenje',
  'Matura', 'Diplomiranje', 'Poslovni događaj', 'Privatna zabava',
];

export const SADRZAJI = [
  'Parking', 'Bašta', 'Otvoren prostor', 'Zatvoren prostor', 'Klima',
  'Bina', 'Ozvučenje', 'Projektor', 'Pristup za osobe sa invaliditetom',
  'Garderoba', 'Dečiji kutak', 'Roštilj', 'Bazen', 'Wi-Fi', 'Dekoracija uključena',
];

export const HRANA_PICE = [
  'Sopstvena kuhinja', 'Ketering dozvoljen', 'Donošenje hrane dozvoljeno',
  'Švedski sto', 'Meni po izboru', 'Vegetarijanski meni', 'Bez hrane',
  'Piće uključeno', 'Sopstveno piće dozvoljeno',
];

export const MUZIKA = [
  'DJ dozvoljen', 'Živi bend', 'Sopstveno ozvučenje',
  'Ograničenje buke posle 24h', 'Bez muzike',
];

export const KVARTOVI = [
  'Stari grad', 'Liman', 'Grbavica', 'Detelinara', 'Novo naselje',
  'Podbara', 'Salajka', 'Telep', 'Adice', 'Sremska Kamenica',
  'Petrovaradin', 'Futog', 'Veternik', 'Okolina Novog Sada',
];

const DATUM_OBLIK = /^\d{4}-\d{2}-\d{2}$/;

export function proveriProstor(prostor, indeks) {
  const greske = [];
  const ime = prostor?.naziv ?? '(bez naziva)';
  const zameri = (poruka) => greske.push(`prostor[${indeks}] "${ime}": ${poruka}`);

  const obavezna = ['handle', 'naziv', 'kategorija', 'vlasnik', 'opis', 'kvart', 'adresa', 'cena_po_osobi'];
  for (const polje of obavezna) {
    if (prostor?.[polje] === undefined || prostor[polje] === '') zameri(`nedostaje polje "${polje}"`);
  }

  if (!KATEGORIJE.includes(prostor?.kategorija)) zameri(`kategorija "${prostor?.kategorija}" nije u recniku`);
  if (!KVARTOVI.includes(prostor?.kvart)) zameri(`kvart "${prostor?.kvart}" nije u recniku`);

  const liste = [
    ['tipovi_proslava', TIPOVI_PROSLAVA],
    ['sadrzaji', SADRZAJI],
    ['hrana_pice', HRANA_PICE],
    ['muzika', MUZIKA],
  ];
  for (const [polje, recnik] of liste) {
    const vrednosti = prostor?.[polje];
    if (!Array.isArray(vrednosti) || vrednosti.length === 0) {
      zameri(`"${polje}" mora biti neprazna lista`);
      continue;
    }
    for (const vrednost of vrednosti) {
      if (!recnik.includes(vrednost)) zameri(`"${polje}" sadrzi "${vrednost}", nije u recniku`);
    }
  }

  if (!Number.isInteger(prostor?.kapacitet_min) || !Number.isInteger(prostor?.kapacitet_max)) {
    zameri('kapacitet_min i kapacitet_max moraju biti celi brojevi');
  } else if (prostor.kapacitet_max < prostor.kapacitet_min) {
    zameri('kapacitet_max je manji od kapacitet_min');
  }

  for (const datum of prostor?.zauzeti_datumi ?? []) {
    if (!DATUM_OBLIK.test(datum)) zameri(`zauzet datum "${datum}" nije u obliku YYYY-MM-DD`);
  }

  const recenzije = prostor?.recenzije ?? [];
  for (const recenzija of recenzije) {
    if (!Number.isInteger(recenzija.ocena) || recenzija.ocena < 1 || recenzija.ocena > 5) {
      zameri(`recenzija "${recenzija.autor}" ima ocenu van opsega 1-5`);
    }
  }
  if (recenzije.length < 3) zameri('mora imati bar 3 recenzije');

  if ((prostor?.paketi ?? []).length < 2) zameri('mora imati bar 2 paketa');

  return greske;
}
```

- [ ] **Step 15: Pokreni sve testove**

Run: `npm test`
Expected: PASS, 23 testa ukupno, bez upozorenja

- [ ] **Step 16: Commit**

```bash
git add package.json scripts/
git commit -m "feat: Admin GraphQL klijent, korpe kapaciteta i kontrolisani recnici

Klijent sam proverava userErrors jer Shopify na neuspelu mutaciju
vraca HTTP 200. Opcija tolerisi omogucava idempotentnost.
23 testa pod node --test."
```

---

## Task 3: Definicije metafieldova, metaobjekata i kolekcije

**Files:**
- Create: `scripts/lib/definicije.mjs`
- Create: `scripts/setup-store.mjs`

**Interfaces:**
- Consumes: `napraviKlijenta` iz Taska 2
- Produces:
  - `NAMESPACE = 'prostor'`
  - `METAFIELD_DEFINICIJE` — niz `{ key, name, type, opis, metaobjekat? }`
  - `METAOBJECT_DEFINICIJE` — niz `{ type, name, fieldDefinitions }`
  - `npm run setup` — u store-u postoje 18 metafield definicija, 2 metaobject definicije i objavljena kolekcija `svi-prostori`

- [ ] **Step 1: Napiši `scripts/lib/definicije.mjs`**

```js
/**
 * Deklarativni opis svega sto se kreira u store-u. Odvojeno od
 * orkestracije da bi se lista mogla procitati i proveriti bez citanja
 * GraphQL poziva.
 *
 * Vidi spec 5.2 i 5.4.
 */
export const NAMESPACE = 'prostor';

export const METAOBJECT_DEFINICIJE = [
  {
    type: 'recenzija',
    name: 'Recenzija',
    fieldDefinitions: [
      { key: 'autor', name: 'Autor', type: 'single_line_text_field', required: true },
      { key: 'ocena', name: 'Ocena', type: 'number_integer', required: true },
      { key: 'tekst', name: 'Tekst', type: 'multi_line_text_field', required: true },
      { key: 'datum', name: 'Datum', type: 'date', required: true },
      { key: 'tip_proslave', name: 'Tip proslave', type: 'single_line_text_field', required: false },
    ],
  },
  {
    type: 'paket',
    name: 'Paket',
    fieldDefinitions: [
      { key: 'naziv', name: 'Naziv', type: 'single_line_text_field', required: true },
      { key: 'cena_po_osobi', name: 'Cena po osobi', type: 'money', required: true },
      { key: 'min_gostiju', name: 'Minimalno gostiju', type: 'number_integer', required: true },
      { key: 'ukljucuje', name: 'Ukljucuje', type: 'list.single_line_text_field', required: true },
      { key: 'opis', name: 'Opis', type: 'multi_line_text_field', required: false },
    ],
  },
];

export const METAFIELD_DEFINICIJE = [
  { key: 'kapacitet_min', name: 'Kapacitet - minimum', type: 'number_integer', opis: 'Najmanji broj gostiju.' },
  { key: 'kapacitet_max', name: 'Kapacitet - maksimum', type: 'number_integer', opis: 'Najveci broj gostiju.' },
  { key: 'kapacitet_opseg', name: 'Kapacitet - korpe', type: 'list.single_line_text_field', opis: 'FILTER. Sve korpe koje prostor preseca. Racuna seed skripta.' },
  { key: 'tipovi_proslava', name: 'Tipovi proslava', type: 'list.single_line_text_field', opis: 'FILTER. Za koje proslave je prostor pogodan.' },
  { key: 'sadrzaji', name: 'Sadrzaji', type: 'list.single_line_text_field', opis: 'FILTER. Parking, basta, klima, bina...' },
  { key: 'hrana_pice', name: 'Hrana i pice', type: 'list.single_line_text_field', opis: 'FILTER. Kuhinja, ketering, svedski sto...' },
  { key: 'muzika', name: 'Muzika', type: 'list.single_line_text_field', opis: 'FILTER. DJ, zivi bend, ogranicenje buke.' },
  { key: 'kvart', name: 'Kvart', type: 'single_line_text_field', opis: 'FILTER. Deo Novog Sada.' },
  { key: 'adresa', name: 'Adresa', type: 'single_line_text_field', opis: 'Ulica i broj.' },
  { key: 'lat', name: 'Geografska sirina', type: 'number_decimal', opis: 'Za mapu.' },
  { key: 'lng', name: 'Geografska duzina', type: 'number_decimal', opis: 'Za mapu.' },
  { key: 'zauzeti_datumi', name: 'Zauzeti datumi', type: 'list.date', opis: 'Kalendar i klijentski filter po datumu.' },
  { key: 'ocena', name: 'Prosecna ocena', type: 'rating', opis: 'Skala 1-5. Racuna seed skripta iz recenzija.' },
  { key: 'broj_recenzija', name: 'Broj recenzija', type: 'number_integer', opis: 'Denormalizovano, za karticu.' },
  { key: 'recenzije', name: 'Recenzije', type: 'list.metaobject_reference', metaobjekat: 'recenzija', opis: 'Reference na metaobjekte recenzija.' },
  { key: 'paketi', name: 'Paketi', type: 'list.metaobject_reference', metaobjekat: 'paket', opis: 'Reference na metaobjekte paketa.' },
  { key: 'min_potrosnja', name: 'Minimalna potrosnja', type: 'money', opis: 'Prikaz, bez filtera.' },
  { key: 'kontakt_telefon', name: 'Kontakt telefon', type: 'single_line_text_field', opis: 'Prikaz.' },
];

export const KOLEKCIJA = {
  title: 'Svi prostori',
  handle: 'svi-prostori',
  descriptionHtml: '<p>Svi prostori za proslave u Novom Sadu.</p>',
  sortOrder: 'ALPHA_ASC',
  ruleSet: {
    appliedDisjunctively: false,
    rules: [{ column: 'TAG', relation: 'EQUALS', condition: 'prostor' }],
  },
};
```

- [ ] **Step 2: Napiši `scripts/setup-store.mjs`**

Idempotentnost se radi obrascem **prvo pitaj, pa kreiraj ako fali** — ne oslanjanjem na kod greške. Kodovi grešaka se razlikuju između mutacija i menjaju se između API verzija; postojanje se ne menja.

```js
/**
 * Kreira sve definicije i kolekciju u dev store-u. Idempotentno:
 * moze se pokretati koliko god puta, nista ne duplira.
 *
 * Pokretanje: npm run setup
 */
import { napraviKlijenta } from './lib/admin.mjs';
import { NAMESPACE, METAFIELD_DEFINICIJE, METAOBJECT_DEFINICIJE, KOLEKCIJA } from './lib/definicije.mjs';

const pozovi = napraviKlijenta({
  domen: process.env.SHOPIFY_STORE_DOMAIN,
  token: process.env.SHOPIFY_ADMIN_TOKEN,
});

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
      nodes { id key type { name } }
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
      userErrors { field message code }
    }
  }`;

const Q_PUBLIKACIJE = `
  query DajPublikacije { publications(first: 25) { nodes { id name } } }`;

const M_OBJAVI = `
  mutation Objavi($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message code }
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

async function osigurajMetafieldDefiniciju(definicija, gidoviMetaobjekata) {
  const postojeca = await pozovi(Q_METAFIELD_DEF, { namespace: NAMESPACE, key: definicija.key });
  if (postojeca.metafieldDefinitions.nodes.length > 0) {
    console.log(`  = ${NAMESPACE}.${definicija.key} vec postoji`);
    return;
  }

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

  await pozovi(M_METAFIELD_DEF, { definition: ulaz });
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
  const publikacija = await dajOnlineStorePublikaciju();
  await objavi(kolekcijaId, publikacija);
  console.log('  = objavljena na Online Store');

  console.log(`\nGotovo. ${METAFIELD_DEFINICIJE.length} metafield definicija, ${METAOBJECT_DEFINICIJE.length} metaobjekta.`);
}

/* Task 4 importuje `dajOnlineStorePublikaciju` i `objavi` iz ovog fajla.
   Bez ove zastite bi taj import pokrenuo ceo setup pri svakom seed-u. */
if (process.argv[1] !== import.meta.filename) {
  // Modul je importovan, ne pokrenut direktno.
} else {
glavno().catch((greska) => {
  console.error(`\nPUKLO: ${greska.message}`);
  if (greska.detalji) console.error(JSON.stringify(greska.detalji, null, 2));
  process.exit(1);
});
}
```

- [ ] **Step 3: Pokreni skriptu**

Run: `npm run setup`
Expected: 18 redova `+ prostor.<kljuc>`, 2 reda `+ metaobjekat`, `+ kolekcija "svi-prostori"`, pa `Gotovo.`

Ako neka mutacija odbije oblik ulaza, poruka iz `userErrors` imenuje tačno polje. Najverovatniji uzrok je promena API šeme — proveri trenutnu definiciju kroz `learn_shopify_api` ili `https://shopify.dev/docs/api/admin-graphql`, i ažuriraj `API_VERZIJA` u `scripts/lib/admin.mjs`.

- [ ] **Step 4: Pokreni skriptu drugi put — dokaz idempotentnosti**

Run: `npm run setup`
Expected: svi redovi počinju sa `=` umesto `+`, nula grešaka

- [ ] **Step 5: Proveri u adminu**

1. **Settings → Custom data → Products** — 18 definicija u namespace-u `prostor`
2. **Settings → Custom data → Metaobjects** — `Recenzija` i `Paket`
3. **Products → Collections** — `Svi prostori`, tip **Automated**, uslov `Product tag is equal to prostor`, status objavljena

- [ ] **Step 6: Commit**

```bash
git add scripts/lib/definicije.mjs scripts/setup-store.mjs
git commit -m "feat: skripta koja kreira 18 metafield definicija, 2 metaobjekta i kolekciju

Idempotentna kroz obrazac prvo-pitaj-pa-kreiraj, ne kroz kodove gresaka."
```

---

## Task 4: Demo podaci — 20 prostora sa recenzijama i paketima

**Files:**
- Create: `scripts/seed-podaci.json`
- Create: `scripts/slike.json`
- Create: `scripts/seed-prostori.mjs`
- Test: `scripts/test/seed-podaci.test.mjs`

**Interfaces:**
- Consumes: `napraviKlijenta`, `korpeZaKapacitet`, `kodirajVrednost`, `proveriProstor`, `dajOnlineStorePublikaciju`, `objavi`
- Produces: 20 objavljenih proizvoda sa tagom `prostor`, svaki sa svih 18 metafieldova; `collections['svi-prostori'].products` vraća 20 stavki

**Nazivi su izmišljeni namerno.** Demo se ne sme predstavljati kao stvarna ponuda pravih objekata u Novom Sadu.

- [ ] **Step 1: Napravi `scripts/slike.json` sa fotografijama po kategoriji**

Dvadeset dva URL-a, ne šezdeset — prostori iste kategorije dele fond fotografija.

**Kako su nabavljeni tokom izvršavanja:** Unsplash blokira skrejpovanje pretrage (vraća prazan odgovor), ali `https://unsplash.com/photos/<id>/download?w=1600` preusmerava na stabilan `images.unsplash.com/photo-<id>` URL. ID-jevi su nađeni pretragom, razrešeni kroz to preusmerenje i **svaki je proveren da vraća HTTP 200 i `image/jpeg`**. Šest ID-jeva dosledno ne daje preuzimanje i zamenjeno je drugima.

Ako neka fotografija ne odgovara, zameni URL u `scripts/slike.json` — seed radi sa bilo kojim javno dostupnim URL-om.

```json
{
  "Restoran": ["<url1>", "<url2>", "<url3>"],
  "Svečana sala": ["<url1>", "<url2>", "<url3>"],
  "Dečija igraonica": ["<url1>", "<url2>", "<url3>"],
  "Klub": ["<url1>", "<url2>", "<url3>"],
  "Kafić": ["<url1>", "<url2>", "<url3>"],
  "Salaš": ["<url1>", "<url2>", "<url3>"],
  "Terasa / krovna bašta": ["<url1>", "<url2>", "<url3>"],
  "Konferencijska sala": ["<url1>", "<url2>", "<url3>"]
}
```

Pojmovi za pretragu po kategoriji: `restaurant interior`, `banquet hall`, `kids playroom`, `nightclub`, `cafe terrace`, `farmhouse garden party`, `rooftop terrace`, `conference room`.

- [ ] **Step 2: Napiši `scripts/seed-podaci.json` — 20 prostora**

Ovo je merodavna lista. Cene su u dinarima po osobi.

| # | handle | Naziv | Kategorija | Kvart | Cena | Kapacitet |
|---|---|---|---|---|---|---|
| 1 | `restoran-dunavska-terasa` | Restoran Dunavska terasa | Restoran | Stari grad | 2200 | 40–120 |
| 2 | `salas-bagremar` | Salaš Bagremar | Salaš | Okolina Novog Sada | 2800 | 60–250 |
| 3 | `svecana-sala-kristal` | Svečana sala Kristal | Svečana sala | Novo naselje | 2400 | 100–400 |
| 4 | `igraonica-baloncic` | Igraonica Balončić | Dečija igraonica | Liman | 900 | 10–40 |
| 5 | `klub-tvrdjava` | Klub Tvrđava | Klub | Petrovaradin | 1500 | 80–300 |
| 6 | `kafic-kod-mosta` | Kafić Kod mosta | Kafić | Podbara | 800 | 15–50 |
| 7 | `terasa-panorama` | Terasa Panorama | Terasa / krovna bašta | Stari grad | 1900 | 30–90 |
| 8 | `konferencijski-centar-sava` | Konferencijski centar Sava | Konferencijska sala | Grbavica | 1700 | 50–200 |
| 9 | `restoran-lipov-hlad` | Restoran Lipov hlad | Restoran | Sremska Kamenica | 2600 | 50–150 |
| 10 | `svecana-sala-bella-vista` | Svečana sala Bella Vista | Svečana sala | Detelinara | 2100 | 120–350 |
| 11 | `salas-zlatni-klas` | Salaš Zlatni klas | Salaš | Futog | 2500 | 80–200 |
| 12 | `igraonica-zvezdica` | Igraonica Zvezdica | Dečija igraonica | Telep | 850 | 10–30 |
| 13 | `restoran-dunavski-cvet` | Restoran Dunavski cvet | Restoran | Liman | 2300 | 40–110 |
| 14 | `klub-fabrika` | Klub Fabrika | Klub | Salajka | 1400 | 100–280 |
| 15 | `kafic-zelena-basta` | Kafić Zelena bašta | Kafić | Adice | 750 | 20–60 |
| 16 | `terasa-nebo` | Terasa Nebo | Terasa / krovna bašta | Novo naselje | 1800 | 25–80 |
| 17 | `svecana-sala-harmonija` | Svečana sala Harmonija | Svečana sala | Veternik | 2000 | 90–300 |
| 18 | `restoran-stari-podrum` | Restoran Stari podrum | Restoran | Petrovaradin | 2700 | 30–100 |
| 19 | `salas-vetrenjaca` | Salaš Vetrenjača | Salaš | Okolina Novog Sada | 2900 | 100–300 |
| 20 | `poslovni-centar-ns` | Poslovni centar NS | Konferencijska sala | Stari grad | 1600 | 40–150 |

Oblik jednog unosa, kompletan — svih 20 prati isti šablon:

```json
{
  "prostori": [
    {
      "handle": "restoran-dunavska-terasa",
      "naziv": "Restoran Dunavska terasa",
      "kategorija": "Restoran",
      "vlasnik": "Dunavska terasa d.o.o.",
      "opis": "<p>Restoran na samoj obali Dunava, sa natkrivenom terasom i pogledom na Petrovaradinsku tvrđavu. Sala prima do 120 gostiju, a terasa radi od aprila do oktobra.</p><p>Kuhinja je domaća, sa naglaskom na riblje specijalitete i roštilj. Muzika je dozvoljena do ponoći.</p>",
      "kvart": "Stari grad",
      "adresa": "Beogradski kej 18",
      "lat": 45.2551,
      "lng": 19.8536,
      "cena_po_osobi": 2200,
      "min_potrosnja": 60000,
      "kontakt_telefon": "021 555 120",
      "kapacitet_min": 40,
      "kapacitet_max": 120,
      "tipovi_proslava": ["Rođendan", "Punoletstvo", "Svadba", "Krštenje", "Poslovni događaj"],
      "sadrzaji": ["Parking", "Bašta", "Otvoren prostor", "Zatvoren prostor", "Klima", "Ozvučenje", "Garderoba", "Wi-Fi"],
      "hrana_pice": ["Sopstvena kuhinja", "Švedski sto", "Meni po izboru", "Vegetarijanski meni", "Piće uključeno"],
      "muzika": ["DJ dozvoljen", "Živi bend", "Ograničenje buke posle 24h"],
      "zauzeti_datumi": ["2026-09-19", "2026-09-26", "2026-10-03", "2026-10-15", "2026-10-17", "2026-11-07"],
      "recenzije": [
        { "autor": "Milica J.", "ocena": 5, "datum": "2026-06-14", "tip_proslave": "Svadba", "tekst": "Svadba za 90 ljudi, sve je prošlo bez ijedne greške. Terasa uveče izgleda fantastično." },
        { "autor": "Nemanja P.", "ocena": 4, "datum": "2026-05-02", "tip_proslave": "Punoletstvo", "tekst": "Odlična hrana i osoblje. Jedina zamerka je parking, koji je uveče pun." },
        { "autor": "Jelena S.", "ocena": 5, "datum": "2026-04-11", "tip_proslave": "Krštenje", "tekst": "Mirno, lepo, taman za manje društvo. Preporuka za porodične proslave." },
        { "autor": "Vladimir K.", "ocena": 4, "datum": "2026-03-22", "tip_proslave": "Poslovni događaj", "tekst": "Organizovali smo firmsku večeru za 60 ljudi. Sve na nivou." }
      ],
      "paketi": [
        { "naziv": "Standard", "cena_po_osobi": 2200, "min_gostiju": 40, "ukljucuje": ["Predjelo", "Glavno jelo", "Desert", "Bezalkoholna pića"], "opis": "Osnovni meni sa posluživanjem za stolom." },
        { "naziv": "Svečani", "cena_po_osobi": 3400, "min_gostiju": 60, "ukljucuje": ["Aperitiv", "Predjelo", "Dva glavna jela", "Desert", "Neograničeno piće", "Dekoracija stolova"], "opis": "Za svadbe i veće proslave." },
        { "naziv": "Poslovni ručak", "cena_po_osobi": 1800, "min_gostiju": 20, "ukljucuje": ["Glavno jelo", "Salata", "Kafa", "Projektor"], "opis": "Radni format, kraće trajanje." }
      ]
    }
  ]
}
```

Pravila za preostalih 19:

- **`opis`** — dva `<p>` pasusa, prvi o prostoru i kapacitetu, drugi o hrani i muzici.
- **`recenzije`** — 3 do 5 po prostoru, ocene 3 do 5 (najmanje jedna četvorka ili trojka po prostoru, da prosek ne bude svuda 5.0), datumi u 2026, autor kao `Ime P.`, tekst 1–2 rečenice sa konkretnim detaljem.
- **`paketi`** — 2 do 3, `cena_po_osobi` najjeftinijeg paketa mora biti **jednaka** `cena_po_osobi` prostora, jer to postaje cena proizvoda i cenovni filter.
- **`zauzeti_datumi`** — 4 do 8 datuma između `2026-09-10` i `2026-12-31`, sa **preklapanjem** između prostora: bar 6 prostora mora biti zauzeto `2026-10-15`, da demonstracija filtera po datumu ima šta da pokaže.
- **`lat`/`lng`** — stvarne koordinate kvarta, dovoljno je 4 decimale.
- **Pokrivenost rečnika** — svaka vrednost iz `SADRZAJI`, `HRANA_PICE`, `MUZIKA` i `TIPOVI_PROSLAVA` mora se pojaviti bar jednom, inače filter ima mrtve opcije.

**Ispravka tokom izvršavanja:** `proveriProstor` je prvobitno zahtevao polje `prostor.slike`, ali fotografije po dizajnu žive u `scripts/slike.json` po kategoriji — nijedan prostor to polje nema. Provera je uklonjena iz validatora; pokrivenost fotografija proverava seed test.

**Dodato tokom izvršavanja:** još tri testa koja plan nije imao — da svaki prostor ima bar jednu ocenu ispod pet (inače je prosek svuda 5.0 i zvezdice ne znače ništa), da su koordinate u okolini Novog Sada, i `scripts/test/seed-prostori.test.mjs` sa devet provera nad `metafieldoviZa`: da svaki prostor proizvodi tačno 18 metafieldova, da se tipovi poklapaju sa definicijama, i da nijedna vrednost nije `undefined`, `NaN` ili `[object Object]`.

- [ ] **Step 3: Napiši test koji validira seed podatke — mora pasti**

Ovo je najvredniji test u planu. Tipfeler u srpskoj vrednosti ne bi pukao — tiho bi napravio filter opciju sa jednim prostorom.

Create `scripts/test/seed-podaci.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proveriProstor, SADRZAJI, HRANA_PICE, MUZIKA, TIPOVI_PROSLAVA } from '../lib/recnici.mjs';
import { korpeZaKapacitet } from '../lib/kapacitet.mjs';

const { prostori } = JSON.parse(readFileSync(new URL('../seed-podaci.json', import.meta.url), 'utf8'));

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
    assert.equal(najjeftiniji, prostor.cena_po_osobi, `${prostor.naziv}: paket ${najjeftiniji} vs prostor ${prostor.cena_po_osobi}`);
  }
});

test('svaka vrednost recnika se koristi bar jednom — nema mrtvih filter opcija', () => {
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

test('bar 6 prostora je zauzeto 2026-10-15 — demo filtera po datumu', () => {
  const zauzeti = prostori.filter((p) => p.zauzeti_datumi.includes('2026-10-15'));
  assert.ok(zauzeti.length >= 6, `samo ${zauzeti.length} prostora zauzeto tog datuma`);
});

test('prosecne ocene nisu sve iste', () => {
  const proseci = prostori.map((p) => p.recenzije.reduce((z, r) => z + r.ocena, 0) / p.recenzije.length);
  assert.ok(new Set(proseci.map((o) => o.toFixed(2))).size > 5, 'ocene su previse uniformne');
});
```

- [ ] **Step 4: Pokreni test i popravljaj podatke dok ne prođe**

Run: `node --test scripts/test/seed-podaci.test.mjs`
Expected: prvo FAIL sa spiskom konkretnih grešaka, pa PASS kad se `seed-podaci.json` dopuni na 20 ispravnih prostora

- [ ] **Step 5: Napiši `scripts/seed-prostori.mjs`**

```js
/**
 * Useje 20 prostora sa recenzijama, paketima, slikama i svih 18
 * metafieldova. Idempotentno po handle-u.
 *
 * Redosled je bitan: metaobjekti prvi, jer proizvod cuva reference na njih.
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

const pozovi = napraviKlijenta({
  domen: process.env.SHOPIFY_STORE_DOMAIN,
  token: process.env.SHOPIFY_ADMIN_TOKEN,
});

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
  mutation KreirajMetaobjekat($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject { id }
      userErrors { field message code }
    }
  }`;

async function kreirajMetaobjekat(tip, polja) {
  const rezultat = await pozovi(M_METAOBJEKAT, {
    metaobject: {
      type: tip,
      fields: Object.entries(polja).map(([key, value]) => ({ key, value })),
    },
  });
  return rezultat.metaobjectCreate.metaobject.id;
}

async function kreirajRecenzije(prostor) {
  const gidovi = [];
  for (const recenzija of prostor.recenzije) {
    gidovi.push(await kreirajMetaobjekat('recenzija', {
      autor: recenzija.autor,
      ocena: String(recenzija.ocena),
      tekst: recenzija.tekst,
      datum: recenzija.datum,
      tip_proslave: recenzija.tip_proslave ?? '',
    }));
  }
  return gidovi;
}

async function kreirajPakete(prostor) {
  const gidovi = [];
  for (const paket of prostor.paketi) {
    gidovi.push(await kreirajMetaobjekat('paket', {
      naziv: paket.naziv,
      cena_po_osobi: kodirajVrednost('money', paket.cena_po_osobi),
      min_gostiju: String(paket.min_gostiju),
      ukljucuje: JSON.stringify(paket.ukljucuje),
      opis: paket.opis ?? '',
    }));
  }
  return gidovi;
}

function prosecnaOcena(recenzije) {
  const zbir = recenzije.reduce((z, r) => z + r.ocena, 0);
  return (zbir / recenzije.length).toFixed(1);
}

function metafieldoviZa(prostor, ownerId, gidoviRecenzija, gidoviPaketa) {
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
    }],
  });

  const gidoviRecenzija = await kreirajRecenzije(prostor);
  const gidoviPaketa = await kreirajPakete(prostor);

  await pozovi(M_METAFIELDOVI, {
    metafields: metafieldoviZa(prostor, proizvod.id, gidoviRecenzija, gidoviPaketa),
  });

  if (!imaMedije) {
    await pozovi(M_MEDIJI, {
      productId: proizvod.id,
      media: (slike[prostor.kategorija] ?? []).map((url, i) => ({
        originalSource: url,
        alt: `${prostor.naziv} — fotografija ${i + 1}`,
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

glavno().catch((greska) => {
  console.error(`\nPUKLO: ${greska.message}`);
  if (greska.detalji) console.error(JSON.stringify(greska.detalji, null, 2));
  process.exit(1);
});
```

**Ispravka tokom izvršavanja — `metaobjectUpsert` umesto `metaobjectCreate`.** Plan je koristio `metaobjectCreate`, uz priznatu manu: svako ponovno pokretanje pravi nove entitete, proizvod pokazuje samo na poslednje, a stari ostaju kao siročad. Shopify-jev `shopify-custom-data` skill propisuje `metaobjectUpsert`, koji uz deterministički handle (`recenzija-<handle prostora>-<redni broj>`) tu manu uklanja u potpunosti. Seed je sad idempotentan i za metaobjekte, ne samo za proizvode.

- [ ] **Step 6: Pokreni seed**

Run: `npm run seed`
Expected: 20 redova `+ <naziv>`, pa `Gotovo.`

- [ ] **Step 7: Smoke lista u adminu**

1. **Products** — 20 proizvoda, svaki sa tagom `prostor` i statusom Active
2. Otvori `Restoran Dunavska terasa` → cena **2.200 RSD**, 3 fotografije, `Metafields` sekcija popunjena
3. Skroluj do metafieldova → `Kapacitet - korpe` sadrži tačno `30-50`, `50-100`, `100-150`
4. `Recenzije` pokazuje 4 povezana metaobjekta, `Paketi` pokazuje 3
5. **Products → Collections → Svi prostori** → 20 proizvoda

- [ ] **Step 8: Pokreni seed drugi put**

Run: `npm run seed`
Expected: prolazi bez greške, u **Products** i dalje tačno 20 proizvoda (ne 40)

- [ ] **Step 9: Commit**

```bash
git add scripts/
git commit -m "feat: seed 20 demo prostora sa recenzijama, paketima i slikama

Validacija seed podataka pod testom - tipfeler u srpskoj vrednosti
filtera bi inace tiho napravio mrtvu filter opciju."
```

---

## Task 5: Filteri u Search & Discovery — KAPIJA

Bez ovoga stranica rezultata nema šta da iscrta. Radi se pre ijedne linije UI koda, jer je ovo pretpostavka na kojoj stoji ceo Task 11.

**Files:** nijedan — konfiguracija u adminu

**Interfaces:**
- Consumes: metafield definicije iz Taska 3, proizvode iz Taska 4
- Produces: `collection.filters` u Liquidu vraća 8 filtera; parametri `filter.p.m.prostor.*` rade u URL-u

- [ ] **Step 1: Instaliraj Search & Discovery**

Admin → **Apps → Shopify App Store** → potraži **Search & Discovery** → **Install**. Besplatna je i Shopify je izdaje.

- [ ] **Step 2: Dodaj šest filtera po metafieldu**

**Search & Discovery → Filters → Add filter.** Za svaki: izvor je `Product metafield → prostor.<ključ>`, pa se podesi prikazano ime.

| Izvor | Prikazano ime | Redosled |
|---|---|---|
| `prostor.tipovi_proslava` | Tip proslave | 1 |
| `prostor.kapacitet_opseg` | Broj gostiju | 2 |
| `prostor.kvart` | Deo grada | 4 |
| `prostor.sadrzaji` | Pogodnosti | 6 |
| `prostor.hrana_pice` | Hrana i piće | 7 |
| `prostor.muzika` | Muzika | 8 |

- [ ] **Step 3: Uključi i preimenuj dva nativna filtera**

| Nativni izvor | Prikazano ime | Redosled |
|---|---|---|
| Product type | Tip prostora | 3 |
| Price | Cena po osobi | 5 |

Isključi **Availability**, **Vendor** i **Tags** — vendor je vlasnik i ne zanima korisnika, a `prostor` je jedini tag.

- [ ] **Step 4: Sačekaj indeksiranje i proveri na storefrontu**

Indeksiranje traje nekoliko minuta. Pa otvori:

```
https://<domen>/collections/svi-prostori?filter.p.m.prostor.tipovi_proslava=Svadba
```

Expected: prikazuje se manje od 20 prostora, i svaki u adminu ima `Svadba` u `tipovi_proslava`

- [ ] **Step 5: Smoke lista — ovo je stvarna kapija**

Svaki URL se otvara direktno i broji rezultate:

1. `?filter.p.m.prostor.kapacitet_opseg=100-150` → samo prostori čiji opseg preseca 101–150
2. `?filter.p.m.prostor.kvart=Liman` → tačno prostori sa Limana
3. `?filter.p.product_type=Sala%C5%A1` → 3 salaša
4. `?filter.v.price.gte=1000&filter.v.price.lte=2000` → samo prostori sa cenom u tom rasponu
5. **Dva filtera odjednom:** `?filter.p.m.prostor.tipovi_proslava=Svadba&filter.p.m.prostor.sadrzaji=Parking` → presek, ne unija
6. `?filter.p.m.prostor.muzika=DJ+dozvoljen` → razmak u vrednosti radi
7. `?filter.p.m.prostor.kvart=Sremska+Kamenica` → dijakritika i razmak rade zajedno

Ako neki filter vraća prazno a u adminu podaci postoje: proveri da vrednost u `seed-podaci.json` **doslovno** odgovara rečniku iz `scripts/lib/recnici.mjs`, uključujući dijakritiku.

- [ ] **Step 6: Zabeleži stanje**

```bash
git commit --allow-empty -m "chore: Search & Discovery podesen, 8 filtera verifikovano

Kapija za Task 11. Provereno 7 URL kombinacija ukljucujuci presek
dva filtera i vrednosti sa razmakom i dijakritikom."
```

---

## Task 6: Dizajn tokeni i osnovni CSS

**Files:**
- Modify: `config/settings_schema.json`
- Modify: `snippets/css-variables.liquid`
- Modify: `assets/critical.css` (prepis)

**Interfaces:**
- Produces: CSS promenljive koje koriste svi kasniji taskovi —
  `--boja-pozadina`, `--boja-tekst`, `--boja-prigusen`, `--boja-akcenat`, `--boja-akcenat-tekst`, `--boja-povrsina`, `--boja-ivica`, `--boja-ocena`, `--boja-zauzeto`,
  `--radijus-kartica`, `--radijus-polja`,
  `--razmak-1` do `--razmak-8`, `--font-naslov`, `--font-telo`, `--tekst-xs` do `--tekst-3xl`, `--senka-1`, `--senka-2`;
  klase `.dugme`, `.dugme--primarno`, `.dugme--tiho`, `.polje`, `.oznaka`, `.vizuelno-skriveno`

- [ ] **Step 0: Učitaj `frontend-design` skill**

Spec, odeljak 10, traži da konkretne odluke o paleti, tipografiji i ritmu donese `frontend-design` skill, a ne slobodna procena.

**Izvršeno drugačije nego što je ovde bilo napisano.** Prvobitni predlog — topla krem pozadina `#FBF9F6`, Playfair Display i terakota `#B4451F` — skill prepoznaje kao *prvi od tri navedena AI podrazumevana izgleda*, koji se pojavljuju bez obzira na temu. Pravac je izveden iz same teme:

- **Poreklo:** vojvođanski salaš — krečeno belo zidova i vojvođansko plavo stolarije.
- **Paleta:** `#F2F4F1` kreč (hladno kredasto, ne topla krem) · `#2B4C8C` modro (identitet, CTA, aktivni filteri) · `#16202E` čađ (tekst) · `#5C6B7A` prigušen · `#DCE2DC` taraba (ivice) · `#C98A2B` žito (**samo** zvezdice) · `#B22233` vez (**samo** zauzeti datumi).
- **Zelena „slobodno" boja je izbačena.** Slobodno je neutralno, zauzeto crveno, izabrano modro. Potvrdne kvačice nose modro. Četiri boje, svaka sa jednim poslom.
- **Tipografija:** naslovi `Archivo` 700 sa `-0.022em` zbijanjem — grotesk iz jezika natpisa nad kafanama i salašima, ne serif iz svadbenih časopisa. Telo `Karla`. Obe imaju Latin Extended, što je uslov za `š đ č ć ž`.
- **Dodata `.natpis` klasa:** verzal, `0.09em` razmak. Nosi kategoriju ili kvart — podatak, ne ukras.
- **Potpis stranice:** traka dostupnosti na kartici (Task 9).

- [ ] **Step 1: Proširi `config/settings_schema.json`**

U grupu `t:general.typography` dodaj font naslova, posle postojećeg `type_primary_font`:

```json
{
  "type": "font_picker",
  "id": "type_heading_font",
  "default": "archivo_n7",
  "label": "t:general.heading"
}
```

Ako theme editor odbije handle `playfair_display_n4`, otvori font picker i izaberi bilo koji serif — handle se tada upiše sam.

U grupu `t:general.colors` promeni podrazumevane vrednosti i dodaj nove boje:

```json
{ "type": "color", "id": "background_color", "default": "#F2F4F1", "label": "t:labels.background" },
{ "type": "color", "id": "foreground_color", "default": "#16202E", "label": "t:labels.foreground" },
{ "type": "color", "id": "muted_color", "default": "#5C6B7A", "label": "t:labels.muted" },
{ "type": "color", "id": "surface_color", "default": "#FFFFFF", "label": "t:labels.surface" },
{ "type": "color", "id": "border_color", "default": "#DCE2DC", "label": "t:labels.border" },
{ "type": "color", "id": "accent_color", "default": "#2B4C8C", "label": "t:labels.accent" },
{ "type": "color", "id": "accent_contrast_color", "default": "#FFFFFF", "label": "t:labels.accent_contrast" },
{ "type": "color", "id": "rating_color", "default": "#C98A2B", "label": "t:labels.rating" },
{ "type": "color", "id": "busy_color", "default": "#B22233", "label": "t:labels.busy" },
{
  "type": "range", "id": "card_corner_radius", "min": 0, "max": 24, "step": 2,
  "unit": "px", "label": "t:labels.card_corner_radius", "default": 6
}
```

Postojeći `input_corner_radius` ostaje.

- [ ] **Step 2: Prepiši `snippets/css-variables.liquid`**

```liquid
{% style %}
  {% # Ucitava sve varijante fontova sa display: swap %}
  {{ settings.type_primary_font | font_face: font_display: 'swap' }}
  {{ settings.type_primary_font | font_modify: 'weight', 'bold' | font_face: font_display: 'swap' }}
  {{ settings.type_primary_font | font_modify: 'style', 'italic' | font_face: font_display: 'swap' }}
  {{ settings.type_heading_font | font_face: font_display: 'swap' }}
  {{ settings.type_heading_font | font_modify: 'weight', 'bold' | font_face: font_display: 'swap' }}

  :root {
    --font-telo: {{ settings.type_primary_font.family }}, {{ settings.type_primary_font.fallback_families }};
    --font-naslov: {{ settings.type_heading_font.family }}, {{ settings.type_heading_font.fallback_families }};

    --page-width: {{ settings.max_page_width }};
    --page-margin: {{ settings.min_page_margin }}px;

    --boja-pozadina: {{ settings.background_color }};
    --boja-tekst: {{ settings.foreground_color }};
    --boja-prigusen: {{ settings.muted_color }};
    --boja-povrsina: {{ settings.surface_color }};
    --boja-ivica: {{ settings.border_color }};
    --boja-akcenat: {{ settings.accent_color }};
    --boja-akcenat-tekst: {{ settings.accent_contrast_color }};
    --boja-zauzeto: {{ settings.busy_color }};

    --boja-akcenat-tiha: {{ settings.accent_color | color_mix: settings.background_color, 12 }};
    --boja-pozadina-tamna: {{ settings.background_color | color_darken: 3 }};

    --radijus-polja: {{ settings.input_corner_radius }}px;
    --radijus-kartica: {{ settings.card_corner_radius }}px;

    /* Skeleton je koristio ova imena; ostavljena su da postojeci reset radi. */
    --color-background: var(--boja-pozadina);
    --color-foreground: var(--boja-tekst);
    --style-border-radius-inputs: var(--radijus-polja);
  }
{% endstyle %}
```

`color_mix` uzima 12% akcenta u pozadini — daje tihu podlogu za aktivne filter čipove koja se sama prilagodi kad merchant promeni akcenat.

- [ ] **Step 3: Prepiši `assets/critical.css`**

Reset i `.shopify-section` mreža iz Skeletona ostaju nedirnuti — dobri su i sve se na njih oslanja. Dodaje se skala, tipografija i tri deljene komponente.

```css
/** Critical CSS. Ucitava se na svakoj stranici. */

/* ---------- Reset (Skeleton, nepromenjen) ---------- */
* { box-sizing: border-box; margin: 0; }

body { display: flex; flex-direction: column; margin: 0; min-height: 100svh; }

html:has(dialog[scroll-lock][open], details[scroll-lock][open]) { overflow: hidden; }

img, picture, video, canvas, svg { display: block; max-width: 100%; height: auto; }

input, textarea, select { font: inherit; border-radius: var(--radijus-polja); }

select { background-color: var(--boja-povrsina); color: currentcolor; }

dialog { background-color: var(--boja-povrsina); color: var(--boja-tekst); }

p { text-wrap: pretty; }
p, h1, h2, h3, h4, h5, h6 { overflow-wrap: break-word; }
p:empty { display: none; }

:is(p, h1, h2, h3, h4, h5, h6):first-child,
:empty:first-child + :where(p, h1, h2, h3, h4, h5, h6) { margin-block-start: 0; }

:is(p, h1, h2, h3, h4, h5, h6):last-child,
:where(p, h1, h2, h3, h4, h5, h6) + :has(+ :empty:last-child) { margin-block-end: 0; }

/* ---------- Skala ---------- */
:root {
  --razmak-1: 0.25rem;
  --razmak-2: 0.5rem;
  --razmak-3: 0.75rem;
  --razmak-4: 1rem;
  --razmak-5: 1.5rem;
  --razmak-6: 2rem;
  --razmak-7: 3rem;
  --razmak-8: 4.5rem;

  --tekst-xs: 0.75rem;
  --tekst-sm: 0.875rem;
  --tekst-base: 1rem;
  --tekst-lg: 1.125rem;
  --tekst-xl: clamp(1.25rem, 1.1rem + 0.7vw, 1.5rem);
  --tekst-2xl: clamp(1.5rem, 1.2rem + 1.4vw, 2.25rem);
  --tekst-3xl: clamp(2rem, 1.4rem + 2.8vw, 3.5rem);

  --senka-1: 0 1px 2px rgb(36 31 27 / 6%), 0 2px 8px rgb(36 31 27 / 4%);
  --senka-2: 0 2px 6px rgb(36 31 27 / 8%), 0 12px 28px rgb(36 31 27 / 8%);
}

/* ---------- Tipografija ---------- */
body {
  font-family: var(--font-telo);
  font-size: var(--tekst-base);
  line-height: 1.6;
  background-color: var(--boja-pozadina);
  color: var(--boja-tekst);
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: var(--font-naslov);
  font-weight: 400;
  line-height: 1.15;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

h1 { font-size: var(--tekst-3xl); }
h2 { font-size: var(--tekst-2xl); }
h3 { font-size: var(--tekst-xl); }
h4 { font-size: var(--tekst-lg); font-weight: 600; }

a { color: inherit; }

.prigusen { color: var(--boja-prigusen); }
.sitno { font-size: var(--tekst-sm); }

/* ---------- Layout (Skeleton, nepromenjen) ---------- */
.shopify-section {
  --content-width: min(
    calc(var(--page-width) - var(--page-margin) * 2),
    calc(100% - var(--page-margin) * 2)
  );
  --content-margin: minmax(var(--page-margin), 1fr);
  --content-grid: var(--content-margin) var(--content-width) var(--content-margin);

  position: relative;
  grid-template-columns: var(--content-grid);
  display: grid;
  width: 100%;
}

.shopify-section > * { grid-column: 2; }
.shopify-section > .full-width { grid-column: 1 / -1; }

/* ---------- Dugmad ---------- */
.dugme {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--razmak-2);
  padding: var(--razmak-3) var(--razmak-5);
  border: 1px solid transparent;
  border-radius: var(--radijus-polja);
  font-size: var(--tekst-base);
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}

.dugme--primarno {
  background-color: var(--boja-akcenat);
  color: var(--boja-akcenat-tekst);
}

.dugme--primarno:hover { background-color: color-mix(in oklab, var(--boja-akcenat) 88%, black); }

.dugme--tiho {
  background-color: transparent;
  border-color: var(--boja-ivica);
  color: var(--boja-tekst);
}

.dugme--tiho:hover { background-color: var(--boja-pozadina-tamna); }

.dugme:focus-visible,
.polje:focus-visible,
a:focus-visible,
summary:focus-visible {
  outline: 2px solid var(--boja-akcenat);
  outline-offset: 2px;
}

/* ---------- Polja ---------- */
.polje {
  width: 100%;
  padding: var(--razmak-3);
  background-color: var(--boja-povrsina);
  border: 1px solid var(--boja-ivica);
  border-radius: var(--radijus-polja);
  color: var(--boja-tekst);
}

.polje::placeholder { color: var(--boja-prigusen); }

.polje-grupa {
  display: flex;
  flex-direction: column;
  gap: var(--razmak-2);
}

.polje-grupa > label {
  font-size: var(--tekst-sm);
  font-weight: 600;
}

/* ---------- Oznake ---------- */
.oznaka {
  display: inline-flex;
  align-items: center;
  gap: var(--razmak-1);
  padding: var(--razmak-1) var(--razmak-2);
  border-radius: 999px;
  background-color: var(--boja-pozadina-tamna);
  font-size: var(--tekst-xs);
  white-space: nowrap;
}

.oznaka--slobodno { background-color: color-mix(in oklab, var(--boja-akcenat) 14%, white); color: var(--boja-akcenat); }
.oznaka--zauzeto { background-color: color-mix(in oklab, var(--boja-zauzeto) 14%, white); color: var(--boja-zauzeto); }

/* ---------- Pristupacnost ---------- */
.vizuelno-skriveno {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 4: Pokreni theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 5: Smoke lista**

Pokreni `shopify theme dev` i otvori početnu:

1. Pozadina je topla bela `#FBF9F6`, ne čisto bela
2. U DevTools na `<html>` postoji `--boja-akcenat: #B4451F`
3. **Theme editor → Theme settings → Colors** — devet boja, promena akcenta se vidi bez refresh-a
4. **Theme settings → Typography** — dva font pickera

- [ ] **Step 6: Commit**

```bash
git add config/settings_schema.json snippets/css-variables.liquid assets/critical.css
git commit -m "feat: dizajn tokeni, skala razmaka i tipografije, deljene komponente"
```

---

## Task 7: Prevodi

Svaki kasniji task dodaje ključeve u **oba** locale fajla. Ovaj task postavlja celo stablo unapred, da se kasnije samo dopunjava.

**Files:**
- Modify: `locales/en.default.json`
- Create: `locales/sr.json`
- Modify: `locales/en.default.schema.json`
- Create: `locales/sr.schema.json`

**Interfaces:**
- Produces: ključevi `opste.*`, `zaglavlje.*`, `pocetna.*`, `rezultati.*`, `kartica.*`, `filteri.*`, `prostor.*`, `upit.*`, `poredjenje.*`

- [ ] **Step 1: Dodaj nove grupe u `locales/en.default.json`**

Postojeće grupe (`404`, `blog`, `cart`, `customers`, `collections`, `gift_card`, `password`, `search`) ostaju. Dodaju se:

```json
{
  "opste": {
    "po_osobi": "per person",
    "gostiju": "guests",
    "prikazi_jos": "Show more",
    "bilo_koji": "Any",
    "obavezno": "Required"
  },
  "zaglavlje": {
    "prostori": "Venues",
    "kako_radi": "How it works",
    "poredjenje": "Compare",
    "poredjenje_sa_brojem": "Compare ({{ broj }})",
    "meni": "Menu"
  },
  "pocetna": {
    "naslov": "Find a venue for your celebration in Novi Sad",
    "podnaslov": "Restaurants, banquet halls, playrooms, clubs and farmsteads — filtered by what you actually need.",
    "tip_proslave": "Type of celebration",
    "datum": "Date",
    "broj_gostiju": "Number of guests",
    "deo_grada": "Part of town",
    "budzet_do": "Budget per person, up to",
    "trazi": "Search venues",
    "kategorije_naslov": "Browse by occasion",
    "istaknuti_naslov": "Featured venues",
    "istaknuti_svi": "See all venues",
    "kako_radi_naslov": "How it works",
    "korak_1_naslov": "Say what you need",
    "korak_1_tekst": "Type of celebration, date, number of guests and budget.",
    "korak_2_naslov": "Compare venues",
    "korak_2_tekst": "Filter by amenities, food, music and location, then compare side by side.",
    "korak_3_naslov": "Send an inquiry",
    "korak_3_tekst": "Pick a free date and send your request directly to the venue."
  },
  "rezultati": {
    "naslov": "Venues in Novi Sad",
    "broj": "{{ broj }} venues",
    "filteri": "Filters",
    "primeni": "Apply filters",
    "ponisti_sve": "Clear all",
    "sortiraj": "Sort by",
    "sortiraj_podrazumevano": "Recommended",
    "sortiraj_ocena": "Highest rated",
    "prazno_naslov": "No venues match these filters",
    "prazno_tekst": "Try removing a filter or widening your budget.",
    "aktivni_filteri": "Active filters",
    "zauzeto_obavestenje": "Showing {{ prikazano }} of {{ ukupno }} — {{ zauzeto }} venues are booked on {{ datum }}."
  },
  "kartica": {
    "uporedi": "Compare",
    "kapacitet": "{{ min }}–{{ max }} guests",
    "od_cene": "from {{ cena }}",
    "broj_recenzija": "{{ broj }} reviews",
    "zauzeto": "Booked on the selected date"
  },
  "filteri": {
    "cena_od": "From",
    "cena_do": "To"
  },
  "prostor": {
    "kapacitet": "Capacity",
    "kvart": "Location",
    "min_potrosnja": "Minimum spend",
    "telefon": "Phone",
    "o_prostoru": "About the venue",
    "pogodnosti": "Amenities",
    "hrana_pice": "Food and drink",
    "muzika": "Music",
    "gde_se_nalazi": "Where it is",
    "otvori_mapu": "Open in maps",
    "paketi_naslov": "Packages",
    "paket_min": "from {{ broj }} guests",
    "paket_ukljucuje": "Includes",
    "kalendar_naslov": "Availability",
    "kalendar_uputstvo": "Pick a free date to prefill the inquiry form.",
    "kalendar_slobodno": "Free",
    "kalendar_zauzeto": "Booked",
    "kalendar_prethodni": "Previous month",
    "kalendar_sledeci": "Next month",
    "kalendar_napomena": "Availability is maintained by the venue and is not a live booking system.",
    "recenzije_naslov": "Reviews",
    "recenzije_prosek": "{{ ocena }} out of 5 · {{ broj }} reviews",
    "recenzije_nema": "No reviews yet."
  },
  "upit": {
    "naslov": "Send an inquiry",
    "uvod": "The venue receives your request by email and replies directly.",
    "ime": "Your name",
    "email": "Email",
    "telefon": "Phone",
    "tip_proslave": "Type of celebration",
    "datum": "Preferred date",
    "broj_gostiju": "Number of guests",
    "poruka": "Message",
    "posalji": "Send inquiry",
    "uspeh": "Thank you — your inquiry has been sent. The venue will contact you."
  },
  "poredjenje": {
    "naslov": "Compare venues",
    "prazno_naslov": "You haven't selected any venues yet",
    "prazno_tekst": "Tick “Compare” on a venue card to add it here.",
    "nazad_na_rezultate": "Browse venues",
    "ukloni": "Remove",
    "maks_dostignut": "You can compare up to 4 venues.",
    "red_kapacitet": "Capacity",
    "red_cena": "Price per person",
    "red_kvart": "Location",
    "red_tip": "Venue type",
    "red_ocena": "Rating",
    "red_pogodnosti": "Amenities",
    "red_hrana": "Food and drink",
    "red_muzika": "Music"
  }
}
```

- [ ] **Step 2: Napravi `locales/sr.json` sa istim ključevima**

Isti oblik, srpski tekst. Latinica, rečenična kapitalizacija.

```json
{
  "opste": {
    "po_osobi": "po osobi",
    "gostiju": "gostiju",
    "prikazi_jos": "Prikaži još",
    "bilo_koji": "Bilo koji",
    "obavezno": "Obavezno"
  },
  "zaglavlje": {
    "prostori": "Prostori",
    "kako_radi": "Kako radi",
    "poredjenje": "Poređenje",
    "poredjenje_sa_brojem": "Poređenje ({{ broj }})",
    "meni": "Meni"
  },
  "pocetna": {
    "naslov": "Nađi prostor za proslavu u Novom Sadu",
    "podnaslov": "Restorani, svečane sale, igraonice, klubovi i salaši — filtrirani po onome što ti stvarno treba.",
    "tip_proslave": "Tip proslave",
    "datum": "Datum",
    "broj_gostiju": "Broj gostiju",
    "deo_grada": "Deo grada",
    "budzet_do": "Budžet po osobi, do",
    "trazi": "Pretraži prostore",
    "kategorije_naslov": "Pretraga po povodu",
    "istaknuti_naslov": "Izdvojeni prostori",
    "istaknuti_svi": "Pogledaj sve prostore",
    "kako_radi_naslov": "Kako radi",
    "korak_1_naslov": "Reci šta ti treba",
    "korak_1_tekst": "Tip proslave, datum, broj gostiju i budžet.",
    "korak_2_naslov": "Uporedi prostore",
    "korak_2_tekst": "Filtriraj po pogodnostima, hrani, muzici i lokaciji, pa uporedi jedan pored drugog.",
    "korak_3_naslov": "Pošalji upit",
    "korak_3_tekst": "Izaberi slobodan datum i pošalji zahtev direktno prostoru."
  },
  "rezultati": {
    "naslov": "Prostori u Novom Sadu",
    "broj": "{{ broj }} prostora",
    "filteri": "Filteri",
    "primeni": "Primeni filtere",
    "ponisti_sve": "Poništi sve",
    "sortiraj": "Sortiraj po",
    "sortiraj_podrazumevano": "Preporučeno",
    "sortiraj_ocena": "Najbolje ocenjeni",
    "prazno_naslov": "Nijedan prostor ne odgovara ovim filterima",
    "prazno_tekst": "Probaj da ukloniš neki filter ili proširiš budžet.",
    "aktivni_filteri": "Aktivni filteri",
    "zauzeto_obavestenje": "Prikazano {{ prikazano }} od {{ ukupno }} — {{ zauzeto }} prostora je zauzeto {{ datum }}."
  },
  "kartica": {
    "uporedi": "Uporedi",
    "kapacitet": "{{ min }}–{{ max }} gostiju",
    "od_cene": "od {{ cena }}",
    "broj_recenzija": "{{ broj }} recenzija",
    "zauzeto": "Zauzeto na izabrani datum"
  },
  "filteri": {
    "cena_od": "Od",
    "cena_do": "Do"
  },
  "prostor": {
    "kapacitet": "Kapacitet",
    "kvart": "Lokacija",
    "min_potrosnja": "Minimalna potrošnja",
    "telefon": "Telefon",
    "o_prostoru": "O prostoru",
    "pogodnosti": "Pogodnosti",
    "hrana_pice": "Hrana i piće",
    "muzika": "Muzika",
    "gde_se_nalazi": "Gde se nalazi",
    "otvori_mapu": "Otvori u mapama",
    "paketi_naslov": "Paketi",
    "paket_min": "od {{ broj }} gostiju",
    "paket_ukljucuje": "Uključuje",
    "kalendar_naslov": "Dostupnost",
    "kalendar_uputstvo": "Izaberi slobodan datum da se forma za upit popuni sama.",
    "kalendar_slobodno": "Slobodno",
    "kalendar_zauzeto": "Zauzeto",
    "kalendar_prethodni": "Prethodni mesec",
    "kalendar_sledeci": "Sledeći mesec",
    "kalendar_napomena": "Dostupnost održava sam prostor i ovo nije sistem rezervacija u realnom vremenu.",
    "recenzije_naslov": "Recenzije",
    "recenzije_prosek": "{{ ocena }} od 5 · {{ broj }} recenzija",
    "recenzije_nema": "Još nema recenzija."
  },
  "upit": {
    "naslov": "Pošalji upit",
    "uvod": "Prostor dobija tvoj zahtev mejlom i odgovara direktno.",
    "ime": "Ime i prezime",
    "email": "Imejl",
    "telefon": "Telefon",
    "tip_proslave": "Tip proslave",
    "datum": "Željeni datum",
    "broj_gostiju": "Broj gostiju",
    "poruka": "Poruka",
    "posalji": "Pošalji upit",
    "uspeh": "Hvala — upit je poslat. Prostor će te kontaktirati."
  },
  "poredjenje": {
    "naslov": "Poređenje prostora",
    "prazno_naslov": "Još nisi izabrao nijedan prostor",
    "prazno_tekst": "Čekiraj „Uporedi“ na kartici prostora da bi se pojavio ovde.",
    "nazad_na_rezultate": "Pretraži prostore",
    "ukloni": "Ukloni",
    "maks_dostignut": "Možeš porediti najviše 4 prostora.",
    "red_kapacitet": "Kapacitet",
    "red_cena": "Cena po osobi",
    "red_kvart": "Lokacija",
    "red_tip": "Tip prostora",
    "red_ocena": "Ocena",
    "red_pogodnosti": "Pogodnosti",
    "red_hrana": "Hrana i piće",
    "red_muzika": "Muzika"
  }
}
```

Prekopiraj i postojeće grupe iz `en.default.json` (`404`, `cart`, `search`, `password`, `collections`, `blog`, `customers`, `gift_card`) prevedene na srpski — inače te stranice ostaju na engleskom.

- [ ] **Step 3: Dopuni `locales/en.default.schema.json` i napravi `locales/sr.schema.json`**

Ovi ključevi se koriste u `{% schema %}` blokovima kasnijih taskova. Dodaj u `general` i `labels` grupe:

```json
{
  "general": {
    "brend": "Brand",
    "heading": "Heading",
    "hero_pretraga": "Hero with search",
    "kategorije_proslava": "Occasion categories",
    "istaknuti_prostori": "Featured venues",
    "kako_radi": "How it works",
    "rezultati_prostora": "Venue results",
    "prostor_zaglavlje": "Venue header",
    "prostor_detalji": "Venue details",
    "prostor_paketi": "Venue packages",
    "prostor_kalendar": "Venue availability",
    "prostor_recenzije": "Venue reviews",
    "prostor_upit": "Venue inquiry form",
    "poredjenje": "Venue comparison"
  },
  "labels": {
    "muted": "Muted text",
    "surface": "Card surface",
    "border": "Borders",
    "accent": "Accent",
    "accent_contrast": "Text on accent",
    "rating": "Rating stars",
    "busy": "Booked date",
    "card_corner_radius": "Card corner radius",
    "naslov": "Heading",
    "podnaslov": "Subheading",
    "pozadinska_slika": "Background image",
    "kolekcija": "Collection",
    "broj_prostora": "Number of venues",
    "po_strani": "Venues per page",
    "prikazi_mapu": "Show map",
    "broj_meseci": "Months shown",
    "broj_recenzija": "Reviews shown initially"
  }
}
```

Isto na srpskom u `locales/sr.schema.json`.

- [ ] **Step 4: Postavi srpski kao podrazumevani jezik**

Admin → **Settings → Languages** — `Serbian` mora biti **Default**. Ako u Tasku 1 nije podešeno, uradi sad.

- [ ] **Step 5: Pokreni theme check**

Run: `shopify theme check`
Expected: `0 offenses` — proverava i da nijedan `t:` ključ ne fali u schema locale fajlovima

- [ ] **Step 6: Commit**

```bash
git add locales/
git commit -m "feat: stablo prevoda na engleskom i srpskom"
```

---

## Task 8: Header, footer i logika poređenja

Logika poređenja živi ovde jer je potrebna na svakoj stranici — na kartici, u header-u i na stranici poređenja. Header je jedina sekcija koja je globalna.

**Files:**
- Modify: `sections/header.liquid` (prepis)
- Modify: `sections/footer.liquid`

**Interfaces:**
- Produces:
  - `window.Poredjenje = { ucitaj(), sacuvaj(lista), osvezi() }`
  - DOM ugovor: `<input type="checkbox" data-poredi value="<handle>">` bilo gde na stranici se automatski povezuje
  - događaj `poredjenje:promena` sa `detail.lista` — sluša ga Task 21
  - događaj `poredjenje:ukloni` sa `detail.handle` — šalje ga Task 21
  - `localStorage` ključ `poredjenje`, niz handle-ova, najviše 4

- [ ] **Step 1: Prepiši `sections/header.liquid`**

Ikonica korpe se uklanja — u fazi 1 nema kupovine i korpa u header-u samo zbunjuje.

```liquid
<header
  class="zaglavlje full-width"
  data-poruka-maks="{{ 'poredjenje.maks_dostignut' | t }}"
>
  <div class="zaglavlje__unutra">
    <a class="zaglavlje__logo" href="{{ routes.root_url }}">{{ shop.name }}</a>

    <nav class="zaglavlje__meni" aria-label="{{ 'zaglavlje.meni' | t }}">
      {% for link in section.settings.menu.links %}
        <a
          href="{{ link.url }}"
          {% if link.active %}
            aria-current="page"
          {% endif %}
        >
          {{ link.title }}
        </a>
      {% endfor %}
    </nav>

    <a
      class="zaglavlje__poredjenje dugme dugme--tiho"
      href="{{ section.settings.poredjenje_stranica.url | default: '/pages/poredjenje' }}"
      data-poredjenje-dugme
      data-sablon="{{ 'zaglavlje.poredjenje_sa_brojem' | t: broj: 'BROJ' }}"
      hidden
    >
      {% render 'ikonica', naziv: 'poredjenje' %}
      <span data-poredjenje-tekst>{{ 'zaglavlje.poredjenje' | t }}</span>
    </a>
  </div>

  <p class="zaglavlje__poruka" role="status" data-poredjenje-poruka hidden></p>
</header>

{% stylesheet %}
  .zaglavlje {
    border-bottom: 1px solid var(--boja-ivica);
    background-color: var(--boja-povrsina);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .zaglavlje__unutra {
    display: flex;
    align-items: center;
    gap: var(--razmak-5);
    width: var(--content-width);
    margin-inline: auto;
    min-height: 4.5rem;
  }

  .zaglavlje__logo {
    font-family: var(--font-naslov);
    font-size: var(--tekst-xl);
    text-decoration: none;
    margin-inline-end: auto;
  }

  .zaglavlje__meni {
    display: flex;
    gap: var(--razmak-5);
  }

  .zaglavlje__meni a {
    text-decoration: none;
    padding-block: var(--razmak-2);
    border-bottom: 2px solid transparent;
  }

  .zaglavlje__meni a[aria-current='page'] {
    border-bottom-color: var(--boja-akcenat);
  }

  .zaglavlje__poruka {
    width: var(--content-width);
    margin-inline: auto;
    padding-block: var(--razmak-2);
    color: var(--boja-zauzeto);
    font-size: var(--tekst-sm);
  }

  @media (max-width: 46rem) {
    .zaglavlje__unutra {
      flex-wrap: wrap;
      gap: var(--razmak-3);
      padding-block: var(--razmak-3);
    }

    .zaglavlje__meni {
      order: 3;
      width: 100%;
      gap: var(--razmak-4);
      font-size: var(--tekst-sm);
    }
  }
{% endstylesheet %}

{% javascript %}
  (function () {
    const KLJUC = 'poredjenje';
    const MAKS = 4;

    function ucitaj() {
      try {
        const sirovo = JSON.parse(localStorage.getItem(KLJUC));
        return Array.isArray(sirovo) ? sirovo.slice(0, MAKS) : [];
      } catch (greska) {
        return [];
      }
    }

    function sacuvaj(lista) {
      try {
        localStorage.setItem(KLJUC, JSON.stringify(lista));
      } catch (greska) {
        /* Privatni rezim ili pun storage: poredjenje radi do refresh-a. */
      }
    }

    function poruka(tekst) {
      const element = document.querySelector('[data-poredjenje-poruka]');
      if (!element) return;
      element.textContent = tekst;
      element.hidden = false;
      window.clearTimeout(element.dataset.tajmer);
      element.dataset.tajmer = window.setTimeout(() => {
        element.hidden = true;
      }, 4000);
    }

    function osvezi() {
      const lista = ucitaj();

      const dugme = document.querySelector('[data-poredjenje-dugme]');
      if (dugme) {
        dugme.hidden = lista.length === 0;
        const tekst = dugme.querySelector('[data-poredjenje-tekst]');
        if (tekst) tekst.textContent = dugme.dataset.sablon.replace('BROJ', String(lista.length));
      }

      document.querySelectorAll('[data-poredi]').forEach((polje) => {
        polje.checked = lista.includes(polje.value);
      });

      document.dispatchEvent(new CustomEvent('poredjenje:promena', { detail: { lista } }));
    }

    document.addEventListener('change', (dogadjaj) => {
      const polje = dogadjaj.target.closest('[data-poredi]');
      if (!polje) return;

      let lista = ucitaj();

      if (polje.checked) {
        if (lista.length >= MAKS) {
          polje.checked = false;
          const zaglavlje = document.querySelector('.zaglavlje');
          poruka(zaglavlje ? zaglavlje.dataset.porukaMaks : '');
          return;
        }
        if (!lista.includes(polje.value)) lista.push(polje.value);
      } else {
        lista = lista.filter((handle) => handle !== polje.value);
      }

      sacuvaj(lista);
      osvezi();
    });

    document.addEventListener('poredjenje:ukloni', (dogadjaj) => {
      sacuvaj(ucitaj().filter((handle) => handle !== dogadjaj.detail.handle));
      osvezi();
    });

    window.Poredjenje = { ucitaj, sacuvaj, osvezi };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', osvezi);
    } else {
      osvezi();
    }
  })();
{% endjavascript %}

{% schema %}
{
  "name": "t:general.header",
  "settings": [
    { "type": "link_list", "id": "menu", "label": "t:labels.menu" },
    { "type": "page", "id": "poredjenje_stranica", "label": "t:general.poredjenje" }
  ]
}
{% endschema %}
```

**Zašto `data-sablon` sa `BROJ`:** `{% javascript %}` ne renderuje Liquid, pa se prevedeni string ne može pozvati iz JS-a. Šablon se renderuje u atribut, JS samo zameni rezervisanu reč. Tako brojač ostaje prevodiv.

- [ ] **Step 2: Doradi `sections/footer.liquid`**

Ukloni `show_payment_icons` i blok sa načinima plaćanja — nema naplate.

```liquid
<footer class="podnozje full-width">
  <div class="podnozje__unutra">
    <p class="podnozje__copyright prigusen sitno">
      &copy; {{ 'now' | date: '%Y' }} {{ shop.name | link_to: routes.root_url }}
    </p>

    <nav class="podnozje__linkovi sitno">
      {% for link in section.settings.menu.links %}
        {{ link.title | link_to: link.url }}
      {% endfor %}
    </nav>
  </div>
</footer>

{% stylesheet %}
  .podnozje {
    margin-block-start: var(--razmak-8);
    border-top: 1px solid var(--boja-ivica);
    background-color: var(--boja-povrsina);
  }

  .podnozje__unutra {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: var(--razmak-4);
    width: var(--content-width);
    margin-inline: auto;
    padding-block: var(--razmak-6);
  }

  .podnozje__linkovi {
    display: flex;
    flex-wrap: wrap;
    gap: var(--razmak-4);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.footer",
  "settings": [
    { "type": "link_list", "id": "menu", "label": "t:labels.menu" }
  ]
}
{% endschema %}
```

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

`shopify theme dev`, pa u konzoli browsera:

1. `window.Poredjenje` postoji
2. `window.Poredjenje.sacuvaj(['a','b']); window.Poredjenje.osvezi()` → dugme „Poređenje (2)" se pojavljuje u header-u
3. `window.Poredjenje.sacuvaj([]); window.Poredjenje.osvezi()` → dugme nestaje
4. Header ostaje zalepljen pri skrolu; na 375px meni prelazi u drugi red
5. Nema ikonice korpe

- [ ] **Step 5: Commit**

```bash
git add sections/header.liquid sections/footer.liquid
git commit -m "feat: header sa brojacem poredjenja i logikom nad localStorage"
```

---

## Task 9: Snippets — ikonice, zvezdice, zauzeti datumi, kartica prostora

**Files:**
- Create: `snippets/ikonica.liquid`, `snippets/zvezdice.liquid`, `snippets/zauzeti-datumi.liquid`, `snippets/kartica-prostora.liquid`

**Interfaces:**
- Produces:
  - `{% render 'ikonica', naziv: <string> %}` — `zvezda`, `zvezda-prazna`, `poredjenje`, `lokacija`, `gosti`, `kalendar`, `filter`, `kvacica`, `iks`, `strelica-levo`, `strelica-desno`
  - `{% render 'zvezdice', ocena: <number>, tekst: <string?> %}`
  - `{% render 'zauzeti-datumi', prostor: <product> %}` — CSV `YYYY-MM-DD`, ništa drugo
  - `{% render 'kartica-prostora', prostor: <product>, poredjenje: <boolean?> %}` — `<article data-prostor data-handle data-ocena data-zauzeti>` sa `[data-kartica-link]` i opcionim `[data-poredi]`

- [ ] **Step 1: Napravi `snippets/ikonica.liquid`**

```liquid
{% doc %}
  Renders an inline SVG icon.

  @param {string} naziv - One of: zvezda, zvezda-prazna, poredjenje, lokacija,
    gosti, kalendar, filter, kvacica, iks, strelica-levo, strelica-desno

  @example
  {% render 'ikonica', naziv: 'lokacija' %}
{% enddoc %}

{% case naziv %}
  {% when 'zvezda' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 5.9 6.6.95-4.8 4.65 1.15 6.5L12 17.4l-5.85 3.1 1.15-6.5L2.5 9.35l6.6-.95z"/></svg>
  {% when 'zvezda-prazna' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 2.5l2.9 5.9 6.6.95-4.8 4.65 1.15 6.5L12 17.4l-5.85 3.1 1.15-6.5L2.5 9.35l6.6-.95z"/></svg>
  {% when 'poredjenje' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 4h6v16H4zM14 4h6v16h-6z"/></svg>
  {% when 'lokacija' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 21.5s6.5-5.4 6.5-10.5a6.5 6.5 0 1 0-13 0c0 5.1 6.5 10.5 6.5 10.5z"/><circle cx="12" cy="10.5" r="2.5"/></svg>
  {% when 'gosti' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15.5 20v-1.5a4 4 0 0 0-4-4h-5a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.5"/><path d="M21.5 20v-1.5a4 4 0 0 0-3-3.87M16 3.63a4 4 0 0 1 0 7.75"/></svg>
  {% when 'kalendar' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M7 3v3M17 3v3M3.5 9.5h17"/><rect x="3.5" y="5.5" width="17" height="15" rx="1.5"/></svg>
  {% when 'filter' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
  {% when 'kvacica' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>
  {% when 'iks' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
  {% when 'strelica-levo' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>
  {% when 'strelica-desno' %}
    <svg class="ikonica" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>
{% endcase %}

{% stylesheet %}
  .ikonica {
    width: 1.15em;
    height: 1.15em;
    flex-shrink: 0;
  }
{% endstylesheet %}
```

- [ ] **Step 2: Napravi `snippets/zvezdice.liquid`**

```liquid
{% doc %}
  Renders a 1-5 star rating with an accessible label.

  @param {number} ocena - Rating value between 1 and 5
  @param {string} [tekst] - Optional visible label rendered next to the stars

  @example
  {% render 'zvezdice', ocena: 4.6, tekst: '4.6' %}
{% enddoc %}

{% liquid
  assign pune = ocena | round
%}

<span class="zvezdice" role="img" aria-label="{{ ocena }}/5">
  {% for broj in (1..5) %}
    {% if broj <= pune %}
      {% render 'ikonica', naziv: 'zvezda' %}
    {% else %}
      {% render 'ikonica', naziv: 'zvezda-prazna' %}
    {% endif %}
  {% endfor %}

  {% if tekst %}
    <span class="zvezdice__tekst">{{ tekst }}</span>
  {% endif %}
</span>

{% stylesheet %}
  .zvezdice {
    display: inline-flex;
    align-items: center;
    gap: 0.1em;
    color: var(--boja-akcenat);
  }

  .zvezdice__tekst {
    margin-inline-start: var(--razmak-2);
    color: var(--boja-tekst);
    font-size: var(--tekst-sm);
    font-weight: 600;
  }
{% endstylesheet %}
```

- [ ] **Step 3: Napravi `snippets/zauzeti-datumi.liquid`**

```liquid
{% doc %}
  Outputs a venue's booked dates as a comma-separated YYYY-MM-DD list.

  Used inside an HTML attribute, so it must print the list and nothing else.
  The `json` filter is deliberately avoided: the metafield holds date objects
  whose JSON form is not guaranteed to be YYYY-MM-DD.

  @param {object} prostor - A venue product

  @example
  <article data-zauzeti="{% render 'zauzeti-datumi', prostor: product %}"></article>
{% enddoc %}
{%- for datum in prostor.metafields.prostor.zauzeti_datumi.value -%}
  {{- datum | date: '%Y-%m-%d' -}}
  {%- unless forloop.last -%},{%- endunless -%}
{%- endfor -%}
```

- [ ] **Step 4: Napravi `snippets/kartica-prostora.liquid`**

```liquid
{% doc %}
  Renders one venue card, used by the results grid and the featured section.

  Exposes the data attributes the client-side date filter and rating sort
  rely on: `data-ocena` and `data-zauzeti`.

  @param {object} prostor - The venue product
  @param {boolean} [poredjenje] - Render the compare checkbox

  @example
  {% render 'kartica-prostora', prostor: product, poredjenje: true %}
{% enddoc %}

{% liquid
  assign polja = prostor.metafields.prostor
  assign ocena = polja.ocena.value.rating
  assign cena = prostor.price | money
%}

<article
  class="kartica"
  data-prostor
  data-handle="{{ prostor.handle }}"
  data-ocena="{{ ocena | default: 0 }}"
  data-zauzeti="{% render 'zauzeti-datumi', prostor: prostor %}"
>
  <a class="kartica__link" href="{{ prostor.url }}" data-kartica-link>
    <div class="kartica__slika">
      {% if prostor.featured_image %}
        {{
          prostor.featured_image
          | image_url: width: 800
          | image_tag:
            loading: 'lazy',
            widths: '400, 600, 800',
            sizes: '(min-width: 60rem) 24rem, 92vw',
            alt: prostor.title
        }}
      {% endif %}

      <span class="oznaka oznaka--zauzeto kartica__zauzeto" data-kartica-zauzeto hidden>
        {{ 'kartica.zauzeto' | t }}
      </span>
    </div>

    <div class="kartica__telo">
      <h3 class="kartica__naziv">{{ prostor.title }}</h3>

      <p class="kartica__meta prigusen sitno">
        {% render 'ikonica', naziv: 'lokacija' %}
        {{ polja.kvart.value }} · {{ prostor.type }}
      </p>

      <p class="kartica__meta prigusen sitno">
        {% render 'ikonica', naziv: 'gosti' %}
        {{ 'kartica.kapacitet' | t: min: polja.kapacitet_min.value, max: polja.kapacitet_max.value }}
      </p>

      {% if ocena %}
        <p class="kartica__ocena">
          {% render 'zvezdice', ocena: ocena, tekst: ocena %}
          <span class="prigusen sitno">
            {{ 'kartica.broj_recenzija' | t: broj: polja.broj_recenzija.value }}
          </span>
        </p>
      {% endif %}

      <p class="kartica__cena">
        <strong>{{ 'kartica.od_cene' | t: cena: cena }}</strong>
        <span class="prigusen sitno">{{ 'opste.po_osobi' | t }}</span>
      </p>
    </div>
  </a>

  {% if poredjenje %}
    <label class="kartica__uporedi sitno">
      <input type="checkbox" data-poredi value="{{ prostor.handle }}">
      <span>{{ 'kartica.uporedi' | t }}</span>
    </label>
  {% endif %}
</article>

{% stylesheet %}
  .kartica {
    position: relative;
    display: flex;
    flex-direction: column;
    background-color: var(--boja-povrsina);
    border: 1px solid var(--boja-ivica);
    border-radius: var(--radijus-kartica);
    overflow: hidden;
    transition: box-shadow 150ms ease, transform 150ms ease;
  }

  .kartica:hover {
    box-shadow: var(--senka-2);
    transform: translateY(-2px);
  }

  .kartica[data-prigusen] {
    opacity: 0.45;
    filter: saturate(0.4);
  }

  .kartica__link {
    display: flex;
    flex-direction: column;
    text-decoration: none;
    color: inherit;
    height: 100%;
  }

  .kartica__slika {
    position: relative;
    aspect-ratio: 4 / 3;
    background-color: var(--boja-pozadina-tamna);
  }

  .kartica__slika img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .kartica__zauzeto {
    position: absolute;
    inset-block-start: var(--razmak-3);
    inset-inline-start: var(--razmak-3);
    background-color: var(--boja-povrsina);
  }

  .kartica__telo {
    display: flex;
    flex-direction: column;
    gap: var(--razmak-2);
    padding: var(--razmak-4);
    flex-grow: 1;
  }

  .kartica__naziv {
    font-size: var(--tekst-lg);
  }

  .kartica__meta {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    margin: 0;
  }

  .kartica__ocena {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    margin: 0;
  }

  .kartica__cena {
    margin-block-start: auto;
    padding-block-start: var(--razmak-3);
    border-top: 1px solid var(--boja-ivica);
  }

  .kartica__uporedi {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    padding: var(--razmak-3) var(--razmak-4);
    border-top: 1px solid var(--boja-ivica);
    cursor: pointer;
  }
{% endstylesheet %}
```

**Zamka koja se ovde izbegava:** `{{ 'kartica.od_cene' | t: cena: prostor.price | money }}` **ne radi** — Liquid bi `money` primenio na rezultat `t`, ne na cenu. Zato se cena prvo hvata u promenljivu. Isto važi svuda gde se filtrirana vrednost prosleđuje u `t`.

- [ ] **Step 5: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 6: Smoke lista**

Snippeti se još nigde ne renderuju. Privremeno dodaj u `sections/page.liquid`, otvori bilo koju stranicu, pa vrati kako je bilo:

```liquid
{% for prostor in collections['svi-prostori'].products limit: 3 %}
  {% render 'kartica-prostora', prostor: prostor, poredjenje: true %}
{% endfor %}
```

1. Tri kartice sa fotografijom, nazivom, kvartom, kapacitetom, zvezdicama i cenom u dinarima
2. U DevTools kartica ima `data-handle`, `data-ocena` i neprazan `data-zauzeti` u obliku `2026-09-19,2026-10-15,...`
3. Čekiranje „Uporedi" pali brojač u header-u; refresh ga čuva
4. Čekiranje petog prostora ne prolazi i ispisuje poruku o limitu

- [ ] **Step 7: Commit**

```bash
git add snippets/
git commit -m "feat: snippeti za ikonice, zvezdice, zauzete datume i karticu prostora"
```

---

## Task 10: Snippets filtera

Ni jedan naziv filtera ni jedna vrednost se ne hardkoduju. Sve dolazi iz `collection.filters`, pa dodavanje filtera u Search & Discovery ne dira temu.

**Files:**
- Create: `snippets/filter-grupa.liquid`, `snippets/filter-cena.liquid`, `snippets/aktivni-filteri.liquid`

**Interfaces:**
- Consumes: `filter` objekat iz `collection.filters`; `ikonica` snippet iz Taska 9
- Produces:
  - `{% render 'filter-grupa', filter: <filter> %}` — `<details>` sa čekboksima čiji su `name`/`value` tačno `filter.p.*` parametri
  - `{% render 'filter-cena', filter: <filter> %}` — dva brojčana polja sa `filter.v.price.gte` / `lte`
  - `{% render 'aktivni-filteri', kolekcija: <collection> %}` — uklonjivi čipovi

- [ ] **Step 1: Napravi `snippets/filter-grupa.liquid`**

```liquid
{% doc %}
  Renders one list-type storefront filter as a checkbox group.

  The inputs are named after the filter's own param names, so the enclosing
  form submits real Shopify filter URLs with no JavaScript involved.

  @param {object} filter - A filter object from `collection.filters`

  @example
  {% render 'filter-grupa', filter: filter %}
{% enddoc %}

<details
  class="filter-grupa"
  {% if filter.active_values.size > 0 %}
    open
  {% endif %}
>
  <summary class="filter-grupa__naslov">
    <span>{{ filter.label }}</span>

    {% if filter.active_values.size > 0 %}
      <span class="filter-grupa__broj">{{ filter.active_values.size }}</span>
    {% endif %}
  </summary>

  <ul class="filter-grupa__lista" role="list">
    {% for vrednost in filter.values %}
      <li>
        <label class="filter-grupa__stavka">
          <input
            type="checkbox"
            name="{{ vrednost.param_name }}"
            value="{{ vrednost.value }}"
            {% if vrednost.active %}
              checked
            {% endif %}
            {% if vrednost.count == 0 %}
              {% unless vrednost.active %}
                disabled
              {% endunless %}
            {% endif %}
          >
          <span class="filter-grupa__oznaka">{{ vrednost.label }}</span>
          <span class="filter-grupa__count prigusen sitno">{{ vrednost.count }}</span>
        </label>
      </li>
    {% endfor %}
  </ul>
</details>

{% stylesheet %}
  .filter-grupa {
    border-bottom: 1px solid var(--boja-ivica);
    padding-block: var(--razmak-3);
  }

  .filter-grupa__naslov {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    font-weight: 600;
    cursor: pointer;
    list-style: none;
  }

  .filter-grupa__naslov::-webkit-details-marker {
    display: none;
  }

  .filter-grupa__naslov::after {
    content: '';
    margin-inline-start: auto;
    width: 0.5em;
    height: 0.5em;
    border-right: 2px solid currentcolor;
    border-bottom: 2px solid currentcolor;
    transform: rotate(45deg);
    transition: transform 120ms ease;
  }

  .filter-grupa[open] .filter-grupa__naslov::after {
    transform: rotate(-135deg);
  }

  .filter-grupa__broj {
    display: inline-grid;
    place-items: center;
    min-width: 1.5em;
    height: 1.5em;
    border-radius: 999px;
    background-color: var(--boja-akcenat);
    color: var(--boja-akcenat-tekst);
    font-size: var(--tekst-xs);
  }

  .filter-grupa__lista {
    list-style: none;
    margin: var(--razmak-3) 0 var(--razmak-2);
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--razmak-2);
    max-height: 17rem;
    overflow-y: auto;
  }

  .filter-grupa__stavka {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    cursor: pointer;
  }

  .filter-grupa__stavka:has(input:disabled) {
    opacity: 0.4;
    cursor: default;
  }

  .filter-grupa__oznaka {
    flex-grow: 1;
  }
{% endstylesheet %}
```

Vrednost sa nula rezultata se prikazuje prigušena i onemogućena, osim ako je aktivna — inače korisnik ne bi mogao da je odčekira.

- [ ] **Step 2: Napravi `snippets/filter-cena.liquid`**

```liquid
{% doc %}
  Renders the native price filter as two numeric inputs.

  Shopify returns price filter values in minor units. They are divided by
  100 rather than passed through `money_without_currency`, because that
  filter applies the shop's locale separators and a value like "1.800,00"
  is not accepted by a number input.

  @param {object} filter - The `price_range` filter from `collection.filters`

  @example
  {% render 'filter-cena', filter: filter %}
{% enddoc %}

{% liquid
  assign otvoren = false

  if filter.min_value.value
    assign otvoren = true
    assign od = filter.min_value.value | divided_by: 100
  endif

  if filter.max_value.value
    assign otvoren = true
    assign gornja = filter.max_value.value | divided_by: 100
  endif

  assign maksimum = filter.range_max | divided_by: 100
%}

<details
  class="filter-grupa"
  {% if otvoren %}
    open
  {% endif %}
>
  <summary class="filter-grupa__naslov">
    <span>{{ filter.label }}</span>
  </summary>

  <div class="filter-cena">
    <div class="polje-grupa">
      <label for="cena-od">{{ 'filteri.cena_od' | t }}</label>
      <input
        class="polje"
        id="cena-od"
        type="number"
        inputmode="numeric"
        name="{{ filter.min_value.param_name }}"
        value="{{ od }}"
        min="0"
        max="{{ maksimum }}"
        placeholder="0"
      >
    </div>

    <div class="polje-grupa">
      <label for="cena-do">{{ 'filteri.cena_do' | t }}</label>
      <input
        class="polje"
        id="cena-do"
        type="number"
        inputmode="numeric"
        name="{{ filter.max_value.param_name }}"
        value="{{ gornja }}"
        min="0"
        max="{{ maksimum }}"
        placeholder="{{ maksimum }}"
      >
    </div>
  </div>
</details>

{% stylesheet %}
  .filter-cena {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--razmak-3);
    margin-block: var(--razmak-3);
  }
{% endstylesheet %}
```

- [ ] **Step 3: Napravi `snippets/aktivni-filteri.liquid`**

```liquid
{% doc %}
  Renders every active filter as a chip that removes itself when clicked.

  Price is handled separately: a `price_range` filter reports its state
  through `min_value` / `max_value`, not through `active_values`.

  @param {object} kolekcija - The current collection

  @example
  {% render 'aktivni-filteri', kolekcija: collection %}
{% enddoc %}

{% liquid
  assign ima_aktivnih = false

  for filter in kolekcija.filters
    if filter.active_values.size > 0
      assign ima_aktivnih = true
    endif

    if filter.type == 'price_range'
      if filter.min_value.value
        assign ima_aktivnih = true
      endif
      if filter.max_value.value
        assign ima_aktivnih = true
      endif
    endif
  endfor
%}

{% if ima_aktivnih %}
  <div class="aktivni-filteri">
    <h2 class="vizuelno-skriveno">{{ 'rezultati.aktivni_filteri' | t }}</h2>

    {% for filter in kolekcija.filters %}
      {% for vrednost in filter.active_values %}
        <a class="cip" href="{{ vrednost.url_to_remove }}">
          <span>{{ vrednost.label }}</span>
          {% render 'ikonica', naziv: 'iks' %}
        </a>
      {% endfor %}

      {% if filter.type == 'price_range' %}
        {% if filter.min_value.value or filter.max_value.value %}
          <a class="cip" href="{{ filter.url_to_remove }}">
            <span>{{ filter.label }}</span>
            {% render 'ikonica', naziv: 'iks' %}
          </a>
        {% endif %}
      {% endif %}
    {% endfor %}

    <a class="cip cip--ponisti" href="{{ kolekcija.url }}">
      {{ 'rezultati.ponisti_sve' | t }}
    </a>
  </div>
{% endif %}

{% stylesheet %}
  .aktivni-filteri {
    display: flex;
    flex-wrap: wrap;
    gap: var(--razmak-2);
    margin-block: var(--razmak-4);
  }

  .cip {
    display: inline-flex;
    align-items: center;
    gap: var(--razmak-2);
    padding: var(--razmak-2) var(--razmak-3);
    border-radius: 999px;
    background-color: var(--boja-akcenat-tiha);
    border: 1px solid var(--boja-akcenat);
    color: var(--boja-tekst);
    font-size: var(--tekst-sm);
    text-decoration: none;
  }

  .cip .ikonica {
    width: 0.85em;
    height: 0.85em;
  }

  .cip--ponisti {
    background-color: transparent;
    border-color: var(--boja-ivica);
    color: var(--boja-prigusen);
  }
{% endstylesheet %}
```

- [ ] **Step 4: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 5: Commit**

```bash
git add snippets/filter-grupa.liquid snippets/filter-cena.liquid snippets/aktivni-filteri.liquid
git commit -m "feat: genericki snippeti za filtere iz collection.filters"
```

Vizuelna provera dolazi u sledećem tasku, kad ih sekcija rezultata prvi put renderuje.

---

## Task 11: Stranica rezultata

**Files:**
- Create: `sections/rezultati-prostora.liquid`
- Modify: `templates/collection.json` (prepis)

**Interfaces:**
- Consumes: `kartica-prostora`, `filter-grupa`, `filter-cena`, `aktivni-filteri`, `ikonica`
- Produces: DOM ugovor koji Task 12 koristi — `[data-rezultati-grid]`, `[data-filteri-forma]`, `[data-filter-datum]`, `[data-datum-poruka]` sa `data-sablon`, `[data-sort-ocena]`

- [ ] **Step 1: Napravi `sections/rezultati-prostora.liquid`**

```liquid
{% paginate collection.products by section.settings.po_strani %}
  <div class="rezultati">
    <header class="rezultati__zaglavlje">
      <h1>{{ 'rezultati.naslov' | t }}</h1>
      <p class="prigusen" data-rezultati-broj>
        {{ 'rezultati.broj' | t: broj: paginate.items }}
      </p>
    </header>

    {% render 'aktivni-filteri', kolekcija: collection %}

    <div class="rezultati__telo">
      <aside class="rezultati__filteri">
        <form
          class="rezultati__forma"
          id="filteri-forma"
          method="get"
          action="{{ collection.url }}"
          data-filteri-forma
        >
          <input type="hidden" name="datum" value="" data-filter-datum>

          <h2 class="rezultati__filteri-naslov">
            {% render 'ikonica', naziv: 'filter' %}
            {{ 'rezultati.filteri' | t }}
          </h2>

          {% for filter in collection.filters %}
            {% case filter.type %}
              {% when 'price_range' %}
                {% render 'filter-cena', filter: filter %}
              {% else %}
                {% render 'filter-grupa', filter: filter %}
            {% endcase %}
          {% endfor %}

          <div class="rezultati__akcije">
            <button type="submit" class="dugme dugme--primarno">
              {{ 'rezultati.primeni' | t }}
            </button>
            <a class="dugme dugme--tiho" href="{{ collection.url }}">
              {{ 'rezultati.ponisti_sve' | t }}
            </a>
          </div>
        </form>
      </aside>

      <div class="rezultati__glavno">
        <div class="rezultati__alatke">
          <p
            class="rezultati__poruka"
            role="status"
            data-datum-poruka
            data-sablon="{{ 'rezultati.zauzeto_obavestenje' | t: prikazano: 'PRIKAZANO', ukupno: 'UKUPNO', zauzeto: 'ZAUZETO', datum: 'DATUM' }}"
            hidden
          ></p>

          <div class="rezultati__sortiranje">
            <label class="sitno" for="sort-shopify">{{ 'rezultati.sortiraj' | t }}</label>
            <select
              class="polje"
              id="sort-shopify"
              name="sort_by"
              form="filteri-forma"
              data-sort-shopify
            >
              {% for opcija in collection.sort_options %}
                <option
                  value="{{ opcija.value }}"
                  {% if opcija.value == collection.sort_by %}
                    selected
                  {% endif %}
                >
                  {{ opcija.name }}
                </option>
              {% endfor %}
            </select>

            <button
              type="button"
              class="dugme dugme--tiho"
              data-sort-ocena
              aria-pressed="false"
            >
              {{ 'rezultati.sortiraj_ocena' | t }}
            </button>
          </div>
        </div>

        {% if paginate.items == 0 %}
          <div class="rezultati__prazno">
            <h2>{{ 'rezultati.prazno_naslov' | t }}</h2>
            <p class="prigusen">{{ 'rezultati.prazno_tekst' | t }}</p>
            <a class="dugme dugme--primarno" href="{{ collection.url }}">
              {{ 'rezultati.ponisti_sve' | t }}
            </a>
          </div>
        {% else %}
          <div class="rezultati__grid" data-rezultati-grid>
            {% for prostor in collection.products %}
              {% render 'kartica-prostora', prostor: prostor, poredjenje: true %}
            {% endfor %}
          </div>

          {% if paginate.pages > 1 %}
            <nav class="rezultati__paginacija">{{ paginate | default_pagination }}</nav>
          {% endif %}
        {% endif %}
      </div>
    </div>
  </div>
{% endpaginate %}

{% stylesheet %}
  .rezultati {
    padding-block: var(--razmak-6);
  }

  .rezultati__zaglavlje {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--razmak-4);
  }

  .rezultati__telo {
    display: grid;
    grid-template-columns: 18rem 1fr;
    gap: var(--razmak-6);
    align-items: start;
  }

  .rezultati__filteri {
    position: sticky;
    top: 6rem;
    max-height: calc(100svh - 8rem);
    overflow-y: auto;
    padding: var(--razmak-4);
    background-color: var(--boja-povrsina);
    border: 1px solid var(--boja-ivica);
    border-radius: var(--radijus-kartica);
  }

  .rezultati__filteri-naslov {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    font-family: var(--font-telo);
    font-size: var(--tekst-base);
    font-weight: 600;
    margin-block-end: var(--razmak-2);
  }

  .rezultati__akcije {
    display: flex;
    flex-direction: column;
    gap: var(--razmak-2);
    margin-block-start: var(--razmak-4);
  }

  .rezultati__akcije .dugme {
    width: 100%;
  }

  .rezultati__alatke {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--razmak-3);
    margin-block-end: var(--razmak-4);
  }

  .rezultati__poruka {
    flex-basis: 100%;
    padding: var(--razmak-3);
    border-radius: var(--radijus-polja);
    background-color: var(--boja-akcenat-tiha);
    font-size: var(--tekst-sm);
  }

  .rezultati__sortiranje {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    margin-inline-start: auto;
  }

  .rezultati__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: var(--razmak-5);
  }

  .rezultati__prazno {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--razmak-4);
    padding: var(--razmak-7) var(--razmak-5);
    background-color: var(--boja-povrsina);
    border: 1px dashed var(--boja-ivica);
    border-radius: var(--radijus-kartica);
  }

  .rezultati__paginacija {
    margin-block-start: var(--razmak-6);
    text-align: center;
  }

  @media (max-width: 60rem) {
    .rezultati__telo {
      grid-template-columns: 1fr;
    }

    .rezultati__filteri {
      position: static;
      max-height: none;
    }
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.rezultati_prostora",
  "settings": [
    {
      "type": "range",
      "id": "po_strani",
      "label": "t:labels.po_strani",
      "min": 12,
      "max": 48,
      "step": 4,
      "default": 24
    }
  ]
}
{% endschema %}
```

Na mobilnom sidebar prelazi iznad grida. Filter grupe su ionako zatvoreni `<details>` osim aktivnih, pa je to osam kompaktnih redova — bez modala i bez JS-a.

- [ ] **Step 2: Prepiši `templates/collection.json`**

```json
{
  "sections": {
    "main": {
      "type": "rezultati-prostora",
      "settings": {
        "po_strani": 24
      }
    }
  },
  "order": ["main"]
}
```

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista — ovo je najvažnija provera u planu**

`shopify theme dev`, pa `/collections/svi-prostori`:

1. Prikazuje se 20 kartica i tekst „20 prostora"
2. Sidebar ima **osam** grupa tačno ovim redom: Tip proslave, Broj gostiju, Tip prostora, Deo grada, Cena po osobi, Pogodnosti, Hrana i piće, Muzika
3. Uz svaku vrednost stoji broj rezultata; nijedna vrednost nema `0` (Task 4 to garantuje)
4. Čekiraj **Tip proslave → Svadba**, klikni Primeni → URL sadrži `filter.p.m.prostor.tipovi_proslava=Svadba`, broj se smanjuje, sidebar pamti čekirano, grupa je otvorena
5. Dodaj **Pogodnosti → Parking** → oba filtera u URL-u, rezultat je **presek** a ne unija
6. Iznad grida su dva čipa; klik na `×` na jednom vraća rezultate i menja URL
7. „Poništi sve" vraća na 20
8. Cena: unesi 1000 i 2000 → URL sadrži `filter.v.price.gte=1000&filter.v.price.lte=2000`, prikazuju se samo prostori u tom rasponu, a polja zadržavaju **1000 i 2000**, ne 100000
9. Izaberi kombinaciju bez rezultata (npr. Bazen + Konferencijska sala) → prazno stanje sa dugmetom „Poništi sve"
10. Promeni sortiranje na „Price, low to high" → prvi je najjeftiniji prostor, filteri ostaju aktivni
11. Postavi „Venues per page" na 12 u theme editoru → pojavljuje se paginacija; klik na stranu 2 **zadržava aktivne filtere** u URL-u
12. Na 375px sidebar je iznad grida, grid je jednokolonski, ništa ne prelazi horizontalno

Provera 8 je ključna: ako polja pokažu 100000 umesto 1000, `divided_by: 100` u `filter-cena.liquid` je primenjen na pogrešnu stranu.

- [ ] **Step 5: Commit**

```bash
git add sections/rezultati-prostora.liquid templates/collection.json
git commit -m "feat: stranica rezultata sa fasetnim filterima, sortiranjem i paginacijom"
```

---

## Task 12: Filter po datumu i sortiranje po oceni

Dva klijentska ponašanja koja Shopify ne može server-side. Odvojena od Taska 11 da bi se markup mogao prihvatiti nezavisno od ponašanja.

**Files:**
- Modify: `sections/rezultati-prostora.liquid` (dodaje se `{% javascript %}` blok)
- Modify: `locales/en.default.json`, `locales/sr.json` (jedan ključ)

**Interfaces:**
- Consumes: DOM ugovor iz Taska 11 i `data-zauzeti` / `data-ocena` sa kartice iz Taska 9
- Produces: `?datum=YYYY-MM-DD` prigušuje zauzete kartice i nastavlja da putuje kroz linkove kartica na profil prostora

- [ ] **Step 1: Ispravi ključ `rezultati.zauzeto_obavestenje` u oba locale fajla**

Zauzete kartice se **prigušuju**, ne uklanjaju — sve ostaju vidljive. Prvobitna formulacija „Prikazano 12 od 18" bi bila netačna kad je vidljivo svih 18.

`locales/en.default.json`:
```json
"zauzeto_obavestenje": "{{ prikazano }} of {{ ukupno }} venues are free — {{ zauzeto }} are booked on {{ datum }} and dimmed below."
```

`locales/sr.json`:
```json
"zauzeto_obavestenje": "Slobodno je {{ prikazano }} od {{ ukupno }} prostora — {{ zauzeto }} je zauzeto {{ datum }} i prigušeno je ispod."
```

- [ ] **Step 2: Dodaj `{% javascript %}` blok u `sections/rezultati-prostora.liquid`**

Ide između `{% endstylesheet %}` i `{% schema %}`.

```liquid
{% javascript %}
  (function () {
    const grid = document.querySelector('[data-rezultati-grid]');
    if (!grid) return;

    const kartice = Array.from(grid.querySelectorAll('[data-prostor]'));
    const parametri = new URLSearchParams(window.location.search);
    const datum = parametri.get('datum');

    /* Forma mora da ponese datum dalje, inace ga sledeci submit filtera pojede. */
    const skriveno = document.querySelector('[data-filter-datum]');
    if (skriveno) skriveno.value = datum || '';

    function srpskiDatum(iso) {
      const delovi = iso.split('-');
      return Number(delovi[2]) + '.' + Number(delovi[1]) + '.' + delovi[0] + '.';
    }

    function nosiDatumDalje() {
      kartice.forEach((kartica) => {
        const veza = kartica.querySelector('[data-kartica-link]');
        if (!veza) return;
        const adresa = new URL(veza.getAttribute('href'), window.location.origin);
        adresa.searchParams.set('datum', datum);
        veza.setAttribute('href', adresa.pathname + adresa.search);
      });
    }

    function prigusiZauzete() {
      let zauzeto = 0;

      kartice.forEach((kartica) => {
        const lista = (kartica.dataset.zauzeti || '').split(',').filter(Boolean);
        const jesteZauzet = lista.indexOf(datum) !== -1;

        kartica.toggleAttribute('data-prigusen', jesteZauzet);
        const oznaka = kartica.querySelector('[data-kartica-zauzeto]');
        if (oznaka) oznaka.hidden = !jesteZauzet;
        if (jesteZauzet) zauzeto += 1;
      });

      const poruka = document.querySelector('[data-datum-poruka]');
      if (!poruka) return;

      poruka.textContent = poruka.dataset.sablon
        .replace('PRIKAZANO', String(kartice.length - zauzeto))
        .replace('UKUPNO', String(kartice.length))
        .replace('ZAUZETO', String(zauzeto))
        .replace('DATUM', srpskiDatum(datum));
      poruka.hidden = false;
    }

    if (datum) {
      nosiDatumDalje();
      prigusiZauzete();
    }

    /* Shopify ne nudi sortiranje po oceni. Ovo preredja samo tekucu stranu
       rezultata i to se izricito navodi u dokumentaciji projekta. */
    const dugme = document.querySelector('[data-sort-ocena]');
    if (dugme) {
      const izvorniPoredak = kartice.slice();

      dugme.addEventListener('click', () => {
        const bilo = dugme.getAttribute('aria-pressed') === 'true';
        dugme.setAttribute('aria-pressed', String(!bilo));

        const poredak = bilo
          ? izvorniPoredak
          : kartice.slice().sort((a, b) => Number(b.dataset.ocena) - Number(a.dataset.ocena));

        poredak.forEach((kartica) => grid.appendChild(kartica));
      });
    }
  })();
{% endjavascript %}
```

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

1. `/collections/svi-prostori?datum=2026-10-15` → bar 6 kartica prigušeno, svaka sa oznakom „Zauzeto na izabrani datum"
2. Poruka iznad grida glasi „Slobodno je 14 od 20 prostora — 6 je zauzeto 15.10.2026." i brojevi se slažu sa prigušenima
3. Klik na prigušenu karticu vodi na URL koji **sadrži** `?datum=2026-10-15`
4. Klik na neprigušenu karticu — isto
5. Bez `?datum=` nema poruke i nijedna kartica nije prigušena
6. Sa `?datum=` čekiraj filter i klikni Primeni → datum **ostaje** u URL-u posle submita
7. Klik na „Najbolje ocenjeni" → prva kartica ima najviši `data-ocena`; drugi klik vraća izvorni redosled
8. `?datum=2030-01-01` (nijedan prostor nije zauzet) → poruka kaže „Slobodno je 20 od 20 — 0 je zauzeto"

Provera 6 je ključna: ako datum nestane posle submita, skriveno polje nije popunjeno pre nego što je forma poslata.

- [ ] **Step 5: Commit**

```bash
git add sections/rezultati-prostora.liquid locales/
git commit -m "feat: klijentski filter po datumu i sortiranje po oceni

Oba rade nad tekucom stranom rezultata. Datum putuje kroz skriveno
polje forme i kroz linkove kartica, jer Liquid ne cita query string."
```

---

## Task 13: Profil prostora — zaglavlje

**Files:**
- Create: `sections/prostor-zaglavlje.liquid`
- Modify: `templates/product.json` (prepis)

**Interfaces:**
- Produces: `#upit` je sidro ka formi (Task 18); `[data-prostor-datum]` nosi `?datum=` iz URL-a ka kalendaru i formi

- [ ] **Step 1: Napravi `sections/prostor-zaglavlje.liquid`**

```liquid
{% liquid
  assign polja = product.metafields.prostor
  assign ocena = polja.ocena.value.rating
  assign cena = product.price | money
%}

<div class="prostor-zaglavlje" data-prostor-datum>
  <nav class="prostor-zaglavlje__putanja sitno prigusen">
    <a href="{{ collections['svi-prostori'].url }}">{{ 'zaglavlje.prostori' | t }}</a>
    <span aria-hidden="true">/</span>
    <span>{{ product.title }}</span>
  </nav>

  <div class="prostor-zaglavlje__telo">
    <div class="galerija">
      {% for slika in product.images limit: 3 %}
        {%- liquid
          # forloop.first je boolean; `| default: 'lazy'` bi vratio true,
          # sto nije validna vrednost za loading atribut.
          assign ucitavanje = 'lazy'
          if forloop.first
            assign ucitavanje = 'eager'
          endif
        -%}
        <div class="galerija__stavka">
          {{
            slika
            | image_url: width: 1400
            | image_tag:
              loading: ucitavanje,
              widths: '600, 900, 1400',
              sizes: '(min-width: 60rem) 40rem, 100vw',
              alt: product.title
          }}
        </div>
      {% endfor %}
    </div>

    <div class="prostor-zaglavlje__info">
      <h1>{{ product.title }}</h1>

      <p class="prostor-zaglavlje__meta prigusen">
        {% render 'ikonica', naziv: 'lokacija' %}
        {{ polja.kvart.value }} · {{ product.type }}
      </p>

      {% if ocena %}
        <p class="prostor-zaglavlje__ocena">
          {% render 'zvezdice', ocena: ocena, tekst: ocena %}
          <a class="sitno prigusen" href="#recenzije">
            {{ 'kartica.broj_recenzija' | t: broj: polja.broj_recenzija.value }}
          </a>
        </p>
      {% endif %}

      <dl class="cinjenice">
        <div>
          <dt>{{ 'prostor.kapacitet' | t }}</dt>
          <dd>{{ 'kartica.kapacitet' | t: min: polja.kapacitet_min.value, max: polja.kapacitet_max.value }}</dd>
        </div>
        <div>
          <dt>{{ 'kartica.od_cene' | t: cena: cena }}</dt>
          <dd>{{ 'opste.po_osobi' | t }}</dd>
        </div>
        {% if polja.min_potrosnja.value %}
          <div>
            <dt>{{ 'prostor.min_potrosnja' | t }}</dt>
            <dd>{{ polja.min_potrosnja.value }}</dd>
          </div>
        {% endif %}
        {% if polja.kontakt_telefon.value %}
          <div>
            <dt>{{ 'prostor.telefon' | t }}</dt>
            <dd><a href="tel:{{ polja.kontakt_telefon.value | remove: ' ' }}">{{ polja.kontakt_telefon.value }}</a></dd>
          </div>
        {% endif %}
      </dl>

      <a class="dugme dugme--primarno prostor-zaglavlje__cta" href="#upit">
        {{ 'upit.naslov' | t }}
      </a>
    </div>
  </div>
</div>

{% stylesheet %}
  .prostor-zaglavlje {
    padding-block: var(--razmak-5) var(--razmak-6);
  }

  .prostor-zaglavlje__putanja {
    display: flex;
    gap: var(--razmak-2);
    margin-block-end: var(--razmak-4);
  }

  .prostor-zaglavlje__telo {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: var(--razmak-6);
    align-items: start;
  }

  .galerija {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-auto-rows: 1fr;
    gap: var(--razmak-2);
    border-radius: var(--radijus-kartica);
    overflow: hidden;
  }

  .galerija__stavka:first-child {
    grid-row: span 2;
  }

  .galerija__stavka img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    aspect-ratio: 4 / 3;
  }

  .prostor-zaglavlje__info {
    display: flex;
    flex-direction: column;
    gap: var(--razmak-3);
    position: sticky;
    top: 6rem;
  }

  .prostor-zaglavlje__meta,
  .prostor-zaglavlje__ocena {
    display: flex;
    align-items: center;
    gap: var(--razmak-2);
    margin: 0;
  }

  .cinjenice {
    display: grid;
    gap: var(--razmak-3);
    margin: var(--razmak-3) 0 0;
    padding-block-start: var(--razmak-4);
    border-top: 1px solid var(--boja-ivica);
  }

  .cinjenice > div {
    display: flex;
    justify-content: space-between;
    gap: var(--razmak-4);
  }

  .cinjenice dt {
    color: var(--boja-prigusen);
  }

  .cinjenice dd {
    margin: 0;
    font-weight: 600;
    text-align: right;
  }

  .prostor-zaglavlje__cta {
    margin-block-start: var(--razmak-3);
  }

  @media (max-width: 60rem) {
    .prostor-zaglavlje__telo {
      grid-template-columns: 1fr;
    }

    .prostor-zaglavlje__info {
      position: static;
    }

    .galerija {
      grid-template-columns: 1fr;
    }

    .galerija__stavka:first-child {
      grid-row: auto;
    }

    .galerija__stavka:not(:first-child) {
      display: none;
    }
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.prostor_zaglavlje",
  "settings": [],
  "disabled_on": { "groups": ["header", "footer"] }
}
{% endschema %}
```

- [ ] **Step 2: Prepiši `templates/product.json`**

Sekcije se dodaju u ovaj fajl kroz taskove 14–18.

```json
{
  "sections": {
    "zaglavlje": { "type": "prostor-zaglavlje", "settings": {} }
  },
  "order": ["zaglavlje"]
}
```

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

Otvori `/products/restoran-dunavska-terasa`:

1. Tri fotografije — velika levo, dve manje desno
2. Naziv, kvart „Stari grad", tip „Restoran"
3. Zvezdice sa prosekom i link „4 recenzija"
4. Činjenice: kapacitet `40–120 gostiju`, cena `2.200 RSD`, minimalna potrošnja i telefon
5. **Minimalna potrošnja se ispisuje kao formatirana cena** (npr. `60.000 RSD`). Ako se pojavi sirov broj ili `{}`, zameni `{{ polja.min_potrosnja.value }}` sa `{{ polja.min_potrosnja.value.amount | money }}` i ponovo proveri
6. Dugme „Pošalji upit" postoji (sidro još ne vodi nigde — forma dolazi u Tasku 18)
7. Na 375px galerija prikazuje samo prvu fotografiju, info je ispod nje

- [ ] **Step 5: Commit**

```bash
git add sections/prostor-zaglavlje.liquid templates/product.json
git commit -m "feat: zaglavlje profila prostora sa galerijom i kljucnim podacima"
```

---

## Task 14: Profil prostora — detalji i mapa

**Files:**
- Create: `sections/prostor-detalji.liquid`
- Modify: `templates/product.json`

**Interfaces:**
- Consumes: `ikonica` snippet
- Produces: ništa što kasniji taskovi koriste

- [ ] **Step 1: Napravi `sections/prostor-detalji.liquid`**

Mapa je OpenStreetMap `embed.html`, koji ne traži API ključ. Okvir mape se računa iz `lat`/`lng`.

```liquid
{% liquid
  assign polja = product.metafields.prostor
  assign lat = polja.lat.value
  assign lng = polja.lng.value
  assign zapad = lng | minus: 0.006
  assign istok = lng | plus: 0.006
  assign jug = lat | minus: 0.003
  assign sever = lat | plus: 0.003
%}

<div class="detalji">
  <section class="detalji__opis">
    <h2>{{ 'prostor.o_prostoru' | t }}</h2>
    {{ product.description }}
  </section>

  <div class="detalji__grupe">
    {% if polja.sadrzaji.value.size > 0 %}
      <section>
        <h3>{{ 'prostor.pogodnosti' | t }}</h3>
        <ul class="lista-oznaka" role="list">
          {% for stavka in polja.sadrzaji.value %}
            <li class="oznaka">{% render 'ikonica', naziv: 'kvacica' %} {{ stavka }}</li>
          {% endfor %}
        </ul>
      </section>
    {% endif %}

    {% if polja.hrana_pice.value.size > 0 %}
      <section>
        <h3>{{ 'prostor.hrana_pice' | t }}</h3>
        <ul class="lista-oznaka" role="list">
          {% for stavka in polja.hrana_pice.value %}
            <li class="oznaka">{% render 'ikonica', naziv: 'kvacica' %} {{ stavka }}</li>
          {% endfor %}
        </ul>
      </section>
    {% endif %}

    {% if polja.muzika.value.size > 0 %}
      <section>
        <h3>{{ 'prostor.muzika' | t }}</h3>
        <ul class="lista-oznaka" role="list">
          {% for stavka in polja.muzika.value %}
            <li class="oznaka">{% render 'ikonica', naziv: 'kvacica' %} {{ stavka }}</li>
          {% endfor %}
        </ul>
      </section>
    {% endif %}
  </div>

  {% if section.settings.prikazi_mapu %}
    {% if lat %}
      <section class="detalji__mapa">
        <h3>{{ 'prostor.gde_se_nalazi' | t }}</h3>
        <p class="prigusen">{{ polja.adresa.value }}, {{ polja.kvart.value }}</p>

        <iframe
          class="mapa"
          title="{{ 'prostor.gde_se_nalazi' | t }} — {{ product.title | escape }}"
          loading="lazy"
          src="https://www.openstreetmap.org/export/embed.html?bbox={{ zapad }}%2C{{ jug }}%2C{{ istok }}%2C{{ sever }}&amp;layer=mapnik&amp;marker={{ lat }}%2C{{ lng }}"
        ></iframe>

        <a
          class="sitno"
          href="https://www.openstreetmap.org/?mlat={{ lat }}&amp;mlon={{ lng }}#map=17/{{ lat }}/{{ lng }}"
          target="_blank"
          rel="noopener"
        >
          {{ 'prostor.otvori_mapu' | t }}
        </a>
      </section>
    {% endif %}
  {% endif %}
</div>

{% stylesheet %}
  .detalji {
    display: flex;
    flex-direction: column;
    gap: var(--razmak-6);
    padding-block: var(--razmak-6);
    border-top: 1px solid var(--boja-ivica);
  }

  .detalji__opis {
    max-width: 46rem;
  }

  .detalji__opis h2 {
    margin-block-end: var(--razmak-3);
  }

  .detalji__opis p + p {
    margin-block-start: var(--razmak-3);
  }

  .detalji__grupe {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--razmak-5);
  }

  .detalji__grupe h3 {
    font-size: var(--tekst-lg);
    margin-block-end: var(--razmak-3);
  }

  .lista-oznaka {
    display: flex;
    flex-wrap: wrap;
    gap: var(--razmak-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mapa {
    width: 100%;
    height: 22rem;
    margin-block: var(--razmak-3);
    border: 1px solid var(--boja-ivica);
    border-radius: var(--radijus-kartica);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.prostor_detalji",
  "settings": [
    { "type": "checkbox", "id": "prikazi_mapu", "label": "t:labels.prikazi_mapu", "default": true }
  ],
  "disabled_on": { "groups": ["header", "footer"] }
}
{% endschema %}
```

- [ ] **Step 2: Dodaj sekciju u `templates/product.json`**

```json
{
  "sections": {
    "zaglavlje": { "type": "prostor-zaglavlje", "settings": {} },
    "detalji": { "type": "prostor-detalji", "settings": { "prikazi_mapu": true } }
  },
  "order": ["zaglavlje", "detalji"]
}
```

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

1. Opis se prikazuje kao dva pasusa, ne kao jedan blok sa vidljivim `<p>` tagovima
2. Tri grupe oznaka: Pogodnosti, Hrana i piće, Muzika — sadržaj se poklapa sa metafieldovima u adminu
3. Mapa se učitava i marker stoji na Novom Sadu, ne na nuli koordinata usred okeana
4. „Otvori u mapama" otvara OSM na istoj lokaciji u novom tabu
5. Isključi „Show map" u theme editoru → sekcija mape nestaje
6. Na 375px grupe se slažu jedna ispod druge, mapa ne prelazi širinu

Provera 3 hvata najčešću grešku: ako je marker u okeanu, `lat`/`lng` su zamenjeni mestima ili nisu usejani.

- [ ] **Step 5: Commit**

```bash
git add sections/prostor-detalji.liquid templates/product.json
git commit -m "feat: detalji prostora sa pogodnostima i OSM mapom bez API kljuca"
```

---

## Task 15: Profil prostora — paketi

**Files:**
- Create: `sections/prostor-paketi.liquid`
- Modify: `templates/product.json`

**Interfaces:**
- Consumes: `product.metafields.prostor.paketi.value` — lista `paket` metaobjekata

- [ ] **Step 1: Napravi `sections/prostor-paketi.liquid`**

```liquid
{% liquid
  assign paketi = product.metafields.prostor.paketi.value
%}

{% if paketi.size > 0 %}
  <section class="paketi">
    <h2>{{ 'prostor.paketi_naslov' | t }}</h2>

    <div class="paketi__grid">
      {% for paket in paketi %}
        <article class="paket">
          <h3 class="paket__naziv">{{ paket.naziv.value }}</h3>

          <p class="paket__cena">
            <strong>{{ paket.cena_po_osobi.value }}</strong>
            <span class="prigusen sitno">{{ 'opste.po_osobi' | t }}</span>
          </p>

          <p class="prigusen sitno">
            {{ 'prostor.paket_min' | t: broj: paket.min_gostiju.value }}
          </p>

          {% if paket.opis.value != blank %}
            <p class="paket__opis">{{ paket.opis.value }}</p>
          {% endif %}

          <h4 class="paket__podnaslov sitno">{{ 'prostor.paket_ukljucuje' | t }}</h4>
          <ul class="paket__lista" role="list">
            {% for stavka in paket.ukljucuje.value %}
              <li>{% render 'ikonica', naziv: 'kvacica' %} {{ stavka }}</li>
            {% endfor %}
          </ul>

          <a class="dugme dugme--tiho paket__cta" href="#upit">{{ 'upit.naslov' | t }}</a>
        </article>
      {% endfor %}
    </div>
  </section>
{% endif %}

{% stylesheet %}
  .paketi {
    padding-block: var(--razmak-6);
    border-top: 1px solid var(--boja-ivica);
  }

  .paketi h2 {
    margin-block-end: var(--razmak-5);
  }

  .paketi__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
    gap: var(--razmak-4);
  }

  .paket {
    display: flex;
    flex-direction: column;
    gap: var(--razmak-2);
    padding: var(--razmak-5);
    background-color: var(--boja-povrsina);
    border: 1px solid var(--boja-ivica);
    border-radius: var(--radijus-kartica);
  }

  .paket__naziv {
    font-size: var(--tekst-lg);
  }

  .paket__cena {
    font-size: var(--tekst-xl);
    margin: 0;
  }

  .paket__opis {
    color: var(--boja-prigusen);
  }

  .paket__podnaslov {
    margin-block-start: var(--razmak-2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--boja-prigusen);
  }

  .paket__lista {
    display: flex;
    flex-direction: column;
    gap: var(--razmak-2);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .paket__lista li {
    display: flex;
    align-items: flex-start;
    gap: var(--razmak-2);
  }

  .paket__lista .ikonica {
    color: var(--boja-akcenat);
    margin-block-start: 0.2em;
  }

  .paket__cta {
    margin-block-start: auto;
    padding-block-start: var(--razmak-4);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.prostor_paketi",
  "settings": [],
  "disabled_on": { "groups": ["header", "footer"] }
}
{% endschema %}
```

- [ ] **Step 2: Dodaj u `templates/product.json`**

```json
{
  "sections": {
    "zaglavlje": { "type": "prostor-zaglavlje", "settings": {} },
    "detalji": { "type": "prostor-detalji", "settings": { "prikazi_mapu": true } },
    "paketi": { "type": "prostor-paketi", "settings": {} }
  },
  "order": ["zaglavlje", "detalji", "paketi"]
}
```

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

1. Tri kartice paketa za `restoran-dunavska-terasa`: Standard, Svečani, Poslovni ručak
2. **Cena paketa je formatirana** (`2.200 RSD`). Ako se pojavi sirov broj ili prazno, zameni `{{ paket.cena_po_osobi.value }}` sa `{{ paket.cena_po_osobi.value.amount | money }}` — u oba slučaja to je ista izmena kao u Tasku 13, korak 5
3. Najjeftiniji paket ima istu cenu kao ona u zaglavlju prostora — to garantuje test iz Taska 4
4. Lista „Uključuje" ima zelenu kvačicu pored svake stavke
5. Prostor bez paketa ne prikazuje praznu sekciju — proveri privremenim brisanjem `paketi` metafielda na jednom proizvodu, pa vrati kroz `npm run seed`

- [ ] **Step 5: Commit**

```bash
git add sections/prostor-paketi.liquid templates/product.json
git commit -m "feat: paketi prostora iz metaobjekata"
```

---

## Task 16: Profil prostora — kalendar dostupnosti

Nazivi meseci i dana ne idu kroz locale fajlove nego kroz `Intl.DateTimeFormat` sa jezikom iz `<html lang>`. Browser ih već zna, a `theme.liquid` postavlja `lang` iz `request.locale.iso_code`.

**Files:**
- Create: `sections/prostor-kalendar.liquid`
- Modify: `templates/product.json`

**Interfaces:**
- Consumes: `zauzeti-datumi` snippet; polje `[data-upit-datum]` iz Taska 18 ako postoji
- Produces: klik na slobodan dan upisuje `YYYY-MM-DD` u `[data-upit-datum]`, šalje `change` događaj i skroluje do `#upit`

- [ ] **Step 1: Napravi `sections/prostor-kalendar.liquid`**

```liquid
<section class="kalendar-sekcija" id="kalendar">
  <h2>{{ 'prostor.kalendar_naslov' | t }}</h2>
  <p class="prigusen">{{ 'prostor.kalendar_uputstvo' | t }}</p>

  <div
    class="kalendar"
    data-kalendar
    data-zauzeti="{% render 'zauzeti-datumi', prostor: product %}"
    data-meseci="{{ section.settings.broj_meseci }}"
    data-prethodni="{{ 'prostor.kalendar_prethodni' | t | escape }}"
    data-sledeci="{{ 'prostor.kalendar_sledeci' | t | escape }}"
  ></div>

  <p class="kalendar__legenda">
    <span class="oznaka oznaka--slobodno">{{ 'prostor.kalendar_slobodno' | t }}</span>
    <span class="oznaka oznaka--zauzeto">{{ 'prostor.kalendar_zauzeto' | t }}</span>
  </p>

  <p class="prigusen sitno">{{ 'prostor.kalendar_napomena' | t }}</p>
</section>

{% stylesheet %}
  .kalendar-sekcija {
    padding-block: var(--razmak-6);
    border-top: 1px solid var(--boja-ivica);
  }

  .kalendar-sekcija h2 {
    margin-block-end: var(--razmak-2);
  }

  .kalendar {
    margin-block: var(--razmak-5);
  }

  .kalendar__navigacija {
    display: flex;
    gap: var(--razmak-2);
    margin-block-end: var(--razmak-4);
  }

  .kalendar__meseci {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
    gap: var(--razmak-6);
  }

  .kalendar__naslov {
    font-size: var(--tekst-lg);
    margin-block-end: var(--razmak-3);
    text-transform: capitalize;
  }

  .kalendar__mreza {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--razmak-1);
  }

  .kalendar__dan-zaglavlje {
    text-align: center;
    font-size: var(--tekst-xs);
    color: var(--boja-prigusen);
    text-decoration: none;
    padding-block: var(--razmak-1);
  }

  .kalendar__dan {
    display: grid;
    place-items: center;
    aspect-ratio: 1;
    border: 1px solid transparent;
    border-radius: var(--radijus-polja);
    background: none;
    font: inherit;
    font-size: var(--tekst-sm);
    color: inherit;
  }

  .kalendar__dan--slobodan {
    background-color: color-mix(in oklab, var(--boja-akcenat) 12%, white);
    color: var(--boja-akcenat);
    cursor: pointer;
  }

  .kalendar__dan--slobodan:hover {
    border-color: var(--boja-akcenat);
  }

  .kalendar__dan--slobodan[aria-pressed='true'] {
    background-color: var(--boja-akcenat);
    color: var(--boja-akcenat-tekst);
  }

  .kalendar__dan--zauzet {
    background-color: color-mix(in oklab, var(--boja-zauzeto) 12%, white);
    color: var(--boja-zauzeto);
    text-decoration: line-through;
  }

  .kalendar__dan--proslost {
    color: var(--boja-ivica);
  }

  .kalendar__legenda {
    display: flex;
    gap: var(--razmak-3);
    margin-block-end: var(--razmak-3);
  }
{% endstylesheet %}

{% javascript %}
  (function () {
    function pokreni() {
      const koren = document.querySelector('[data-kalendar]');
      if (!koren) return;

      const zauzeti = new Set((koren.dataset.zauzeti || '').split(',').filter(Boolean));
      const brojMeseci = Number(koren.dataset.meseci) || 2;

      /* Browser vec zna nazive meseci i dana za jezik teme. */
      const jezik = document.documentElement.lang || 'sr';
      const formatMeseca = new Intl.DateTimeFormat(jezik, { month: 'long', year: 'numeric' });
      const formatDana = new Intl.DateTimeFormat(jezik, { weekday: 'short' });

      const danas = new Date();
      danas.setHours(0, 0, 0, 0);
      const granica = new Date(danas.getFullYear(), danas.getMonth(), 1);
      let prvi = new Date(granica);

      function iso(datum) {
        const mesec = String(datum.getMonth() + 1).padStart(2, '0');
        const dan = String(datum.getDate()).padStart(2, '0');
        return datum.getFullYear() + '-' + mesec + '-' + dan;
      }

      function poljeDatuma() {
        return document.querySelector('[data-upit-datum]');
      }

      function imenaDana() {
        /* 2024-01-01 je bio ponedeljak. Nedelja pocinje ponedeljkom. */
        const imena = [];
        for (let i = 0; i < 7; i += 1) {
          imena.push(formatDana.format(new Date(2024, 0, 1 + i)));
        }
        return imena;
      }

      function nacrtajMesec(prviDan) {
        const godina = prviDan.getFullYear();
        const mesec = prviDan.getMonth();
        const brojDana = new Date(godina, mesec + 1, 0).getDate();
        const pomak = (prviDan.getDay() + 6) % 7;

        let html = '<div class="kalendar__mesec">';
        html += '<h3 class="kalendar__naslov">' + formatMeseca.format(prviDan) + '</h3>';
        html += '<div class="kalendar__mreza">';

        imenaDana().forEach((ime) => {
          html += '<abbr class="kalendar__dan-zaglavlje">' + ime + '</abbr>';
        });

        for (let i = 0; i < pomak; i += 1) {
          html += '<span></span>';
        }

        for (let dan = 1; dan <= brojDana; dan += 1) {
          const datum = new Date(godina, mesec, dan);
          const kljuc = iso(datum);

          if (datum < danas) {
            html += '<span class="kalendar__dan kalendar__dan--proslost">' + dan + '</span>';
          } else if (zauzeti.has(kljuc)) {
            html += '<span class="kalendar__dan kalendar__dan--zauzet" aria-disabled="true">' + dan + '</span>';
          } else {
            html += '<button type="button" class="kalendar__dan kalendar__dan--slobodan" aria-pressed="false" data-datum="' + kljuc + '">' + dan + '</button>';
          }
        }

        return html + '</div></div>';
      }

      function obelezi() {
        const polje = poljeDatuma();
        const izabran = polje ? polje.value : '';
        koren.querySelectorAll('[data-datum]').forEach((dugme) => {
          dugme.setAttribute('aria-pressed', String(dugme.dataset.datum === izabran));
        });
      }

      function nacrtaj() {
        /* Sve sto se ovde ubacuje dolazi iz nasih locale fajlova, Intl-a i
           metafielda sa datumima - nijedan korisnicki unos. */
        let html = '<div class="kalendar__navigacija">';
        html += '<button type="button" class="dugme dugme--tiho" data-nazad aria-label="' + koren.dataset.prethodni + '">&#8592;</button>';
        html += '<button type="button" class="dugme dugme--tiho" data-napred aria-label="' + koren.dataset.sledeci + '">&#8594;</button>';
        html += '</div><div class="kalendar__meseci">';

        for (let i = 0; i < brojMeseci; i += 1) {
          html += nacrtajMesec(new Date(prvi.getFullYear(), prvi.getMonth() + i, 1));
        }

        koren.innerHTML = html + '</div>';
        obelezi();
      }

      koren.addEventListener('click', (dogadjaj) => {
        if (dogadjaj.target.closest('[data-nazad]')) {
          const kandidat = new Date(prvi.getFullYear(), prvi.getMonth() - 1, 1);
          if (kandidat >= granica) {
            prvi = kandidat;
            nacrtaj();
          }
          return;
        }

        if (dogadjaj.target.closest('[data-napred]')) {
          prvi = new Date(prvi.getFullYear(), prvi.getMonth() + 1, 1);
          nacrtaj();
          return;
        }

        const dan = dogadjaj.target.closest('[data-datum]');
        if (!dan) return;

        const polje = poljeDatuma();
        if (polje) {
          polje.value = dan.dataset.datum;
          polje.dispatchEvent(new Event('change', { bubbles: true }));
          const forma = document.getElementById('upit');
          if (forma) forma.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        obelezi();
      });

      /* Redosled izvrsavanja sekcija ne sme da utice na obelezavanje. */
      document.addEventListener('change', (dogadjaj) => {
        if (dogadjaj.target.matches('[data-upit-datum]')) obelezi();
      });

      /* Datum iz URL-a otvara kalendar na tom mesecu. */
      const izUrla = new URLSearchParams(window.location.search).get('datum');
      if (izUrla) {
        const delovi = izUrla.split('-');
        const ciljni = new Date(Number(delovi[0]), Number(delovi[1]) - 1, 1);
        if (ciljni >= granica) prvi = ciljni;
      }

      nacrtaj();
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', pokreni);
    } else {
      pokreni();
    }
  })();
{% endjavascript %}

{% schema %}
{
  "name": "t:general.prostor_kalendar",
  "settings": [
    {
      "type": "range",
      "id": "broj_meseci",
      "label": "t:labels.broj_meseci",
      "min": 1,
      "max": 4,
      "step": 1,
      "default": 2
    }
  ],
  "disabled_on": { "groups": ["header", "footer"] }
}
{% endschema %}
```

- [ ] **Step 2: Dodaj u `templates/product.json`** — posle `paketi`, `"kalendar": { "type": "prostor-kalendar", "settings": { "broj_meseci": 2 } }`, i u `order`.

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

1. Prikazuju se dva meseca, počev od tekućeg
2. Nazivi meseci i dana su **na srpskom** (`septembar 2026`, `pon uto sre...`) — dolaze iz `Intl`, ne iz locale fajlova
3. Nedelja počinje **ponedeljkom**; 1. septembar 2026. je utorak i stoji u drugoj koloni
4. Prošli dani su sivi i nisu dugmad
5. Zauzeti dani su precrtani i crveni; poklapaju se sa `zauzeti_datumi` u adminu
6. Strelica nazad ne ide pre tekućeg meseca
7. Strelica napred ide unapred bez ograničenja
8. Otvori `/products/restoran-dunavska-terasa?datum=2026-11-15` → kalendar počinje od novembra
9. Klik na slobodan dan boji ga u akcenat (provera pune funkcije dolazi u Tasku 18, kad postoji polje)
10. Na 375px meseci se slažu jedan ispod drugog, dani su kvadratni i klikabilni prstom

Provera 3 hvata najgadniju grešku u kalendarima: `getDay()` vraća 0 za nedelju, pa bez `(dan + 6) % 7` ceo mesec sklizne za jedan dan.

- [ ] **Step 5: Commit**

```bash
git add sections/prostor-kalendar.liquid templates/product.json
git commit -m "feat: kalendar dostupnosti sa Intl nazivima meseci i dana"
```

---

## Task 17: Profil prostora — recenzije

**Files:**
- Create: `sections/prostor-recenzije.liquid`
- Modify: `templates/product.json`

**Interfaces:**
- Consumes: `product.metafields.prostor.recenzije.value`, `zvezdice` snippet
- Produces: sidro `#recenzije` na koje pokazuje zaglavlje iz Taska 13

- [ ] **Step 1: Napravi `sections/prostor-recenzije.liquid`**

```liquid
{% liquid
  assign polja = product.metafields.prostor
  assign recenzije = polja.recenzije.value
  assign ocena = polja.ocena.value.rating
  assign vidljivo = section.settings.broj_recenzija
%}

<section class="recenzije" id="recenzije">
  <h2>{{ 'prostor.recenzije_naslov' | t }}</h2>

  {% if recenzije.size == 0 %}
    <p class="prigusen">{{ 'prostor.recenzije_nema' | t }}</p>
  {% else %}
    <p class="recenzije__prosek">
      {% render 'zvezdice', ocena: ocena %}
      <span>{{ 'prostor.recenzije_prosek' | t: ocena: ocena, broj: recenzije.size }}</span>
    </p>

    <ul class="recenzije__lista" role="list">
      {% for recenzija in recenzije %}
        <li
          class="recenzija"
          {% if forloop.index > vidljivo %}
            data-skrivena
            hidden
          {% endif %}
        >
          <div class="recenzija__vrh">
            {% render 'zvezdice', ocena: recenzija.ocena.value %}
            <strong>{{ recenzija.autor.value }}</strong>

            {% if recenzija.tip_proslave.value != blank %}
              <span class="oznaka">{{ recenzija.tip_proslave.value }}</span>
            {% endif %}

            <time class="prigusen sitno" datetime="{{ recenzija.datum.value | date: '%Y-%m-%d' }}">
              {{ recenzija.datum.value | date: '%d.%m.%Y.' }}
            </time>
          </div>

          <p>{{ recenzija.tekst.value }}</p>
        </li>
      {% endfor %}
    </ul>

    {% if recenzije.size > vidljivo %}
      <button type="button" class="dugme dugme--tiho" data-prikazi-jos>
        {{ 'opste.prikazi_jos' | t }}
      </button>
    {% endif %}
  {% endif %}
</section>

{% stylesheet %}
  .recenzije {
    padding-block: var(--razmak-6);
    border-top: 1px solid var(--boja-ivica);
  }

  .recenzije__prosek {
    display: flex;
    align-items: center;
    gap: var(--razmak-3);
    margin-block: var(--razmak-3) var(--razmak-5);
  }

  .recenzije__lista {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: var(--razmak-4);
    list-style: none;
    margin: 0 0 var(--razmak-4);
    padding: 0;
  }

  .recenzija {
    padding: var(--razmak-4);
    background-color: var(--boja-povrsina);
    border: 1px solid var(--boja-ivica);
    border-radius: var(--radijus-kartica);
  }

  .recenzija__vrh {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--razmak-2);
    margin-block-end: var(--razmak-3);
  }

  .recenzija__vrh time {
    margin-inline-start: auto;
  }
{% endstylesheet %}

{% javascript %}
  (function () {
    document.addEventListener('click', (dogadjaj) => {
      const dugme = dogadjaj.target.closest('[data-prikazi-jos]');
      if (!dugme) return;

      document.querySelectorAll('[data-skrivena]').forEach((stavka) => {
        stavka.hidden = false;
        stavka.removeAttribute('data-skrivena');
      });

      dugme.hidden = true;
    });
  })();
{% endjavascript %}

{% schema %}
{
  "name": "t:general.prostor_recenzije",
  "settings": [
    {
      "type": "range",
      "id": "broj_recenzija",
      "label": "t:labels.broj_recenzija",
      "min": 2,
      "max": 10,
      "step": 1,
      "default": 3
    }
  ],
  "disabled_on": { "groups": ["header", "footer"] }
}
{% endschema %}
```

- [ ] **Step 2: Dodaj u `templates/product.json`** — `"recenzije": { "type": "prostor-recenzije", "settings": { "broj_recenzija": 3 } }`, pa u `order` posle `kalendar`.

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

1. Prosek se slaže sa onim u zaglavlju prostora
2. Vidljive su tri recenzije, četvrta je skrivena
3. „Prikaži još" otkriva ostale i dugme nestaje
4. Svaka recenzija ima zvezdice, ime autora, oznaku tipa proslave i datum u obliku `14.06.2026.`
5. Prostor sa tačno 3 recenzije nema dugme „Prikaži još"
6. Klik na „4 recenzija" u zaglavlju skroluje do ove sekcije

- [ ] **Step 5: Commit**

```bash
git add sections/prostor-recenzije.liquid templates/product.json
git commit -m "feat: recenzije iz metaobjekata sa prikazi-jos"
```

---

## Task 18: Profil prostora — forma za upit

Kraj glavnog toka. Koristi Shopify `contact` formu, koja šalje mejl vlasniku store-a — bez ijedne linije backend koda.

**Files:**
- Create: `sections/prostor-upit.liquid`
- Modify: `templates/product.json`

**Interfaces:**
- Consumes: `?datum=` iz URL-a
- Produces: `[data-upit-datum]` — polje koje kalendar iz Taska 16 popunjava; `#upit` sidro

- [ ] **Step 1: Napravi `sections/prostor-upit.liquid`**

```liquid
{% liquid
  assign polja = product.metafields.prostor
%}

<section class="upit" id="upit">
  <div class="upit__okvir">
    <h2>{{ 'upit.naslov' | t }}</h2>
    <p class="prigusen">{{ 'upit.uvod' | t }}</p>

    {% form 'contact', class: 'upit__forma' %}
      {% if form.posted_successfully? %}
        <p class="upit__uspeh" role="status">{{ 'upit.uspeh' | t }}</p>
      {% endif %}

      {% if form.errors %}
        <div class="upit__greske" role="alert">
          {{ form.errors | default_errors }}
        </div>
      {% endif %}

      <input type="hidden" name="contact[Prostor]" value="{{ product.title | escape }}">
      <input type="hidden" name="contact[Link]" value="{{ shop.url }}{{ product.url }}">

      <div class="upit__mreza">
        <div class="polje-grupa">
          <label for="upit-ime">{{ 'upit.ime' | t }}</label>
          <input class="polje" id="upit-ime" type="text" name="contact[name]" autocomplete="name" required>
        </div>

        <div class="polje-grupa">
          <label for="upit-email">{{ 'upit.email' | t }}</label>
          <input class="polje" id="upit-email" type="email" name="contact[email]" autocomplete="email" required>
        </div>

        <div class="polje-grupa">
          <label for="upit-telefon">{{ 'upit.telefon' | t }}</label>
          <input class="polje" id="upit-telefon" type="tel" name="contact[Telefon]" autocomplete="tel">
        </div>

        <div class="polje-grupa">
          <label for="upit-tip">{{ 'upit.tip_proslave' | t }}</label>
          <select class="polje" id="upit-tip" name="contact[Tip proslave]">
            {% for tip in polja.tipovi_proslava.value %}
              <option value="{{ tip }}">{{ tip }}</option>
            {% endfor %}
          </select>
        </div>

        <div class="polje-grupa">
          <label for="upit-datum">{{ 'upit.datum' | t }}</label>
          <input class="polje" id="upit-datum" type="date" name="contact[Datum]" data-upit-datum>
        </div>

        <div class="polje-grupa">
          <label for="upit-gostiju">{{ 'upit.broj_gostiju' | t }}</label>
          <input
            class="polje"
            id="upit-gostiju"
            type="number"
            name="contact[Broj gostiju]"
            min="{{ polja.kapacitet_min.value }}"
            max="{{ polja.kapacitet_max.value }}"
            placeholder="{{ polja.kapacitet_min.value }}"
          >
        </div>

        <div class="polje-grupa upit__siroko">
          <label for="upit-poruka">{{ 'upit.poruka' | t }}</label>
          <textarea class="polje" id="upit-poruka" name="contact[body]" rows="4"></textarea>
        </div>
      </div>

      <button type="submit" class="dugme dugme--primarno">{{ 'upit.posalji' | t }}</button>
    {% endform %}
  </div>
</section>

{% stylesheet %}
  .upit {
    padding-block: var(--razmak-6);
  }

  .upit__okvir {
    padding: var(--razmak-6);
    background-color: var(--boja-povrsina);
    border: 1px solid var(--boja-ivica);
    border-radius: var(--radijus-kartica);
  }

  .upit__mreza {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: var(--razmak-4);
    margin-block: var(--razmak-5);
  }

  .upit__siroko {
    grid-column: 1 / -1;
  }

  .upit__uspeh {
    padding: var(--razmak-4);
    border-radius: var(--radijus-polja);
    background-color: color-mix(in oklab, var(--boja-akcenat) 12%, white);
    color: var(--boja-akcenat);
  }

  .upit__greske {
    padding: var(--razmak-4);
    border-radius: var(--radijus-polja);
    background-color: color-mix(in oklab, var(--boja-zauzeto) 12%, white);
    color: var(--boja-zauzeto);
  }
{% endstylesheet %}

{% javascript %}
  (function () {
    function pokreni() {
      const polje = document.querySelector('[data-upit-datum]');
      if (!polje) return;

      /* Datum dosao sa stranice rezultata. Liquid ga ne moze procitati. */
      const datum = new URLSearchParams(window.location.search).get('datum');
      if (!datum) return;

      polje.value = datum;
      polje.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', pokreni);
    } else {
      pokreni();
    }
  })();
{% endjavascript %}

{% schema %}
{
  "name": "t:general.prostor_upit",
  "settings": [],
  "disabled_on": { "groups": ["header", "footer"] }
}
{% endschema %}
```

- [ ] **Step 2: Dodaj u `templates/product.json`** — `"upit": { "type": "prostor-upit", "settings": {} }`, poslednji u `order`.

Konačan `order`: `["zaglavlje", "detalji", "paketi", "kalendar", "recenzije", "upit"]`.

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista — kraj glavnog toka**

1. Padajući meni „Tip proslave" nudi **samo** tipove koje taj prostor podržava
2. „Broj gostiju" ima `min` i `max` iz kapaciteta prostora; unos van opsega blokira submit
3. Otvori `/products/restoran-dunavska-terasa?datum=2026-11-20` → polje datuma je popunjeno, a **kalendar iznad ima taj dan obojen u akcenat**
4. Klik na slobodan dan u kalendaru popunjava polje i skroluje do forme
5. Pošalji formu sa ispravnim podacima → stranica se osvežava, poruka „Hvala — upit je poslat."
6. Mejl stiže na adresu iz **Settings → Notifications → Customer contact**; sadrži polja `Prostor`, `Link`, `Tip proslave`, `Datum`, `Broj gostiju`
7. Pošalji sa neispravnim imejlom → crveni okvir sa porukom o grešci, unos se ne gubi
8. Ceo tok od početka: rezultati → filter → kartica → profil → izbor datuma → upit

Provera 3 dokazuje da datum preživljava tri prelaza: URL rezultata → link kartice → profil prostora.

- [ ] **Step 5: Commit**

```bash
git add sections/prostor-upit.liquid templates/product.json
git commit -m "feat: forma za upit preko Shopify contact forme

Datum stigao iz URL-a popunjava polje i obelezava dan u kalendaru."
```

---

## Task 19: Početna — hero sa pretragom

Namerno dolazi posle Taska 11: forma mora da proizvodi tačno one URL-ove koje stranica rezultata već razume, pa se piše prema postojećem ugovoru, ne obrnuto.

**Files:**
- Create: `sections/hero-pretraga.liquid`
- Modify: `templates/index.json` (prepis)

**Interfaces:**
- Produces: GET forma ka `/collections/svi-prostori` sa poljima `filter.p.m.prostor.tipovi_proslava`, `filter.p.m.prostor.kapacitet_opseg`, `filter.p.m.prostor.kvart`, `filter.v.price.lte`, `datum`

- [ ] **Step 1: Napravi `sections/hero-pretraga.liquid`**

```liquid
{% liquid
  # Izvor istine za ove liste je scripts/lib/recnici.mjs i scripts/lib/kapacitet.mjs.
  # Liquid ne moze da ih procita, pa se drze sinhrono rucno. Task 19 smoke lista
  # proverava da svaka opcija zaista vraca rezultate.
  assign tipovi = 'Rođendan,Dečiji rođendan,Punoletstvo,Svadba,Krštenje,Matura,Diplomiranje,Poslovni događaj,Privatna zabava' | split: ','
  assign korpe = 'Do 30,30-50,50-100,100-150,150-250,250+' | split: ','
  assign kvartovi = 'Stari grad,Liman,Grbavica,Detelinara,Novo naselje,Podbara,Salajka,Telep,Adice,Sremska Kamenica,Petrovaradin,Futog,Veternik,Okolina Novog Sada' | split: ','
  assign budzeti = '1000,1500,2000,2500,3000' | split: ','
  assign cilj = collections['svi-prostori'].url

  # `| default: 'kljuc' | t` ne radi: `t` bi se primenio na merchantov tekst
  # i ispisao "Translation missing". Fallback mora ici kroz uslov.
  assign naslov = section.settings.naslov
  if naslov == blank
    assign naslov = 'pocetna.naslov' | t
  endif
%}

<div class="hero full-width">
  {% if section.settings.pozadina %}
    <div class="hero__pozadina">
      {{
        section.settings.pozadina
        | image_url: width: 2400
        | image_tag: loading: 'eager', widths: '900, 1400, 2400', sizes: '100vw', alt: ''
      }}
    </div>
  {% endif %}

  <div class="hero__sadrzaj">
    <h1 class="hero__naslov">{{ naslov }}</h1>
    <p class="hero__podnaslov">{{ 'pocetna.podnaslov' | t }}</p>

    <form class="hero__forma" method="get" action="{{ cilj }}" data-hero-forma>
      <div class="polje-grupa">
        <label for="hero-tip">{{ 'pocetna.tip_proslave' | t }}</label>
        <select class="polje" id="hero-tip" name="filter.p.m.prostor.tipovi_proslava">
          <option value="">{{ 'opste.bilo_koji' | t }}</option>
          {% for tip in tipovi %}
            <option value="{{ tip }}">{{ tip }}</option>
          {% endfor %}
        </select>
      </div>

      <div class="polje-grupa">
        <label for="hero-datum">{{ 'pocetna.datum' | t }}</label>
        <input class="polje" id="hero-datum" type="date" name="datum">
      </div>

      <div class="polje-grupa">
        <label for="hero-gostiju">{{ 'pocetna.broj_gostiju' | t }}</label>
        <select class="polje" id="hero-gostiju" name="filter.p.m.prostor.kapacitet_opseg">
          <option value="">{{ 'opste.bilo_koji' | t }}</option>
          {% for korpa in korpe %}
            <option value="{{ korpa }}">{{ korpa }}</option>
          {% endfor %}
        </select>
      </div>

      <div class="polje-grupa">
        <label for="hero-kvart">{{ 'pocetna.deo_grada' | t }}</label>
        <select class="polje" id="hero-kvart" name="filter.p.m.prostor.kvart">
          <option value="">{{ 'opste.bilo_koji' | t }}</option>
          {% for kvart in kvartovi %}
            <option value="{{ kvart }}">{{ kvart }}</option>
          {% endfor %}
        </select>
      </div>

      <div class="polje-grupa">
        <label for="hero-budzet">{{ 'pocetna.budzet_do' | t }}</label>
        <select class="polje" id="hero-budzet" name="filter.v.price.lte">
          <option value="">{{ 'opste.bilo_koji' | t }}</option>
          {% for iznos in budzeti %}
            <option value="{{ iznos }}">{{ iznos }} RSD</option>
          {% endfor %}
        </select>
      </div>

      <button type="submit" class="dugme dugme--primarno hero__submit">
        {{ 'pocetna.trazi' | t }}
      </button>
    </form>
  </div>
</div>

{% stylesheet %}
  .hero {
    position: relative;
    display: grid;
    align-items: end;
    min-height: 32rem;
    padding-block: var(--razmak-8) var(--razmak-7);
    color: var(--boja-akcenat-tekst);
  }

  .hero__pozadina {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .hero__pozadina img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero__pozadina::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgb(20 15 12 / 78%), rgb(20 15 12 / 30%));
  }

  .hero__sadrzaj {
    position: relative;
    width: var(--content-width);
    margin-inline: auto;
  }

  .hero__naslov {
    max-width: 20ch;
  }

  .hero__podnaslov {
    max-width: 52ch;
    margin-block: var(--razmak-3) var(--razmak-6);
    font-size: var(--tekst-lg);
  }

  .hero__forma {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: var(--razmak-3);
    align-items: end;
    padding: var(--razmak-4);
    background-color: var(--boja-povrsina);
    border-radius: var(--radijus-kartica);
    box-shadow: var(--senka-2);
    color: var(--boja-tekst);
  }

  .hero__submit {
    height: 3rem;
  }
{% endstylesheet %}

{% javascript %}
  (function () {
    const forma = document.querySelector('[data-hero-forma]');
    if (!forma) return;

    /* Prazno polje bi poslalo prazan filter parametar, sto Shopify moze
       protumaciti kao filter bez vrednosti i vratiti nula rezultata.
       Onemoguceno polje se ne salje. */
    forma.addEventListener('submit', () => {
      forma.querySelectorAll('select, input').forEach((polje) => {
        if (!polje.value) polje.disabled = true;
      });
    });
  })();
{% endjavascript %}

{% schema %}
{
  "name": "t:general.hero_pretraga",
  "settings": [
    { "type": "text", "id": "naslov", "label": "t:labels.naslov" },
    { "type": "image_picker", "id": "pozadina", "label": "t:labels.pozadinska_slika" }
  ],
  "presets": [{ "name": "t:general.hero_pretraga" }]
}
{% endschema %}
```

- [ ] **Step 2: Prepiši `templates/index.json`**

```json
{
  "sections": {
    "hero": { "type": "hero-pretraga", "settings": {} }
  },
  "order": ["hero"]
}
```

- [ ] **Step 3: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 4: Smoke lista**

1. Pet polja u jednom redu na desktopu, u koloni na 375px
2. Submit bez ijednog izbora → `/collections/svi-prostori` **bez ijednog parametra**, 20 rezultata
3. Izaberi samo „Svadba" → URL ima **samo** `filter.p.m.prostor.tipovi_proslava=Svadba`, bez praznih parametara
4. Izaberi „Svadba" + „100-150" + „Petrovaradin" + datum → sva četiri parametra u URL-u, rezultati se slažu, poruka o zauzetosti se prikazuje
5. Budžet „do 2000 RSD" → `filter.v.price.lte=2000`, najskuplji prikazan prostor je ≤ 2000
6. **Svaka opcija svakog padajućeg menija daje bar jedan rezultat.** Prođi kroz svih 9 tipova proslava, 6 korpi i 14 kvartova. Nula rezultata znači da se vrednost razlikuje od one u `scripts/lib/recnici.mjs`
7. Uploaduj pozadinsku sliku u theme editoru → tekst ostaje čitljiv preko gradijenta

Provera 6 je jedina zaštita od rasinhronizacije Liquida i `recnici.mjs`.

- [ ] **Step 5: Commit**

```bash
git add sections/hero-pretraga.liquid templates/index.json
git commit -m "feat: hero sa pretragom koja gradi Shopify filter URL bez JS-a"
```

---

## Task 20: Početna — kategorije, izdvojeni prostori, kako radi

**Files:**
- Create: `sections/kategorije-proslava.liquid`, `sections/istaknuti-prostori.liquid`, `sections/kako-radi.liquid`
- Modify: `templates/index.json`

**Interfaces:**
- Consumes: `kartica-prostora` snippet

- [ ] **Step 1: Napravi `sections/kategorije-proslava.liquid`**

Kartice vode na već filtriran URL. Vrednost filtera je podešavanje bloka, pa merchant može dodati povod bez dodirivanja koda.

```liquid
{% liquid
  assign cilj = collections['svi-prostori'].url
%}

<section class="kategorije">
  <h2>{{ 'pocetna.kategorije_naslov' | t }}</h2>

  <ul class="kategorije__lista" role="list">
    {% for block in section.blocks %}
      <li {{ block.shopify_attributes }}>
        <a
          class="kategorija"
          href="{{ cilj }}?filter.p.m.prostor.tipovi_proslava={{ block.settings.vrednost | url_encode }}"
        >
          {% if block.settings.slika %}
            {{
              block.settings.slika
              | image_url: width: 600
              | image_tag: loading: 'lazy', widths: '300, 600', sizes: '(min-width: 60rem) 15rem, 45vw', alt: ''
            }}
          {% endif %}
          <span class="kategorija__naslov">{{ block.settings.naslov }}</span>
        </a>
      </li>
    {% endfor %}
  </ul>
</section>

{% stylesheet %}
  .kategorije {
    padding-block: var(--razmak-7);
  }

  .kategorije h2 {
    margin-block-end: var(--razmak-5);
  }

  .kategorije__lista {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: var(--razmak-4);
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .kategorija {
    position: relative;
    display: block;
    aspect-ratio: 4 / 3;
    border-radius: var(--radijus-kartica);
    overflow: hidden;
    text-decoration: none;
    color: var(--boja-akcenat-tekst);
    background-color: var(--boja-tekst);
  }

  .kategorija img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.75;
    transition: transform 200ms ease, opacity 200ms ease;
  }

  .kategorija:hover img {
    transform: scale(1.04);
    opacity: 0.6;
  }

  .kategorija__naslov {
    position: absolute;
    inset-block-end: var(--razmak-3);
    inset-inline-start: var(--razmak-3);
    font-family: var(--font-naslov);
    font-size: var(--tekst-lg);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.kategorije_proslava",
  "max_blocks": 9,
  "blocks": [
    {
      "type": "kategorija",
      "name": "t:general.kategorija",
      "settings": [
        { "type": "text", "id": "naslov", "label": "t:labels.naslov" },
        { "type": "text", "id": "vrednost", "label": "t:labels.vrednost_filtera" },
        { "type": "image_picker", "id": "slika", "label": "t:labels.slika" }
      ]
    }
  ],
  "presets": [
    {
      "name": "t:general.kategorije_proslava",
      "blocks": [
        { "type": "kategorija", "settings": { "naslov": "Svadbe", "vrednost": "Svadba" } },
        { "type": "kategorija", "settings": { "naslov": "Punoletstva", "vrednost": "Punoletstvo" } },
        { "type": "kategorija", "settings": { "naslov": "Dečiji rođendani", "vrednost": "Dečiji rođendan" } },
        { "type": "kategorija", "settings": { "naslov": "Rođendani", "vrednost": "Rođendan" } },
        { "type": "kategorija", "settings": { "naslov": "Krštenja", "vrednost": "Krštenje" } },
        { "type": "kategorija", "settings": { "naslov": "Poslovni događaji", "vrednost": "Poslovni događaj" } }
      ]
    }
  ]
}
{% endschema %}
```

Dodaj u `locales/*.schema.json`: `general.kategorija`, `labels.vrednost_filtera`, `labels.slika`.

- [ ] **Step 2: Napravi `sections/istaknuti-prostori.liquid`**

```liquid
{% liquid
  assign izabrani = section.settings.prostori
  if izabrani.count == 0
    assign izabrani = collections['svi-prostori'].products
  endif
%}

<section class="istaknuti">
  <div class="istaknuti__vrh">
    <h2>{{ 'pocetna.istaknuti_naslov' | t }}</h2>
    <a class="dugme dugme--tiho" href="{{ collections['svi-prostori'].url }}">
      {{ 'pocetna.istaknuti_svi' | t }}
    </a>
  </div>

  <div class="istaknuti__grid">
    {% for prostor in izabrani limit: section.settings.broj_prostora %}
      {% render 'kartica-prostora', prostor: prostor, poredjenje: true %}
    {% endfor %}
  </div>
</section>

{% stylesheet %}
  .istaknuti {
    padding-block: var(--razmak-7);
  }

  .istaknuti__vrh {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--razmak-4);
    margin-block-end: var(--razmak-5);
  }

  .istaknuti__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(17rem, 1fr));
    gap: var(--razmak-5);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.istaknuti_prostori",
  "settings": [
    { "type": "product_list", "id": "prostori", "label": "t:general.istaknuti_prostori", "limit": 8 },
    {
      "type": "range", "id": "broj_prostora", "label": "t:labels.broj_prostora",
      "min": 2, "max": 8, "step": 1, "default": 4
    }
  ],
  "presets": [{ "name": "t:general.istaknuti_prostori" }]
}
{% endschema %}
```

Ako merchant ništa ne izabere, prikazuju se prva četiri iz kolekcije — sekcija nikad nije prazna.

- [ ] **Step 3: Napravi `sections/kako-radi.liquid`**

```liquid
<section class="kako-radi" id="kako-radi">
  <h2>{{ 'pocetna.kako_radi_naslov' | t }}</h2>

  <ol class="kako-radi__koraci">
    <li>
      <span class="kako-radi__broj">1</span>
      <h3>{{ 'pocetna.korak_1_naslov' | t }}</h3>
      <p class="prigusen">{{ 'pocetna.korak_1_tekst' | t }}</p>
    </li>
    <li>
      <span class="kako-radi__broj">2</span>
      <h3>{{ 'pocetna.korak_2_naslov' | t }}</h3>
      <p class="prigusen">{{ 'pocetna.korak_2_tekst' | t }}</p>
    </li>
    <li>
      <span class="kako-radi__broj">3</span>
      <h3>{{ 'pocetna.korak_3_naslov' | t }}</h3>
      <p class="prigusen">{{ 'pocetna.korak_3_tekst' | t }}</p>
    </li>
  </ol>
</section>

{% stylesheet %}
  .kako-radi {
    padding-block: var(--razmak-7);
    border-top: 1px solid var(--boja-ivica);
  }

  .kako-radi__koraci {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--razmak-5);
    list-style: none;
    margin: var(--razmak-5) 0 0;
    padding: 0;
    counter-reset: korak;
  }

  .kako-radi__broj {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    margin-block-end: var(--razmak-3);
    border-radius: 999px;
    background-color: var(--boja-akcenat-tiha);
    color: var(--boja-akcenat);
    font-family: var(--font-naslov);
    font-size: var(--tekst-lg);
  }

  .kako-radi__koraci h3 {
    font-size: var(--tekst-lg);
    margin-block-end: var(--razmak-2);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.kako_radi",
  "settings": [],
  "presets": [{ "name": "t:general.kako_radi" }]
}
{% endschema %}
```

- [ ] **Step 4: Dopuni `templates/index.json`**

```json
{
  "sections": {
    "hero": { "type": "hero-pretraga", "settings": {} },
    "kategorije": { "type": "kategorije-proslava", "settings": {} },
    "istaknuti": { "type": "istaknuti-prostori", "settings": { "broj_prostora": 4 } },
    "kako-radi": { "type": "kako-radi", "settings": {} }
  },
  "order": ["hero", "kategorije", "istaknuti", "kako-radi"]
}
```

Blokovi kategorija dolaze iz `presets` kad se sekcija prvi put doda u theme editoru. Ako se `index.json` piše ručno, dodaj i `blocks` i `block_order` po istom obrascu kao u presetu.

- [ ] **Step 5: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 6: Smoke lista**

1. Šest kartica kategorija; klik na „Svadbe" vodi na rezultate sa `filter.p.m.prostor.tipovi_proslava=Svadba` i tačnim brojem
2. „Dečiji rođendani" radi uprkos razmaku i dijakritici u vrednosti — `url_encode` to rešava
3. Četiri izdvojena prostora sa čekboksom „Uporedi"
4. Izaberi tri prostora u `product_list` podešavanju → prikazuju se baš ta tri
5. „Kako radi" ima tri numerisana koraka
6. Na 375px sve sekcije su jednokolonske i ništa ne prelazi horizontalno

- [ ] **Step 7: Commit**

```bash
git add sections/kategorije-proslava.liquid sections/istaknuti-prostori.liquid sections/kako-radi.liquid templates/index.json locales/
git commit -m "feat: kategorije proslava, izdvojeni prostori i kako-radi na pocetnoj"
```

---

## Task 21: Poređenje prostora

`/products/<handle>.js` ne vraća metafieldove, pa se tabela ne može puniti fetch-om. Umesto toga Liquid ispiše sve prostore sa svim poljima u jedan JSON blok, a JS izabere one iz `localStorage`.

**Files:**
- Create: `sections/poredjenje.liquid`
- Create: `templates/page.poredjenje.json`

**Interfaces:**
- Consumes: `window.Poredjenje` i događaj `poredjenje:promena` iz Taska 8
- Produces: šalje `poredjenje:ukloni` sa `detail.handle`

- [ ] **Step 1: Napravi stranicu u adminu**

**Content → Pages → Add page**, naslov `Poređenje`, URL handle mora biti **`poredjenje`**. Šablon se bira u sledećem koraku, kad fajl bude postojao.

- [ ] **Step 2: Napravi `sections/poredjenje.liquid`**

```liquid
{% liquid
  assign prostori = collections['svi-prostori'].products
%}

<section class="poredjenje">
  <h1>{{ 'poredjenje.naslov' | t }}</h1>

  {% comment %}
    Liquid `for` staje na 50 iteracija. Sa 20 prostora to nije problem, ali
    preko 50 bi tabela tiho izgubila prostore i trebalo bi preci na paginate
    ili Storefront API.
  {% endcomment %}
  <script type="application/json" data-poredjenje-podaci>
    [
    {%- for prostor in prostori -%}
      {%- liquid
        assign polja = prostor.metafields.prostor
        assign kapacitet = 'kartica.kapacitet' | t: min: polja.kapacitet_min.value, max: polja.kapacitet_max.value
        assign cena = prostor.price | money
        assign slika = prostor.featured_image | image_url: width: 400
      -%}
      {
        "handle": {{ prostor.handle | json }},
        "naziv": {{ prostor.title | json }},
        "url": {{ prostor.url | json }},
        "slika": {{ slika | json }},
        "cena": {{ cena | json }},
        "tip": {{ prostor.type | json }},
        "kvart": {{ polja.kvart.value | json }},
        "kapacitet": {{ kapacitet | json }},
        "ocena": {{ polja.ocena.value.rating | json }},
        "sadrzaji": {{ polja.sadrzaji.value | json }},
        "hrana": {{ polja.hrana_pice.value | json }},
        "muzika": {{ polja.muzika.value | json }}
      }{%- unless forloop.last -%},{%- endunless -%}
    {%- endfor -%}
    ]
  </script>

  <div
    class="poredjenje__izlaz"
    data-poredjenje-izlaz
    data-red-kapacitet="{{ 'poredjenje.red_kapacitet' | t | escape }}"
    data-red-cena="{{ 'poredjenje.red_cena' | t | escape }}"
    data-red-kvart="{{ 'poredjenje.red_kvart' | t | escape }}"
    data-red-tip="{{ 'poredjenje.red_tip' | t | escape }}"
    data-red-ocena="{{ 'poredjenje.red_ocena' | t | escape }}"
    data-red-pogodnosti="{{ 'poredjenje.red_pogodnosti' | t | escape }}"
    data-red-hrana="{{ 'poredjenje.red_hrana' | t | escape }}"
    data-red-muzika="{{ 'poredjenje.red_muzika' | t | escape }}"
    data-ukloni="{{ 'poredjenje.ukloni' | t | escape }}"
  ></div>

  <template data-poredjenje-prazno>
    <div class="poredjenje__prazno">
      <h2>{{ 'poredjenje.prazno_naslov' | t }}</h2>
      <p class="prigusen">{{ 'poredjenje.prazno_tekst' | t }}</p>
      <a class="dugme dugme--primarno" href="{{ collections['svi-prostori'].url }}">
        {{ 'poredjenje.nazad_na_rezultate' | t }}
      </a>
    </div>
  </template>
</section>

{% stylesheet %}
  .poredjenje {
    padding-block: var(--razmak-6);
  }

  .poredjenje h1 {
    margin-block-end: var(--razmak-5);
  }

  .poredjenje__izlaz {
    overflow-x: auto;
  }

  .poredjenje__tabela {
    border-collapse: collapse;
    min-width: 100%;
  }

  .poredjenje__tabela th,
  .poredjenje__tabela td {
    padding: var(--razmak-3);
    border-bottom: 1px solid var(--boja-ivica);
    text-align: left;
    vertical-align: top;
    min-width: 11rem;
  }

  .poredjenje__oznaka {
    position: sticky;
    inset-inline-start: 0;
    background-color: var(--boja-pozadina);
    font-weight: 400;
    color: var(--boja-prigusen);
    min-width: 12rem;
  }

  .poredjenje__podnaslov th {
    padding-block-start: var(--razmak-5);
    font-family: var(--font-naslov);
    font-size: var(--tekst-lg);
    color: var(--boja-tekst);
  }

  .poredjenje__glava img {
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    border-radius: var(--radijus-polja);
    margin-block-end: var(--razmak-2);
  }

  .poredjenje__naziv {
    display: block;
    font-weight: 600;
    margin-block-end: var(--razmak-2);
  }

  .poredjenje__ima {
    color: var(--boja-akcenat);
    font-weight: 700;
  }

  .poredjenje__nema {
    color: var(--boja-ivica);
  }

  .poredjenje__prazno {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--razmak-4);
    padding: var(--razmak-7) var(--razmak-5);
    border: 1px dashed var(--boja-ivica);
    border-radius: var(--radijus-kartica);
  }
{% endstylesheet %}

{% javascript %}
  (function () {
    function pokreni() {
      const izlaz = document.querySelector('[data-poredjenje-izlaz]');
      if (!izlaz) return;

      const izvor = document.querySelector('[data-poredjenje-podaci]');
      const prazno = document.querySelector('[data-poredjenje-prazno]');
      const oznake = izlaz.dataset;

      let poHandleu;
      try {
        poHandleu = new Map(JSON.parse(izvor.textContent).map((p) => [p.handle, p]));
      } catch (greska) {
        poHandleu = new Map();
      }

      function cvor(tag, klasa, tekst) {
        const element = document.createElement(tag);
        if (klasa) element.className = klasa;
        if (tekst !== undefined && tekst !== null) element.textContent = String(tekst);
        return element;
      }

      function redVrednosti(naslov, izabrani, kljuc) {
        const red = cvor('tr');
        red.appendChild(cvor('th', 'poredjenje__oznaka', naslov));
        izabrani.forEach((prostor) => {
          const vrednost = prostor[kljuc];
          red.appendChild(cvor('td', null, vrednost === null || vrednost === '' ? '—' : vrednost));
        });
        return red;
      }

      function redoviSkupa(naslov, izabrani, kljuc) {
        const unija = [];
        izabrani.forEach((prostor) => {
          (prostor[kljuc] || []).forEach((vrednost) => {
            if (unija.indexOf(vrednost) === -1) unija.push(vrednost);
          });
        });
        unija.sort((a, b) => a.localeCompare(b, 'sr'));

        const deo = document.createDocumentFragment();

        const zaglavlje = cvor('tr', 'poredjenje__podnaslov');
        const celija = cvor('th', null, naslov);
        celija.colSpan = izabrani.length + 1;
        zaglavlje.appendChild(celija);
        deo.appendChild(zaglavlje);

        unija.forEach((vrednost) => {
          const red = cvor('tr');
          red.appendChild(cvor('th', 'poredjenje__oznaka', vrednost));
          izabrani.forEach((prostor) => {
            const ima = (prostor[kljuc] || []).indexOf(vrednost) !== -1;
            red.appendChild(cvor('td', ima ? 'poredjenje__ima' : 'poredjenje__nema', ima ? '✓' : '✗'));
          });
          deo.appendChild(red);
        });

        return deo;
      }

      function glava(izabrani) {
        const red = cvor('tr');
        red.appendChild(cvor('th', 'poredjenje__oznaka', ''));

        izabrani.forEach((prostor) => {
          const celija = cvor('th', 'poredjenje__glava');

          if (prostor.slika) {
            const slika = document.createElement('img');
            slika.src = prostor.slika;
            slika.alt = prostor.naziv;
            slika.loading = 'lazy';
            celija.appendChild(slika);
          }

          const veza = cvor('a', 'poredjenje__naziv', prostor.naziv);
          veza.href = prostor.url;
          celija.appendChild(veza);

          const ukloni = cvor('button', 'dugme dugme--tiho', oznake.ukloni);
          ukloni.type = 'button';
          ukloni.dataset.ukloni = prostor.handle;
          celija.appendChild(ukloni);

          red.appendChild(celija);
        });

        return red;
      }

      function nacrtaj(lista) {
        const izabrani = lista.map((handle) => poHandleu.get(handle)).filter(Boolean);
        izlaz.replaceChildren();

        if (izabrani.length === 0) {
          izlaz.appendChild(prazno.content.cloneNode(true));
          return;
        }

        const tabela = cvor('table', 'poredjenje__tabela');
        const telo = cvor('tbody');

        telo.appendChild(glava(izabrani));
        telo.appendChild(redVrednosti(oznake.redCena, izabrani, 'cena'));
        telo.appendChild(redVrednosti(oznake.redKapacitet, izabrani, 'kapacitet'));
        telo.appendChild(redVrednosti(oznake.redKvart, izabrani, 'kvart'));
        telo.appendChild(redVrednosti(oznake.redTip, izabrani, 'tip'));
        telo.appendChild(redVrednosti(oznake.redOcena, izabrani, 'ocena'));
        telo.appendChild(redoviSkupa(oznake.redPogodnosti, izabrani, 'sadrzaji'));
        telo.appendChild(redoviSkupa(oznake.redHrana, izabrani, 'hrana'));
        telo.appendChild(redoviSkupa(oznake.redMuzika, izabrani, 'muzika'));

        tabela.appendChild(telo);
        izlaz.appendChild(tabela);
      }

      izlaz.addEventListener('click', (dogadjaj) => {
        const dugme = dogadjaj.target.closest('[data-ukloni]');
        if (!dugme) return;
        document.dispatchEvent(
          new CustomEvent('poredjenje:ukloni', { detail: { handle: dugme.dataset.ukloni } })
        );
      });

      document.addEventListener('poredjenje:promena', (dogadjaj) => nacrtaj(dogadjaj.detail.lista));

      /* Header salje poredjenje:promena na ucitavanju, ali ako je njegov
         listener vec prosao, iscrtaj odmah iz localStorage. */
      nacrtaj(window.Poredjenje ? window.Poredjenje.ucitaj() : []);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', pokreni);
    } else {
      pokreni();
    }
  })();
{% endjavascript %}

{% schema %}
{
  "name": "t:general.poredjenje",
  "settings": [],
  "disabled_on": { "groups": ["header", "footer"] }
}
{% endschema %}
```

- [ ] **Step 3: Napravi `templates/page.poredjenje.json`**

```json
{
  "sections": {
    "main": { "type": "poredjenje", "settings": {} }
  },
  "order": ["main"]
}
```

- [ ] **Step 4: Dodeli šablon stranici**

Admin → **Content → Pages → Poređenje** → **Theme template** → izaberi `poredjenje`. Sačuvaj.

- [ ] **Step 5: Theme check**

Run: `shopify theme check`
Expected: `0 offenses`

- [ ] **Step 6: Smoke lista**

1. Otvori `/pages/poredjenje` bez izabranih prostora → prazno stanje sa dugmetom „Pretraži prostore"
2. Na rezultatima čekiraj tri prostora, pa klikni „Poređenje (3)" u header-u → tabela sa tri kolone
3. Prva kolona je lepljiva pri horizontalnom skrolu
4. Redovi: cena, kapacitet, lokacija, tip, ocena, pa tri grupe sa ✓ i ✗
5. Grupa „Pogodnosti" nabraja **uniju** pogodnosti sva tri prostora, ne samo prvog
6. „Ukloni" na jednoj koloni je briše odmah, brojač u header-u se smanjuje, tabela se prekraja
7. Ukloni sve tri → prazno stanje, dugme u header-u nestaje
8. Izaberi četiri, pa pokušaj peti → poruka o limitu, tabela ostaje na četiri
9. Refresh stranice zadržava izbor
10. Na 375px tabela skroluje horizontalno a stranica **ne**

Provera 5 je razlog zbog kojeg tabela nije statična: unija se računa tek kad se zna koji su prostori izabrani.

- [ ] **Step 7: Commit**

```bash
git add sections/poredjenje.liquid templates/page.poredjenje.json
git commit -m "feat: tabela poredjenja iz Liquid JSON bloka i localStorage

Metafieldovi ne stizu kroz /products/<handle>.js, pa se ceo skup
prostora ispisuje u JSON a JS bira izabrane."
```

---

## Task 22: Čišćenje, navigacija i završna provera

**Files:**
- Delete: `sections/hello-world.liquid`, `sections/custom-section.liquid`, `sections/product.liquid`, `sections/collection.liquid`
- Modify: `sections/404.liquid`, `README.md`
- Modify: `locales/en.default.json`, `locales/sr.json`

**Interfaces:**
- Produces: tema bez mrtvog koda i prolazan `theme check`

- [ ] **Step 1: Obriši starter sekcije**

```bash
git rm sections/hello-world.liquid sections/custom-section.liquid sections/product.liquid sections/collection.liquid
```

`cart.liquid`, `blog.liquid`, `article.liquid`, `collections.liquid`, `password.liquid` i `page.liquid` **ostaju** — nisu u glavnom toku, ali tema mora ostati ispravna ako se neki od tih šablona otvori.

- [ ] **Step 2: Doradi `sections/404.liquid`**

```liquid
<div class="greska-404">
  <h1>{{ '404.title' | t }}</h1>
  <p class="prigusen">{{ '404.not_found' | t }}</p>
  <a class="dugme dugme--primarno" href="{{ collections['svi-prostori'].url }}">
    {{ '404.nazad' | t }}
  </a>
</div>

{% stylesheet %}
  .greska-404 {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--razmak-4);
    padding-block: var(--razmak-8);
  }
{% endstylesheet %}

{% schema %}
{
  "name": "t:general.404",
  "settings": []
}
{% endschema %}
```

Dodaj ključ `404.nazad` u oba locale fajla: `"nazad": "Browse venues"` / `"nazad": "Pretraži prostore"`. Stari `404.back_to_shopping` obriši — vodio bi u prodavnicu koje nema.

- [ ] **Step 3: Podesi navigaciju u adminu**

**Content → Menus → Main menu.** Stavke:

| Naziv | Odredište |
|---|---|
| Prostori | Collections → Svi prostori |
| Kako radi | `/#kako-radi` |
| Poređenje | Pages → Poređenje |

Pa u theme editoru na header sekciji izaberi `Main menu` i stranicu `Poređenje`.

- [ ] **Step 4: Ažuriraj `README.md`**

Zameni Skeleton README-om ovog projekta:

```markdown
# Proslava na klik

Shopify store za pronalaženje prostora za proslave u Novom Sadu.
Fakultetski projekat, demo podaci.

## Pokretanje

    npm install -g @shopify/cli@latest
    cp .env.example .env      # upiši domen i Admin API token
    npm run setup             # metafield i metaobject definicije, kolekcija
    npm run seed              # 20 demo prostora
    shopify theme dev --store <domen>

## Testovi

    npm test                  # node --test nad scripts/
    shopify theme check       # statička analiza Liquida

## Dokumentacija

- Tehnički dizajn: `docs/superpowers/specs/2026-09-01-proslava-na-klik-design.md`
- Plan implementacije: `docs/superpowers/plans/2026-09-01-proslava-na-klik.md`

## Poznata ograničenja

- Filter po datumu i sortiranje po oceni rade nad **trenutnom stranicom** rezultata.
  Liquid ne može da čita query string, a Shopify filteri ne rade nad kalendarom.
- Kalendar dostupnosti je ručno održavan metafield, ne sistem rezervacija.
- Tabela poređenja učitava do 50 prostora, koliko dozvoljava Liquid `for` petlja.
```

- [ ] **Step 5: Završna provera cele teme**

Run: `shopify theme check`
Expected: `0 offenses`

Run: `npm test`
Expected: svi testovi prolaze

- [ ] **Step 6: Završna smoke lista — ceo proizvod**

**Glavni tok od početka do kraja:**

1. Početna → izaberi „Svadba", datum `2026-10-15`, `100-150` gostiju, budžet do 3000 → Pretraži
2. Rezultati: filteri primenjeni, čipovi vidljivi, zauzeti prostori prigušeni, poruka tačna
3. Suzi sa „Pogodnosti → Parking" → broj se smanjuje, datum ostaje u URL-u
4. Čekiraj dva prostora za poređenje
5. Otvori prostor → datum je popunjen u formi i obeležen u kalendaru
6. Pročitaj pakete i recenzije, pošalji upit → poruka o uspehu, mejl stiže
7. Nazad → treći prostor u poređenje → otvori tabelu poređenja → tri kolone
8. Ukloni jedan → dve kolone

**Prazna i granična stanja:**

9. `/collections/svi-prostori?filter.p.m.prostor.sadrzaji=Bazen&filter.p.product_type=Konferencijska+sala` → prazno stanje
10. `/pages/poredjenje` u privatnom prozoru → prazno stanje, bez greške u konzoli
11. `/nepostojeca-stranica` → 404 sa dugmetom ka prostorima
12. Onemogući JavaScript → početna forma i dalje radi, filteri i dalje rade, paginacija radi. Otpadaju samo datum, poređenje i kalendar

**Mobilni, 375px:**

13. Prođi ceo tok iz koraka 1–8. Nijedna stranica ne sme da skroluje horizontalno; tabela poređenja skroluje unutar svog okvira

**Konzola:**

14. Nijedna stranica ne sme imati grešku u konzoli

Provera 12 je vredna na odbrani: pokazuje da je pretraga izgrađena na platformi, a ne zalepljena JavaScriptom.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: uklonjene starter sekcije, doradjena 404, azuriran README"
```

---

## Šta je namerno izostavljeno

Iz speca, odeljak 14. Ako se pojavi vreme, ovo su prvi kandidati — ali nijedan nije u obimu ovog plana:

blog i SEO vodiči · landing „dodaj svoj prostor" · plaćanja i kapare · prava sinhronizacija kalendara · nalozi i panel za vlasnike prostora · ostavljanje recenzija od strane korisnika · povezivanje sa dodatnim uslugama (DJ, fotograf, dekoracija) · GDPR i pravne strane · analitika · jezici pored srpskog

## Poznata ograničenja koja treba izgovoriti na odbrani

1. **Filter po datumu radi nad trenutnom stranicom rezultata.** Sa 20 prostora to je ceo skup; na 500 ne bi bilo tačno. Uzrok: Liquid ne čita query string, a Shopify filteri ne rade nad kalendarom.
2. **Sortiranje po oceni je klijentsko.** Shopify nudi samo cenu, naziv i datum.
3. **Kalendar je ručno održavan metafield.** Nije sistem rezervacija u realnom vremenu.
4. **Tabela poređenja staje na 50 prostora** — granica Liquid `for` petlje.
5. **Prostor je modelovan kao proizvod.** Semantički nategnuto, ali je to cena za fasetno filtriranje koje dobijamo besplatno.
