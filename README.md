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

