# Šta ostaje kad napraviš dev store

Kod je napisan u celini. Ništa od njega još **nije izvršeno** — nema Shopify
store-a, pa nijedna stranica nikad nije renderovana i nijedan API poziv nikad
nije poslat.

Dokazano je samo ovo:

| Provera | Stanje |
|---|---|
| `npm test` | 57 testova prolazi |
| `shopify theme check` | 61 fajl, 0 prekršaja |

Statička analiza ne izvršava Liquid i ne zove Shopify. Sve niže je neprovereno.

---

## Korak 1 — Napravi store

1. `https://partners.shopify.com` → **Stores → Add store → Create development store**
   - Store purpose: **Test or build a new app or theme**
2. **Settings → General → Store defaults** → Currency: **Serbian Dinar (RSD)**
   *Pre unosa proizvoda — menjanje valute posle ne preračunava cene.*
3. **Settings → Languages → Add language** → **Serbian**, pa **Set as default**

## Korak 2 — Admin API token

**Settings → Apps and sales channels → Develop apps → Create an app**, naziv `Seed skripta`.

**Admin API integration → Configure**, uključi:

```
write_products  read_products
write_metaobject_definitions  read_metaobject_definitions
write_metaobjects  read_metaobjects
write_publications  read_publications
```

**Install app → Reveal token once.** Upiši u `.env` (već je gitignore-ovan).

## Korak 3 — Pokreni skripte

```bash
npm run setup    # 18 metafield definicija, 2 metaobjekta, kolekcija
npm run seed     # 20 prostora sa recenzijama, paketima i slikama
```

Očekivano: `setup` ispiše 20 redova sa `+`, `seed` ispiše 20 naziva. Pokreni obe
**po drugi put** — svi redovi treba da počnu sa `=` i broj proizvoda mora ostati 20.

### Ovde je najveći rizik u celom projektu

Admin GraphQL šema se menja kvartalno, a nijedna od ovih mutacija nikad nije
poslata pravom API-ju. Ako neka odbije oblik ulaza, poruka iz `userErrors` imenuje
tačno polje koje smeta. Klijent je napisan da to jasno ispiše.

Verzija API-ja je `2026-07`, konstanta na vrhu `scripts/lib/admin.mjs`.
Za proveru trenutne šeme koristi `shopify-admin` skill ili
`https://shopify.dev/docs/api/admin-graphql`.

## Korak 4 — Search & Discovery

Instaliraj besplatnu **Search & Discovery** aplikaciju. **Filters → Add filter**,
osam filtera ovim redom:

| # | Izvor | Prikazano ime |
|---|---|---|
| 1 | `prostor.tipovi_proslava` | Tip proslave |
| 2 | `prostor.kapacitet_opseg` | Broj gostiju |
| 3 | Product type *(nativni)* | Tip prostora |
| 4 | `prostor.kvart` | Deo grada |
| 5 | Price *(nativni)* | Cena po osobi |
| 6 | `prostor.sadrzaji` | Pogodnosti |
| 7 | `prostor.hrana_pice` | Hrana i piće |
| 8 | `prostor.muzika` | Muzika |

Isključi **Availability**, **Vendor** i **Tags**.

Sačekaj nekoliko minuta da se indeksiranje završi.

## Korak 5 — Stranica i navigacija

- **Content → Pages → Add page**, naslov `Poređenje`, handle mora biti **`poredjenje`**,
  Theme template → `poredjenje`
- **Content → Menus → Main menu**: Prostori → kolekcija `Svi prostori` ·
  Kako radi → `/#kako-radi` · Poređenje → stranica `Poređenje`
- U theme editoru na header sekciji izaberi `Main menu` i stranicu `Poređenje`

---

# Smoke lista

`shopify theme dev --store <domen>`, pa redom. Svaka stavka je nešto što može
da ne radi, a statička analiza to ne bi uhvatila.

## A. Prvo ovo — otkriva najviše

- [ ] **Fontovi.** Theme editor → Typography. Ako `archivo_n7` nije prihvaćen,
      otvori font picker i izaberi bilo koji grotesk; handle se upiše sam.
      Isto za telo (`Karla`). **Proveri da `š đ č ć ž` nisu u zamenskom fontu.**
- [ ] **Cena paketa.** Profil prostora → sekcija Paketi. Cena mora biti
      formatirana (`2.200 RSD`). Ako se pojavi sirov broj ili `{}`, zameni
      `{{ paket.cena_po_osobi.value }}` sa `{{ paket.cena_po_osobi | metafield_text }}`
      u `sections/prostor-paketi.liquid`. Isto važi za `min_potrosnja` u
      `sections/prostor-zaglavlje.liquid`.

      **Ne** koristi `.value.amount | money`. `.value` na `money` tipu vraća
      money objekat, a `.value.amount` je decimalni broj (`2200.0`); filter
      `money` očekuje minor units i podelio bi ga sa 100, pa bi se ispisalo
      `22 RSD`. To je greška u suprotnom smeru i mnogo je teže primetiti od
      sirovog broja, jer izgleda kao legitimna cena. `metafield_text`
      formatira po tipu metafielda i ne dira vrednost.
- [ ] **Marker na mapi je u Novom Sadu**, ne usred okeana. Ako jeste u okeanu,
      `lat` i `lng` su zamenjeni ili nisu usejani.

## B. Filteri — srce projekta

Otvori svaki URL direktno i prebroj rezultate.

- [ ] `/collections/svi-prostori` → 20 prostora
- [ ] Sidebar ima **osam** grupa tačno onim redom iz koraka 4
- [ ] Uz svaku vrednost stoji broj; **nijedna nije 0** (to garantuje test iz Taska 4)
- [ ] `?filter.p.m.prostor.kapacitet_opseg=100-150` → samo prostori koji seku 101–150
- [ ] `?filter.p.product_type=Sala%C5%A1` → 3 salaša
- [ ] `?filter.v.price.gte=1000&filter.v.price.lte=2000` → samo taj raspon
- [ ] **Dva filtera odjednom** → presek, ne unija
- [ ] `?filter.p.m.prostor.muzika=DJ+dozvoljen` → razmak u vrednosti radi
- [ ] `?filter.p.m.prostor.kvart=Sremska+Kamenica` → razmak i dijakritika zajedno
- [ ] Cenovna polja pokazuju **1000 i 2000**, ne 100000
      *(ako pokazuju 100000, `divided_by: 100` u `filter-cena.liquid` je na pogrešnoj strani)*
- [ ] Kombinacija bez rezultata → prazno stanje sa dugmetom „Poništi sve"
- [ ] Paginacija na 12 po strani **zadržava aktivne filtere**

Ako filter vraća prazno a podaci u adminu postoje: vrednost u `seed-podaci.json`
se ne poklapa **doslovno** sa rečnikom u `scripts/lib/recnici.mjs`.

## C. Datum i traka dostupnosti

- [ ] `?datum=2026-10-15` → tačno 7 kartica prigušeno sa oznakom „Zauzeto"
- [ ] Poruka iznad grida: „Slobodno je 13 od 20 prostora — 7 je zauzeto 15.10.2026."
      i brojevi se slažu sa prigušenima
- [ ] **Traka dostupnosti** na svakoj kartici ima 14 blokića, crveni se poklapaju
      sa `zauzeti_datumi` u adminu
- [ ] Traženi datum u traci je uokviren modrim
- [ ] Klik na karticu vodi na URL koji **sadrži** `?datum=`
- [ ] Sa `?datum=` primeni filter → datum **ostaje** u URL-u posle submita
- [ ] „Najbolje ocenjeni" preređa grid; drugi klik vraća izvorni redosled

## D. Profil prostora

- [ ] Tri fotografije, velika levo
- [ ] Kalendar: **dva meseca**, nazivi na srpskom (`oktobar 2026`, `pon uto sre`)
- [ ] **1. septembar 2026. je utorak i stoji u drugoj koloni**
      *(ako je u prvoj, `(getDay() + 6) % 7` ne radi i ceo mesec je pomeren)*
- [ ] Strelica nazad ne ide pre tekućeg meseca
- [ ] `?datum=2026-11-15` → kalendar počinje od novembra, polje datuma popunjeno,
      taj dan obojen modrim
- [ ] Klik na slobodan dan popunjava formu i skroluje do nje
- [ ] Recenzije: tri vidljive, „Prikaži još" otkriva ostale
- [ ] Padajući meni „Tip proslave" nudi **samo** tipove tog prostora
- [ ] Slanje forme → poruka o uspehu; mejl stiže na adresu iz
      **Settings → Notifications → Customer contact**, sa poljima
      `Prostor`, `Link`, `Tip proslave`, `Datum`, `Broj gostiju`
- [ ] Neispravan imejl → crveni okvir, unos se ne gubi

## E. Početna

- [ ] Submit bez ijednog izbora → `/collections/svi-prostori` **bez parametara**
- [ ] Samo „Svadba" → **samo** `filter.p.m.prostor.tipovi_proslava=Svadba`,
      bez praznih parametara
- [ ] Sva četiri polja zajedno → svi parametri u URL-u, rezultati se slažu
- [ ] **Svaka opcija svakog padajućeg menija daje bar jedan rezultat** —
      9 tipova, 6 korpi, 14 kvartova. Nula znači rasinhronizaciju sa `recnici.mjs`
- [ ] Kategorija „Dečiji rođendani" radi uprkos razmaku i dijakritici

## F. Poređenje

- [ ] Prazno stanje bez izabranih prostora
- [ ] Tri prostora → tabela sa tri kolone, prva kolona lepljiva pri skrolu
- [ ] Grupa „Pogodnosti" nabraja **uniju** sva tri prostora, ne samo prvog
- [ ] „Ukloni" briše kolonu i smanjuje brojač u header-u
- [ ] Peti prostor → poruka o limitu, tabela ostaje na četiri
- [ ] Refresh zadržava izbor

## G. Na kraju

- [ ] **Bez JavaScripta**: početna forma radi, filteri rade, paginacija radi.
      Otpadaju samo datum, traka, poređenje i kalendar
- [ ] **375px**: ceo tok prolazi, nijedna stranica ne skroluje horizontalno,
      tabela poređenja skroluje unutar svog okvira
- [ ] Nijedna stranica nema grešku u konzoli
- [ ] `/nepostojeca` → 404 sa dugmetom ka prostorima
