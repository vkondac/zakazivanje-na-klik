# Proslava na klik

Shopify store za pronalaženje prostora za proslave u Novom Sadu.
Fakultetski projekat, demo podaci.

Korisnik bira tip proslave, datum, broj gostiju i budžet, dobija filtriranu
listu prostora, poredi ih i šalje upit za termin.

## Pokretanje

```bash
npm install -g @shopify/cli@latest
cp .env.example .env      # upiši domen dev store-a i Admin API token
npm run setup             # metafield i metaobject definicije, kolekcija
npm run seed              # 20 demo prostora sa recenzijama i paketima
shopify theme dev --store <domen>
```

Obe skripte su idempotentne — mogu se pokretati koliko god puta.

## Provere

```bash
npm test                  # node --test nad scripts/
shopify theme check       # statička analiza Liquida
```

## Kako je složeno

Prostor je Shopify **proizvod** sa metafieldovima u namespace-u `prostor`.
Fasetno filtriranje radi besplatna **Search & Discovery** aplikacija, a tema je
iscrtava generički kroz `collection.filters` — nijedan naziv filtera ni vrednost
nije hardkodovan, pa dodavanje filtera u adminu ne dira kod.

Recenzije i paketi su **metaobjekti**, ne JSON u jednom polju.

Postoji tačno jedna kolekcija, `svi-prostori`, automatska po tagu `prostor`.
Stanje pretrage živi u URL-u, pa je deljivo linkom i preživljava refresh.

## Dokumentacija

- Tehnički dizajn: `docs/superpowers/specs/2026-09-01-proslava-na-klik-design.md`
- Plan implementacije: `docs/superpowers/plans/2026-09-01-proslava-na-klik.md`

## Poznata ograničenja

Ovo su svesne odluke, ne propusti — vredi ih izgovoriti na odbrani.

- **Filter po datumu i sortiranje po oceni rade nad trenutnom stranicom rezultata.**
  Liquid ne može da čita query string, a Shopify filteri ne rade nad kalendarom.
  Sa 20 prostora to je ceo skup; na 500 ne bi bilo tačno.
- **Kalendar dostupnosti je ručno održavan metafield**, ne sistem rezervacija u
  realnom vremenu. Prava sinhronizacija bi tražila zasebnu aplikaciju i bazu.
- **Tabela poređenja učitava do 50 prostora** — granica Liquid `for` petlje.
- **Prostor je modelovan kao proizvod.** Semantički nategnuto, ali je to cena za
  fasetno filtriranje koje se time dobija besplatno.

## Van obima

Blog i SEO vodiči, „dodaj svoj prostor“, plaćanja i kapare, nalozi vlasnika
prostora, ostavljanje recenzija od strane korisnika, GDPR i analitika.
