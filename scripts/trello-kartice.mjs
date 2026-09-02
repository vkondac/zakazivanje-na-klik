/**
 * Pravi Trello kartice za sve sto ostaje kad dev store postoji.
 * Sadrzaj je u trello-kartice.json, izveden iz docs/PREUZIMANJE.md.
 *
 * Dva nacina:
 *
 *   npm run trello -- --paste     Ispise nazive po listi. Nalepi blok u
 *                                 "Add a card" i Trello napravi po jednu
 *                                 karticu za svaki red. Bez ikakvog kljuca,
 *                                 ali bez opisa i cek-listi. Radi samo u web
 *                                 verziji Trella, ne u mobilnoj aplikaciji.
 *
 *   npm run trello                Pravi kartice preko API-ja, sa opisima i
 *                                 cek-listama. Trazi TRELLO_KEY, TRELLO_TOKEN
 *                                 i TRELLO_BOARD u .env.
 *
 * Idempotentno po nazivu kartice: kartica koja vec postoji u listi se
 * preskace, pa se skripta moze pokrenuti vise puta.
 */
import { readFileSync } from 'node:fs';

const OSNOVA = 'https://api.trello.com/1';

const { liste, kartice } = JSON.parse(
  readFileSync(new URL('./trello-kartice.json', import.meta.url), 'utf8')
);

/* ---------- Rezim bez kljuca ---------- */

function ispisiZaLepljenje() {
  console.log('Nalepi svaki blok u "Add a card" odgovarajuce liste.');
  console.log('Trello ce ponuditi da napravi po jednu karticu za svaki red.\n');

  for (const lista of liste) {
    const naslovi = kartice.filter((k) => k.lista === lista).map((k) => k.naziv);
    console.log(`\n=== ${lista} (${naslovi.length}) ${'='.repeat(Math.max(0, 46 - lista.length))}\n`);
    console.log(naslovi.join('\n'));
  }

  console.log('\n\nOpisi i cek-liste se ovako ne prenose. Za njih koristi `npm run trello`.');
}

/* ---------- Rezim sa API-jem ---------- */

function napraviKlijenta({ kljuc, token, fetchFn = fetch }) {
  if (!kljuc) throw new Error('Nedostaje TRELLO_KEY u .env');
  if (!token) throw new Error('Nedostaje TRELLO_TOKEN u .env');

  return async function pozovi(metod, putanja, parametri = {}) {
    const upit = new URLSearchParams({ ...parametri, key: kljuc, token });
    const odgovor = await fetchFn(`${OSNOVA}${putanja}?${upit}`, { method: metod });

    if (!odgovor.ok) {
      const telo = await odgovor.text();
      throw new Error(`Trello ${metod} ${putanja} -> HTTP ${odgovor.status}: ${telo.slice(0, 300)}`);
    }

    return odgovor.json();
  };
}

async function osigurajListu(pozovi, idTable, naziv, postojece) {
  const nadjena = postojece.find((l) => l.name === naziv);
  if (nadjena) {
    console.log(`  = lista "${naziv}"`);
    return nadjena.id;
  }
  const nova = await pozovi('POST', '/lists', { name: naziv, idBoard: idTable, pos: 'bottom' });
  console.log(`  + lista "${naziv}"`);
  return nova.id;
}

async function dodajCekListu(pozovi, idKartice, stavke) {
  if (stavke.length === 0) return;
  const cekLista = await pozovi('POST', '/checklists', { idCard: idKartice, name: 'Provere' });
  for (const stavka of stavke) {
    await pozovi('POST', `/checklists/${cekLista.id}/checkItems`, { name: stavka, checked: 'false' });
  }
}

async function glavno() {
  const idTable = process.env.TRELLO_BOARD;
  if (!idTable) {
    throw new Error(
      'Nedostaje TRELLO_BOARD u .env.\n' +
      'To je deo iz URL-a table: https://trello.com/b/OVO/naziv-table'
    );
  }

  const pozovi = napraviKlijenta({
    kljuc: process.env.TRELLO_KEY,
    token: process.env.TRELLO_TOKEN,
  });

  const tabla = await pozovi('GET', `/boards/${idTable}`, { fields: 'name' });
  console.log(`Tabla: ${tabla.name}\n`);

  const postojeceListe = await pozovi('GET', `/boards/${idTable}/lists`, { fields: 'name' });

  const idPoNazivu = {};
  for (const naziv of liste) {
    idPoNazivu[naziv] = await osigurajListu(pozovi, idTable, naziv, postojeceListe);
  }

  console.log('');

  let napravljeno = 0;
  let presko = 0;

  for (const naziv of liste) {
    const idListe = idPoNazivu[naziv];
    const uListi = await pozovi('GET', `/lists/${idListe}/cards`, { fields: 'name' });
    const imena = new Set(uListi.map((k) => k.name));

    for (const kartica of kartice.filter((k) => k.lista === naziv)) {
      if (imena.has(kartica.naziv)) {
        console.log(`  = ${kartica.naziv}`);
        presko += 1;
        continue;
      }

      const nova = await pozovi('POST', '/cards', {
        idList: idListe,
        name: kartica.naziv,
        desc: kartica.opis ?? '',
        pos: 'bottom',
      });

      await dodajCekListu(pozovi, nova.id, kartica.checklist ?? []);
      console.log(`  + ${kartica.naziv}`);
      napravljeno += 1;
    }
  }

  console.log(`\nGotovo. Napravljeno ${napravljeno}, vec postojalo ${presko}.`);
}

if (process.argv.includes('--paste')) {
  ispisiZaLepljenje();
} else if (process.argv[1] === import.meta.filename) {
  glavno().catch((greska) => {
    console.error(`\nPUKLO: ${greska.message}`);
    process.exit(1);
  });
}

export { napraviKlijenta, liste, kartice };
