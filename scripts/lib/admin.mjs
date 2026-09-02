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
