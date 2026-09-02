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
 * Podrazumevano pravi tri svoje liste. Ako tabla vec ima svoj tok rada
 * (To Do / Doing / Done), bolje je sve kartice staviti u jednu postojecu
 * listu a grupisanje preneti na etikete:
 *
 *   npm run trello -- --lista "To Do"
 *
 * Idempotentno po nazivu kartice: kartica koja vec postoji u listi se
 * preskace, pa se skripta moze pokrenuti vise puta.
 *
 * Dodaj --sync da se postojecim karticama azurira opis iz JSON-a. Bez toga
 * se ispravka teksta nikad ne prenese na tablu, jer se kartica preskace.
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

async function osigurajEtiketu(pozovi, idTable, naziv, boja, postojece) {
  const nadjena = postojece.find((e) => e.name === naziv);
  if (nadjena) return nadjena.id;
  const nova = await pozovi('POST', '/labels', { name: naziv, color: boja, idBoard: idTable });
  console.log(`  + etiketa "${naziv}"`);
  postojece.push(nova);
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

  /* TRELLO_BOARD je kratki link iz URL-a. Radi za GET /boards, ali ga
     POST /labels i POST /lists odbijaju sa "Invalid id" - njima treba pun
     24-znakovni ID, koji GET vraca. */
  const tabla = await pozovi('GET', `/boards/${idTable}`, { fields: 'name' });
  const idPuni = tabla.id;
  console.log(`Tabla: ${tabla.name}\n`);

  const postojeceListe = await pozovi('GET', `/boards/${idPuni}/lists`, { fields: 'name' });

  /* Ako je zadata postojeca lista, sve ide u nju a grupisanje nose etikete.
     Tako se ne narusava tok rada table koja vec ima svoje liste. */
  const zadataIndeks = process.argv.indexOf('--lista');
  const zadata = zadataIndeks === -1 ? null : process.argv[zadataIndeks + 1];

  const BOJE = { 0: 'sky', 1: 'green', 2: 'red' };
  const idPoNazivu = {};
  const idEtikete = {};

  if (zadata) {
    const ciljna = postojeceListe.find((l) => l.name === zadata);
    if (!ciljna) {
      throw new Error(
        `Lista "${zadata}" ne postoji na tabli. Dostupne: ${postojeceListe.map((l) => l.name).join(', ')}`
      );
    }
    console.log(`  = sve kartice u listu "${zadata}", grupisanje kroz etikete`);

    const postojeceEtikete = await pozovi('GET', `/boards/${idPuni}/labels`, { fields: 'name,color' });
    for (const [redni, naziv] of liste.entries()) {
      idPoNazivu[naziv] = ciljna.id;
      idEtikete[naziv] = await osigurajEtiketu(pozovi, idPuni, naziv, BOJE[redni] ?? 'purple', postojeceEtikete);
    }
  } else {
    for (const naziv of liste) {
      idPoNazivu[naziv] = await osigurajListu(pozovi, idPuni, naziv, postojeceListe);
    }
  }

  console.log('');

  /* Provera postojanja ide nad CELOM tablom, ne nad ciljnom listom.
     Kartica se u kanban toku legitimno premesti iz To Do u Doing ili QA;
     provera po jednoj listi je tada ne nalazi i pravi duplikat. */
  const sveNaTabli = await pozovi('GET', `/boards/${idPuni}/cards`, {
    fields: 'name,idList',
    filter: 'open',
  });
  const idPoImenu = new Map(sveNaTabli.map((k) => [k.name, k.id]));
  const listaPoImenu = new Map(sveNaTabli.map((k) => [k.name, k.idList]));
  const imeListe = new Map(postojeceListe.map((l) => [l.id, l.name]));

  const sinhronizuj = process.argv.includes('--sync');
  let napravljeno = 0;
  let presko = 0;
  let azurirano = 0;

  for (const naziv of liste) {
    const idListe = idPoNazivu[naziv];

    for (const kartica of kartice.filter((k) => k.lista === naziv)) {
      const postojeci = idPoImenu.get(kartica.naziv);

      if (postojeci) {
        const gde = imeListe.get(listaPoImenu.get(kartica.naziv)) ?? '?';
        if (sinhronizuj) {
          await pozovi('PUT', `/cards/${postojeci}`, { desc: kartica.opis ?? '' });
          console.log(`  ~ ${kartica.naziv}  (u "${gde}")`);
          azurirano += 1;
        } else {
          console.log(`  = ${kartica.naziv}  (u "${gde}")`);
          presko += 1;
        }
        continue;
      }

      const parametri = {
        idList: idListe,
        name: kartica.naziv,
        desc: kartica.opis ?? '',
        pos: 'bottom',
      };
      if (idEtikete[naziv]) parametri.idLabels = idEtikete[naziv];

      const nova = await pozovi('POST', '/cards', parametri);
      idPoImenu.set(kartica.naziv, nova.id);
      listaPoImenu.set(kartica.naziv, idListe);

      await dodajCekListu(pozovi, nova.id, kartica.checklist ?? []);
      console.log(`  + [${naziv}] ${kartica.naziv}`);
      napravljeno += 1;
    }
  }

  console.log(`\nGotovo. Napravljeno ${napravljeno}, azurirano ${azurirano}, preskoceno ${presko}.`);
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
