import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const rodziceRekordow = new Map([
  ['SZKOLENIE', [null]],
  ['SZCZEGOLY_ORGANIZACYJNE', ['SZKOLENIE']],
  ['GRUPA', ['SZKOLENIE']],
  ['DOKUMENT', [null, 'SZKOLENIE', 'GRUPA']],
  ['CHECKLISTA', [null, 'GRUPA']],
  ['PACZKA', ['CHECKLISTA']],
  ['POZYCJA_CHECKLISTY', ['PACZKA']],
  ['ZDJECIE', ['PACZKA']],
  ['WERSJA_DOKUMENTU', ['DOKUMENT', 'CHECKLISTA', 'SZCZEGOLY_ORGANIZACYJNE']],
  ['PAKIET_PDF', ['SZKOLENIE', 'GRUPA']],
  ['WYDRUK', ['DOKUMENT', 'CHECKLISTA', 'PACZKA', 'PAKIET_PDF']],
])
const identyfikatorBazy = 0x504f4d34
const wersjaSchematu = 1

export class BladZapisuRekordu extends Error {
  constructor(kod, komunikat) {
    super(komunikat)
    this.kod = kod
  }
}

function sprawdzId(id) {
  if (typeof id !== 'string' || !id.trim() || Buffer.byteLength(id) > 512 || id.includes('\0')) {
    throw new BladZapisuRekordu('NIEPRAWIDLOWE_ID', 'Nieprawidłowy identyfikator.')
  }
}

function sprawdzSciezke(sciezka) {
  if (!Array.isArray(sciezka) || !sciezka.length || sciezka.length > 6) {
    throw new BladZapisuRekordu('NIEPRAWIDLOWE_POWIAZANIE', 'Nieprawidłowa ścieżka rekordu.')
  }
  let rodzic = null
  for (const czesc of sciezka) {
    if (!czesc || !rodziceRekordow.get(czesc.rodzaj)?.includes(rodzic)) {
      throw new BladZapisuRekordu('NIEPRAWIDLOWE_POWIAZANIE', 'Nieprawidłowy rodzaj rekordu lub jego rodzica.')
    }
    sprawdzId(czesc.id)
    rodzic = czesc.rodzaj
  }
}

function kluczSciezki(sciezka) {
  return JSON.stringify(sciezka.map(({ rodzaj, id }) => [rodzaj, id]))
}

function uporzadkowanyJson(dane) {
  return JSON.stringify(dane, (_, wartosc) => {
    if (!wartosc || typeof wartosc !== 'object' || Array.isArray(wartosc)) return wartosc
    return Object.fromEntries(Object.keys(wartosc).sort().map((klucz) => [klucz, wartosc[klucz]]))
  })
}

// Adapter trwałości. Wywołujący przekazuje tożsamość po sprawdzeniu sesji i uprawnień.
export function otworzMagazynWspolnychDanych(sciezkaBazy) {
  const baza = new DatabaseSync(sciezkaBazy)
  try {
    baza.exec('PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON; BEGIN IMMEDIATE;')
    const { application_id: identyfikator } = baza.prepare('PRAGMA application_id').get()
    const { user_version: wersja } = baza.prepare('PRAGMA user_version').get()
    const nowaBaza = identyfikator === 0 && wersja === 0 && !baza.prepare("SELECT 1 FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' LIMIT 1").get()
    if (!nowaBaza && (identyfikator !== identyfikatorBazy || wersja !== wersjaSchematu)) {
      throw new BladZapisuRekordu('NIEZGODNA_BAZA', 'Wskaż pustą bazę lub zgodną bazę wspólnych danych.')
    }
    baza.exec(`
      CREATE TABLE IF NOT EXISTS rekordy (
        klucz TEXT PRIMARY KEY NOT NULL,
        rodzaj TEXT NOT NULL,
        id TEXT NOT NULL,
        rodzic TEXT REFERENCES rekordy(klucz),
        wersja INTEGER NOT NULL CHECK(wersja > 0),
        dane TEXT NOT NULL CHECK(json_valid(dane))
      ) STRICT;
      CREATE INDEX IF NOT EXISTS rekordy_rodzic ON rekordy(rodzic);
      CREATE UNIQUE INDEX IF NOT EXISTS rekordy_dokument_id ON rekordy(id)
        WHERE rodzaj IN ('DOKUMENT', 'CHECKLISTA', 'SZCZEGOLY_ORGANIZACYJNE');
      CREATE TABLE IF NOT EXISTS historia (
        klucz TEXT NOT NULL REFERENCES rekordy(klucz),
        wersja INTEGER NOT NULL,
        wersja_bazowa INTEGER NOT NULL,
        aktor_id TEXT NOT NULL,
        operacja_id TEXT NOT NULL,
        czas TEXT NOT NULL,
        dane TEXT NOT NULL CHECK(json_valid(dane)),
        PRIMARY KEY (klucz, wersja)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS ponowienia (
        aktor_id TEXT NOT NULL,
        operacja_id TEXT NOT NULL,
        skrot TEXT NOT NULL,
        wynik TEXT NOT NULL CHECK(json_valid(wynik)),
        PRIMARY KEY (aktor_id, operacja_id)
      ) STRICT;
      PRAGMA application_id = ${identyfikatorBazy};
      PRAGMA user_version = ${wersjaSchematu};
      COMMIT;
      PRAGMA journal_mode = WAL;
    `)

    const odczytaj = baza.prepare('SELECT wersja, dane FROM rekordy WHERE klucz = ?')
    const odczytajHistorie = baza.prepare('SELECT wersja, wersja_bazowa AS wersjaBazowa, aktor_id AS aktorId, operacja_id AS operacjaId, czas, dane FROM historia WHERE klucz = ? ORDER BY wersja')
    const odczytajPonowienie = baza.prepare('SELECT skrot, wynik FROM ponowienia WHERE aktor_id = ? AND operacja_id = ?')
    const odczytajKluczDokumentu = baza.prepare("SELECT klucz FROM rekordy WHERE id = ? AND rodzaj IN ('DOKUMENT', 'CHECKLISTA', 'SZCZEGOLY_ORGANIZACYJNE')")
    const utworz = baza.prepare('INSERT INTO rekordy (klucz, rodzaj, id, rodzic, wersja, dane) VALUES (?, ?, ?, ?, ?, ?)')
    const aktualizuj = baza.prepare('UPDATE rekordy SET wersja = ?, dane = ? WHERE klucz = ?')
    const zapiszHistorie = baza.prepare('INSERT INTO historia VALUES (?, ?, ?, ?, ?, ?, ?)')
    const zapiszPonowienie = baza.prepare('INSERT INTO ponowienia VALUES (?, ?, ?, ?)')
    const odczytajDane = (rekord) => ({ ...rekord, dane: JSON.parse(rekord.dane) })

    return {
      zamknij: () => baza.close(),
      pobierz(sciezka) {
        sprawdzSciezke(sciezka)
        const rekord = odczytaj.get(kluczSciezki(sciezka))
        return rekord ? odczytajDane(rekord) : null
      },
      pobierzHistorie(sciezka) {
        sprawdzSciezke(sciezka)
        return odczytajHistorie.all(kluczSciezki(sciezka)).map(odczytajDane)
      },
      zapiszPartie({ aktorId, operacjaId, zmiany }) {
        sprawdzId(aktorId)
        sprawdzId(operacjaId)
        if (!Array.isArray(zmiany) || !zmiany.length || zmiany.length > 1000) {
          throw new BladZapisuRekordu('NIEPRAWIDLOWA_PARTIA', 'Partia musi zawierać od 1 do 1000 zmian.')
        }
        const klucze = new Set()
        const wpisy = zmiany.map(({ sciezka, wersjaBazowa, dane }) => {
          sprawdzSciezke(sciezka)
          const klucz = kluczSciezki(sciezka)
          if (klucze.has(klucz) || !Number.isSafeInteger(wersjaBazowa) || wersjaBazowa < 0
            || !dane || typeof dane !== 'object' || Array.isArray(dane)) {
            throw new BladZapisuRekordu('NIEPRAWIDLOWA_ZMIANA', 'Zmiana wymaga unikalnego rekordu, wersji bazowej i danych.')
          }
          klucze.add(klucz)
          return { klucz, sciezka, wersjaBazowa, dane: uporzadkowanyJson(dane) }
        })
        const skrot = createHash('sha256').update(uporzadkowanyJson(wpisy)).digest('hex')
        baza.exec('BEGIN IMMEDIATE')
        try {
          const ponowienie = odczytajPonowienie.get(aktorId, operacjaId)
          if (ponowienie && ponowienie.skrot !== skrot) {
            throw new BladZapisuRekordu('KONFLIKT_OPERACJI', 'Identyfikator operacji został już użyty z innymi danymi.')
          }
          if (ponowienie) {
            const wynik = JSON.parse(ponowienie.wynik)
            baza.exec('COMMIT')
            return wynik
          }

          const czas = new Date().toISOString()
          const wynik = wpisy.map(({ klucz, sciezka, wersjaBazowa, dane }) => {
            const aktualnaWersja = odczytaj.get(klucz)?.wersja ?? 0
            if (aktualnaWersja !== wersjaBazowa) {
              throw new BladZapisuRekordu('KONFLIKT_WERSJI', 'Rekord zmienił się od czasu odczytu. Odśwież dane i porównaj zmiany.')
            }
            const wersja = wersjaBazowa + 1
            const { id, rodzaj } = sciezka.at(-1)
            if (wersjaBazowa === 0) {
              const rodzic = sciezka.length > 1 ? kluczSciezki(sciezka.slice(0, -1)) : null
              if (rodzic && !odczytaj.get(rodzic)) {
                throw new BladZapisuRekordu('BRAK_RODZICA', 'Zapisz powiązany rekord nadrzędny przed rekordem podrzędnym.')
              }
              if (['DOKUMENT', 'CHECKLISTA', 'SZCZEGOLY_ORGANIZACYJNE'].includes(rodzaj) && odczytajKluczDokumentu.get(id)) {
                throw new BladZapisuRekordu('KONFLIKT_ID', 'Dokument o tym identyfikatorze już istnieje.')
              }
              utworz.run(klucz, rodzaj, id, rodzic, wersja, dane)
            } else {
              aktualizuj.run(wersja, dane, klucz)
            }
            zapiszHistorie.run(klucz, wersja, wersjaBazowa, aktorId, operacjaId, czas, dane)
            return { sciezka, wersja }
          })
          zapiszPonowienie.run(aktorId, operacjaId, skrot, JSON.stringify(wynik))
          baza.exec('COMMIT')
          return wynik
        } catch (blad) {
          baza.exec('ROLLBACK')
          throw blad
        }
      },
    }
  } catch (blad) {
    baza.close()
    throw blad
  }
}
