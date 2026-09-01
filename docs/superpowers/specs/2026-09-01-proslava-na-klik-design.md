# Proslava na klik — tehnički dizajn

**Datum:** 2026-09-01
**Status:** odobren, spreman za plan implementacije
**Repo:** `zakazivanje-na-klik` (Shopify Skeleton Theme)

---

## 1. Cilj

Web platforma za pronalaženje prostora za proslave u Novom Sadu, realizovana kao Shopify online store. Korisnik na jednom mestu pretražuje, filtrira, poredi i šalje upit za termin — umesto da obilazi desetak sajtova i Instagram profila.

**Status projekta:** fakultetski deliverable. Cilj je demo koji radi i dobro se brani, popunjen izmišljenim ali realističnim podacima. Ne ide u produkciju.

**Glavni tok:** početna sa pretragom → rezultati sa filterima → profil prostora → forma za upit.

**Uz to, obavezno u demou:** poređenje prostora, ocene i recenzije, kalendar dostupnosti.

---

## 2. Polazna tačka

- Repo je netaknuta Shopify **Skeleton** tema: starter sekcije (`product`, `collection`, `header`, `footer`, `hello-world`, `custom-section`), `critical.css` od 2.4KB reseta, `locales/` samo engleski, `settings_schema.json` sa tipografijom, bojama i širinom strane.
- Nema git repozitorijuma.
- Shopify CLI nije instaliran.
- Shopify AI Toolkit MCP (`learn_shopify_api`) nije prisutan, iako ga `AGENTS.md` traži kao obavezan za rad sa Liquid temama.
- Shopify store ne postoji — kreće se od Partner naloga i development store-a.

---

## 3. Ključne odluke

### 3.1 Prostor je proizvod, prateći entiteti su metaobjekti

Razmotrena su tri modela:

| Model | Za | Protiv |
|---|---|---|
| Prostori kao proizvodi | Search & Discovery daje prave fasetne filtere, pretragu, sortiranje i paginaciju besplatno | Prostor semantički nije proizvod; treba gasiti e-commerce elemente |
| Prostori kao metaobjekti | Semantički čisto, svoj šablon i URL | **Nema fasetnih filtera** — sve filtriranje ručno u JS-u; nema pretrage ni paginacije |
| **Hibrid (izabrano)** | Kao gornje, plus recenzije i paketi kao metaobjekti umesto JSON blobova | Dve vrste definicija za održavanje |

Izabran je **hibrid**. Presudno: fasetno filtriranje je srce ovog projekta, a pisati ga ručno je posao koji ne doprinosi kvalitetu rezultata. Recenzije i paketi su pravi entiteti sa svojim poljima i zaslužuju metaobjekte.

Kvartovi Novog Sada su **namerno izostavljeni** iz metaobjekata — nosili bi samo naziv, a koštali bi dodatne definicije i rizika da filter po metaobject referenci ne radi kako se očekuje.

### 3.2 Faza 1 bez naplate, ali data model spreman za nju

Korisnik samo šalje upit za termin. Nema korpe, nema checkout-a, ikonica korpe se uklanja iz header-a. Ali pošto je prostor već proizvod, uvođenje kapare kasnije ne traži migraciju podataka — samo se uključi `add to cart` sa `line item properties` za datum i broj gostiju.

### 3.3 Jedna kolekcija, stanje pretrage u URL-u

Svaki prostor ima tag `prostor`. Postoji tačno jedna automatska kolekcija — **„Svi prostori"** — po tom tagu. Nema posebnih kolekcija po tipu proslave; navigacija i forma pretrage samo grade URL sa unapred primenjenim filterima.

Posledica: stanje pretrage je deljivo linkom, preživljava refresh i ide u browser istoriju, bez ijedne linije koda.

### 3.4 Cena proizvoda je cena po osobi

`product.price` = minimalna cena po osobi u RSD. Nativni Shopify cenovni filter time postaje „Budžet po osobi". Brief pominje ukupan budžet, ali se prostori u Srbiji reklamiraju po osobi i tako su međusobno uporedivi. `prostor.min_potrosnja` postoji kao zaseban podatak za prikaz, bez filtera.

---

## 4. Platformska ograničenja koja oblikuju dizajn

Ova tri ograničenja objašnjavaju većinu odluka niže i treba ih otvoreno izneti na odbrani.

**4.1 Liquid ne može da čita query string.** Ne postoji `request.query`. Sve što Shopify ne prepoznaje kao filter (`?datum=`) mora klijentski JavaScript. Nije stvar izbora nego platforme.

**4.2 Pretraga po datumu ne može biti server-side filter.** Shopify filteri rade nad atributima proizvoda, ne nad kalendarom. Datum se nosi kroz URL, poredi klijentski nad trenutnom stranicom rezultata i prikazuje na kalendaru profila.

**4.3 „Broj gostiju" je upit nad opsegom, a Shopify to ne ume.** Korisnik unese 80 gostiju, prostor pokriva 40–150. Rešenje: svaki prostor unapred dobija sve korpe kapaciteta koje pokriva, pa filter postaje običan multi-select.

**4.4 `/products/<handle>.js` ne vraća metafieldove.** Zato se tabela poređenja ne može puniti fetch-om (vidi 8.3).

**4.5 Nema nativnog sortiranja po oceni.** `collection.sort_options` nudi cenu, naziv i datum. Sortiranje po oceni se radi klijentski nad trenutnom stranicom — isti kompromis kao filter po datumu, pa je objašnjenje jedno za oba.

---

## 5. Data model

Namespace svih metafieldova: **`prostor`**. Vlasnik: Product.

### 5.1 Polja koja nisu metafieldovi

| Shopify polje | Uloga | Filter |
|---|---|---|
| `product.title` | Naziv prostora | pretraga |
| `product.type` | Kategorija prostora | **nativni filter** |
| `product.vendor` | Vlasnik / firma | ne |
| `product.price` | Cena po osobi (RSD) | **nativni filter** |
| `product.description` | Opis prostora (rich text) | ne |
| `product.images` | Galerija | ne |
| tag `prostor` | Uslov automatske kolekcije | ne |

### 5.2 Metafieldovi

| Ključ | Tip | Filter | Uloga |
|---|---|---|---|
| `kapacitet_min` | `number_integer` | ne | prikaz („40–150 gostiju") |
| `kapacitet_max` | `number_integer` | ne | prikaz |
| `kapacitet_opseg` | `list.single_line_text_field` | **da** | korpe koje prostor pokriva |
| `tipovi_proslava` | `list.single_line_text_field` | **da** | za koje proslave je pogodan |
| `sadrzaji` | `list.single_line_text_field` | **da** | parking, bašta, klima, bina… |
| `hrana_pice` | `list.single_line_text_field` | **da** | kuhinja, ketering, švedski sto… |
| `muzika` | `list.single_line_text_field` | **da** | DJ, živi bend, ograničenje buke |
| `kvart` | `single_line_text_field` | **da** | deo Novog Sada |
| `adresa` | `single_line_text_field` | ne | prikaz |
| `lat` | `number_decimal` | ne | mapa |
| `lng` | `number_decimal` | ne | mapa |
| `zauzeti_datumi` | `list.date` | ne | kalendar + klijentski filter |
| `ocena` | `rating` | ne | zvezdice |
| `broj_recenzija` | `number_integer` | ne | „(23 recenzije)" |
| `recenzije` | `list.metaobject_reference` → `recenzija` | ne | lista recenzija |
| `paketi` | `list.metaobject_reference` → `paket` | ne | ponuda paketa |
| `min_potrosnja` | `money` | ne | minimalna potrošnja |
| `kontakt_telefon` | `single_line_text_field` | ne | prikaz |

### 5.3 Kontrolisani rečnici

Vrednosti filtrabilnih polja se prikazuju korisniku doslovno, pa moraju biti čitljive. Istovremeno se pojavljuju u URL-u, pa `kapacitet_opseg` koristi **ASCII crticu**, ne dugu crtu — duga crta i dijakritika završe URL-enkodovane i teško se debaguju.

- **`product.type`** — Restoran · Svečana sala · Dečija igraonica · Klub · Kafić · Salaš · Terasa / krovna bašta · Konferencijska sala
- **`kapacitet_opseg`** — `Do 30` · `30-50` · `50-100` · `100-150` · `150-250` · `250+`
- **`tipovi_proslava`** — Rođendan · Dečiji rođendan · Punoletstvo · Svadba · Krštenje · Matura · Diplomiranje · Poslovni događaj · Privatna zabava
- **`sadrzaji`** — Parking · Bašta · Otvoren prostor · Zatvoren prostor · Klima · Bina · Ozvučenje · Projektor · Pristup za osobe sa invaliditetom · Garderoba · Dečiji kutak · Roštilj · Bazen · Wi-Fi · Dekoracija uključena
- **`hrana_pice`** — Sopstvena kuhinja · Ketering dozvoljen · Donošenje hrane dozvoljeno · Švedski sto · Meni po izboru · Vegetarijanski meni · Bez hrane · Piće uključeno · Sopstveno piće dozvoljeno
- **`muzika`** — DJ dozvoljen · Živi bend · Sopstveno ozvučenje · Ograničenje buke posle 24h · Bez muzike
- **`kvart`** — Stari grad · Liman · Grbavica · Detelinara · Novo naselje · Podbara · Salajka · Telep · Adice · Sremska Kamenica · Petrovaradin · Futog · Veternik · Okolina Novog Sada

### 5.4 Metaobjekti

**`recenzija`**

| Polje | Tip |
|---|---|
| `autor` | `single_line_text_field` |
| `ocena` | `number_integer` (1–5) |
| `tekst` | `multi_line_text_field` |
| `datum` | `date` |
| `tip_proslave` | `single_line_text_field` |

**`paket`**

| Polje | Tip |
|---|---|
| `naziv` | `single_line_text_field` |
| `cena_po_osobi` | `money` |
| `min_gostiju` | `number_integer` |
| `ukljucuje` | `list.single_line_text_field` |
| `opis` | `multi_line_text_field` |

---

## 6. URL ugovor

```
/collections/svi-prostori
  ?filter.p.product_type=Sala%C5%A1
  &filter.p.m.prostor.tipovi_proslava=Svadba
  &filter.p.m.prostor.kapacitet_opseg=100-150
  &filter.p.m.prostor.kvart=Petrovaradin
  &filter.v.price.gte=1500
  &filter.v.price.lte=4000
  &datum=2026-10-15
  &sort_by=price-ascending
```

- Sve pod `filter.*` obrađuje **Shopify server**.
- `datum` je **naš parametar** — Shopify ga ignoriše, čita ga JavaScript.
- `datum` putuje dalje kroz linkove kartica na profil prostora, gde popunjava formu za upit i obeležava dan u kalendaru.

Forma pretrage na početnoj je **običan GET form** čiji se `name` atributi zovu tačno kao gornji parametri, sa `action="/collections/svi-prostori"`. Zato je „broj gostiju" `<select>` sa opsezima a ne brojčano polje — mapira se direktno na `kapacitet_opseg`, bez prevođenja i bez JS-a.

---

## 7. Arhitektura teme

### 7.1 Novi i prepisani fajlovi

**`sections/`**

| Fajl | Šablon | Uloga |
|---|---|---|
| `hero-pretraga.liquid` | index | hero + glavna forma pretrage |
| `kategorije-proslava.liquid` | index | kartice tipova proslava → filtriran URL |
| `istaknuti-prostori.liquid` | index | 4 izdvojena prostora |
| `kako-radi.liquid` | index | tri koraka |
| `rezultati-prostora.liquid` | collection | sidebar filtera, grid, sortiranje, paginacija, čipovi |
| `prostor-zaglavlje.liquid` | product | galerija, naziv, kvart, ocena, kapacitet, cena, CTA |
| `prostor-detalji.liquid` | product | opis, sadržaji, hrana, muzika, mapa |
| `prostor-paketi.liquid` | product | paketi iz metaobjekata |
| `prostor-kalendar.liquid` | product | kalendar dostupnosti |
| `prostor-recenzije.liquid` | product | recenzije iz metaobjekata |
| `prostor-upit.liquid` | product | forma za upit |
| `poredjenje.liquid` | page.poredjenje | tabela poređenja |
| `header.liquid` | globalno | **prepis** — bez korpe, sa brojačem poređenja |
| `footer.liquid` | globalno | dorada |

**`snippets/`** — `kartica-prostora`, `zvezdice`, `filter-grupa`, `filter-cena`, `aktivni-filteri`, `ikonica`; postojeći `image`, `meta-tags`, `css-variables` (dorada).

**`templates/`** — prepisuju se `index.json`, `collection.json`, `product.json`; novi `page.poredjenje.json`; dorada `404.json`.

**`assets/`** — `critical.css` se prepisuje (dizajn tokeni, mreža, tipografija). Ostali CSS i JS idu kroz `{% stylesheet %}` i `{% javascript %}` po sekciji, kako `AGENTS.md` traži.

**`config/settings_schema.json`** — dodaju se tokeni brenda (akcenat, radijusi, senke).

**`scripts/`** — `setup-store.mjs`, `seed-podaci.json`, `.env.example`.

**Brišu se:** `sections/hello-world.liquid`, `sections/custom-section.liquid`, `sections/product.liquid` i `sections/collection.liquid` (zamenjuju ih `prostor-*` i `rezultati-prostora`).

**Ostaju netaknuti:** `sections/cart.liquid`, `blog.liquid`, `article.liquid`, `collections.liquid`, `password.liquid`, `page.liquid` — nisu u glavnom toku, ali se ne brišu da tema ostane ispravna ako se šablon slučajno otvori.

### 7.2 Gde živi JavaScript

Po `AGENTS.md`, JS ide u `{% javascript %}` tag odgovarajuće sekcije. Logika poređenja je izuzetak jer je potrebna na svakoj stranici (dugme na kartici, brojač u header-u, tabela) — živi u `{% javascript %}` tagu **header sekcije**, koja je ionako globalna.

---

## 8. Funkcionalnosti

### 8.1 Filtriranje

U dev store-u se instalira besplatna **Search & Discovery** aplikacija i u njoj se definišu filteri: `product_type`, `price` (nativni) plus `tipovi_proslava`, `kapacitet_opseg`, `sadrzaji`, `hrana_pice`, `muzika`, `kvart`.

Tema ih iscrtava generički kroz `collection.filters` — **nijedan naziv ni vrednost se ne hardkoduje**, pa dodavanje filtera u adminu ne dira kod:

```liquid
{% for filter in collection.filters %}
  {% case filter.type %}
    {% when 'price_range' %}
      {% render 'filter-cena', filter: filter %}
    {% else %}
      {% render 'filter-grupa', filter: filter %}
  {% endcase %}
{% endfor %}
```

Detalji:
- Uz svaki čekboks stoji `value.count`; vrednosti sa nulom se prigušuju.
- Aktivni filteri su uklonjivi čipovi preko `value.url_to_remove`.
- Broj rezultata se čita iz **`paginate.items`** — to je filtrirani broj; `collection.products_count` nije pouzdan za to.
- Prazno stanje nudi uklanjanje pojedinačnih filtera i „poništi sve" preko `collection.url`.

### 8.2 Filter po datumu (klijentski)

Svaka kartica nosi `data-zauzeti="2026-10-15,2026-11-02"` iz `zauzeti_datumi`. JS čita `?datum=`, prigušuje zauzete kartice i ispisuje poruku tipa „Prikazano 12 od 18 — 6 prostora je zauzeto 15.10.".

**Priznato ograničenje:** radi nad trenutnom stranicom rezultata. Sa 20 demo prostora i paginacijom po 24 to je ceo skup, ali na 500 prostora ne bi bilo tačno.

### 8.3 Poređenje

`localStorage` čuva do **4** handle-a. Header prikazuje brojač.

Pošto `/products/<handle>.js` ne vraća metafieldove, stranica poređenja u **Liquidu** ispisuje sve prostore sa svim poljima u jedan JSON blok, a JS bira one iz `localStorage`. Uvek sveži podaci, bez API poziva.

**Ograničenje:** Liquid `for` staje na 50 iteracija. Dovoljno za 20 prostora; preko 50 bi tražilo `paginate` ili Storefront API.

Tabela: lepljiva prva kolona, horizontalni skrol na mobilnom. Redovi — kapacitet, cena po osobi, kvart, tip, ocena, pa sadržaji / hrana / muzika kao ✓ i ✗. Prazno stanje vodi nazad na rezultate.

### 8.4 Kalendar dostupnosti

`zauzeti_datumi` idu u DOM kroz `| json`, JS iscrtava dva meseca unapred. Prošli dani zaključani, zauzeti precrtani, klik na slobodan dan upisuje datum u formu za upit i skroluje do nje. Bez biblioteke, oko osamdeset linija.

**Priznato ograničenje:** kalendar je ručno održavan metafield, ne sinhronizacija sa pravim rezervacijama. Prava sinhronizacija bi tražila zasebnu aplikaciju i bazu.

### 8.5 Recenzije

`prostor.ocena` je nativni `rating` tip, pa `.value.rating` i `.value.scale_max` daju zvezdice bez računanja.

```liquid
{% for r in product.metafields.prostor.recenzije.value %}
  {% render 'zvezdice', ocena: r.ocena.value %}
  <strong>{{ r.autor.value }}</strong> · {{ r.tip_proslave.value }}
  <time>{{ r.datum.value | date: '%d.%m.%Y.' }}</time>
  <p>{{ r.tekst.value }}</p>
{% endfor %}
```

Prve tri vidljive, ostale iza „Prikaži još". Ostavljanje recenzija nije u obimu — recenzije se unose kroz seed skriptu.

### 8.6 Forma za upit

`{% form 'contact' %}` sa poljima `contact[name]`, `contact[email]`, `contact[phone]`, `contact[Prostor]` (hidden, naziv prostora), `contact[Tip proslave]`, `contact[Datum]`, `contact[Broj gostiju]`, `contact[Poruka]`.

Shopify šalje mejl vlasniku store-a — nula infrastrukture. Uspeh preko `form.posted_successfully?`, greške preko `form.errors` uz `default_errors` filter. Polja se popunjavaju iz `?datum=` i iz konteksta prostora.

---

## 9. Jezik

Sajt je na srpskom, latinica.

`AGENTS.md` traži da se u locale fajlove dodaje samo engleski tekst. To se poštuje ovako:

- `locales/en.default.json` — ključevi i engleski tekst (izvor istine)
- `locales/sr.json` — srpski prevod
- `locales/en.default.schema.json` / `locales/sr.schema.json` — nazivi sekcija i podešavanja u theme editoru
- U adminu se srpski postavlja kao podrazumevani jezik store-a

**Nijedan korisnički vidljiv string se ne hardkoduje u Liquid.** Ključevi su hijerarhijski, najviše tri nivoa, `snake_case`.

---

## 10. Vizuelni pravac

Skeleton nema dizajn — `critical.css` je 2.4KB reseta.

Pravac: fotografija nosi stranicu, interfejs se sklanja. Topla neutralna podloga, jedan zasićen akcenat za CTA i aktivne filtere, karakterni font samo za naslove, sistemski stack za UI. Mobile-first, jer brief to izričito traži.

Konkretne odluke o tipografiji, paleti i ritmu donose se u fazi 2 kroz `frontend-design` skill.

---

## 11. Punjenje podacima

`scripts/setup-store.mjs` preko Admin GraphQL API-ja radi, idempotentno:

1. `metafieldDefinitionCreate` za svih 18 definicija
2. `metaobjectDefinitionCreate` za `recenzija` i `paket`
3. `collectionCreate` — automatska kolekcija „Svi prostori" po tagu `prostor`
4. `metaobjectCreate` za recenzije i pakete
5. `productSet` za 20 prostora sa svim metafieldovima i referencama

`scripts/seed-podaci.json` sadrži 20 prostora — šest kategorija, pravi kvartovi Novog Sada, po 3–5 recenzija i 2–3 paketa. Slike se dodaju kao spoljni URL-ovi (Unsplash), pa nema binarnih fajlova u repou.

Token dolazi iz custom app-a u dev store-u, čuva se u `.env` (gitignore-ovan), potrebni scope-ovi: `write_products`, `write_metaobject_definitions`, `write_metaobjects`, `write_publications`.

---

## 12. Faze isporuke

| # | Faza | Obrazloženje redosleda |
|---|---|---|
| 0 | Partner nalog, dev store, Shopify CLI, `git init`, Shopify AI Toolkit MCP | Ništa ne može pre ovoga |
| 1 | Setup skripta, seed, Search & Discovery, **verifikacija da filteri rade** | Podaci pre koda — tema se ne može ni pogledati bez prostora |
| 2 | Temelj: `theme.liquid`, dizajn tokeni, `critical.css`, header, footer, locales | Sve ostalo se oslanja na ovo |
| 3 | Rezultati i filteri | Najveći tehnički rizik — rešava se rano |
| 4 | Profil prostora, forma za upit | Drugi kraj glavnog toka |
| 5 | Kalendar i recenzije | Nadograđuju profil |
| 6 | Početna | **Namerno kasno** — forma mora da proizvodi URL-ove koje stranica rezultata već razume |
| 7 | Poređenje | Nezavisno od ostalog |
| 8 | Prazna stanja, 404, mobilni, `theme check`, brzina | Doterivanje |

---

## 13. Verifikacija

Za Liquid teme ne postoji smislen unit test, pa je verifikacija dvodelna.

**Automatski:** `shopify theme check` (`theme-check:recommended` je već podešen u `.theme-check.yml`) mora biti čist pre kraja svake faze.

**Ručno:** svaka faza ima pisanu smoke listu koja se izvršava na `shopify theme dev`. Primer za fazu 3:

- kombinacija dva filtera daje očekivan broj rezultata i on se slaže sa `paginate.items`
- `?datum=` prigušuje tačno one kartice koje imaju taj datum u `zauzeti_datumi`
- uklanjanje čipa vraća rezultate i menja URL
- prazno stanje se pojavljuje i „poništi sve" radi
- paginacija čuva aktivne filtere
- layout radi na 375px širine

Bez izvršene liste se ne kaže da je faza gotova.

---

## 14. Van obima

Sve ovo je u briefu, ali ne u ovom demou: blog i SEO vodiči, landing „dodaj svoj prostor", plaćanja i kapare, prava sinhronizacija kalendara, nalozi i panel za vlasnike prostora, ostavljanje recenzija od strane korisnika, povezivanje sa dodatnim uslugama (DJ, fotograf, dekoracija), GDPR i pravne strane, analitika, višejezičnost preko srpskog.

---

## 15. Rizici

| Rizik | Verovatnoća | Odgovor |
|---|---|---|
| Search & Discovery ne podržava neki tip metafielda kao filter | srednja | Proverava se u **fazi 1**, pre ijedne linije UI koda. Fallback: sve filtrabilno kao `list.single_line_text_field`, najsigurniji tip |
| Shopify AI Toolkit MCP nedostaje, a `AGENTS.md` ga traži | visoka (već je slučaj) | Instalira se u fazi 0 |
| Repo nije pod gitom | visoka (već je slučaj) | `git init` pre prvog fajla |
| Klijentsko filtriranje po datumu deluje kao da radi nad celim skupom | niska | Sa 20 prostora jeste ceo skup; ograničenje se izričito navodi na odbrani |
| Preko 50 prostora ruši tabelu poređenja | niska u demou | Poznata granica Liquid `for` petlje; dokumentovana |
