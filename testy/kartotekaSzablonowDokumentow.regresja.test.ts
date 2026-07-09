import assert from 'node:assert/strict'
import { utworzDokumentZTekstu } from '../src/wspolne/dokumenty/utworzDokumentZTekstu.ts'
import type { ElementDokumentu } from '../src/wspolne/dokumenty/typyDokumentu.ts'
import { utworzSzablonRoboczyZDokumentu } from '../src/moduly/dokumenty/replikator_dokumentow/parserDocxReplikatora.ts'
import {
  klasyfikujStatusSzablonu,
  pobierzSzablonyDokumentowZKartoteki,
  utworzNazweSzablonuZDopiskiem,
  wykryjKonfliktNazwySzablonu,
  zapiszNowaWersjeSzablonu,
  zapiszNowySzablonZReplikatora,
} from '../src/kartoteki/szablony_dokumentow/magazynSzablonowDokumentow.ts'

function sprawdz(nazwa: string, testRegresji: () => void) {
  wyczyscMagazyn()
  testRegresji()
  console.log(`OK: ${nazwa}`)
}

function wyczyscMagazyn() {
  const dane = new Map<string, string>()

  globalThis.localStorage = {
    getItem: (klucz: string) => dane.get(klucz) ?? null,
    setItem: (klucz: string, wartosc: string) => {
      dane.set(klucz, wartosc)
    },
    removeItem: (klucz: string) => {
      dane.delete(klucz)
    },
    clear: () => {
      dane.clear()
    },
    key: (indeks: number) => Array.from(dane.keys())[indeks] ?? null,
    get length() {
      return dane.size
    },
  }
}

function utworzSzablonRoboczy(nazwa = 'Program bezpieczeństwa') {
  const dokument = utworzDokumentZTekstu(nazwa, 'Program szkolenia\n1. Wprowadzenie\n2. Warsztat')

  return {
    dokument,
    szablonRoboczy: utworzSzablonRoboczyZDokumentu(dokument, 'DOCX', 'Opiekun'),
  }
}

function utworzSzablonZElementemNieobslugiwanym() {
  const dokument = utworzDokumentZTekstu('Lista kontrolna', 'Treść')
  const checkbox: ElementDokumentu = {
    id: 'checkbox-kartoteki',
    rodzaj: 'checkbox',
    status: 'niepewny',
    tryb: 'drukowany',
    wartosc: true,
    pozycja: {
      x: 10,
      y: 10,
      szerokosc: 5,
      wysokosc: 5,
    },
  }
  const dokumentZCheckboxem = {
    ...dokument,
    strony: [
      {
        ...dokument.strony[0],
        elementy: [...dokument.strony[0].elementy, checkbox],
      },
    ],
  }

  return {
    dokument: dokumentZCheckboxem,
    szablonRoboczy: utworzSzablonRoboczyZDokumentu(dokumentZCheckboxem, 'DOCX', 'Opiekun'),
  }
}

sprawdz('tworzenie szablonu zapisuje DokumentBlokowy jako źródło prawdy', () => {
  const { dokument, szablonRoboczy } = utworzSzablonRoboczy()
  const szablon = zapiszNowySzablonZReplikatora(szablonRoboczy, dokument, 'Opiekun')
  const zapisaneSzablony = pobierzSzablonyDokumentowZKartoteki()

  assert.equal(zapisaneSzablony.length, 1)
  assert.equal(szablon.dokumentBlokowy.id, szablonRoboczy.dokumentBlokowy.id)
  assert.ok(szablon.dokumentBlokowy.struktura.length > 0)
  assert.equal(szablon.status, 'Roboczy')
})

sprawdz('wykrywanie konfliktu nazwy znajduje istniejący szablon', () => {
  const { dokument, szablonRoboczy } = utworzSzablonRoboczy()
  const szablon = zapiszNowySzablonZReplikatora(szablonRoboczy, dokument, 'Opiekun')
  const konflikt = wykryjKonfliktNazwySzablonu('program bezpieczeństwa', pobierzSzablonyDokumentowZKartoteki())

  assert.equal(konflikt?.id, szablon.id)
})

sprawdz('tworzenie nazwy z dopiskiem używa pierwszego wolnego numeru', () => {
  const { dokument, szablonRoboczy } = utworzSzablonRoboczy()

  zapiszNowySzablonZReplikatora(szablonRoboczy, dokument, 'Opiekun', 'Program bezpieczeństwa')
  zapiszNowySzablonZReplikatora(szablonRoboczy, dokument, 'Opiekun', 'Program bezpieczeństwa (1)')

  assert.equal(utworzNazweSzablonuZDopiskiem('Program bezpieczeństwa', pobierzSzablonyDokumentowZKartoteki()), 'Program bezpieczeństwa (2)')
})

sprawdz('klasyfikacja statusu zachowuje Roboczy Aktywny Archiwalny', () => {
  assert.equal(klasyfikujStatusSzablonu({ status: 'Roboczy' }), 'Roboczy')
  assert.equal(klasyfikujStatusSzablonu({ status: 'Aktywny' }), 'Aktywny')
  assert.equal(klasyfikujStatusSzablonu({ status: 'Archiwalny' }), 'Archiwalny')
})

sprawdz('zapis nowej wersji tworzy niemodyfikowalny wpis historii wersji', () => {
  const { dokument, szablonRoboczy } = utworzSzablonRoboczy()
  const szablon = zapiszNowySzablonZReplikatora(szablonRoboczy, dokument, 'Opiekun')
  const nowaWersja = zapiszNowaWersjeSzablonu(szablon.id, szablonRoboczy, dokument, 'Opiekun')
  const ostatniaWersja = nowaWersja.historiaWersji.at(-1)

  assert.equal(nowaWersja.wersja, 2)
  assert.equal(nowaWersja.historiaWersji.length, 2)
  assert.equal(Object.isFrozen(ostatniaWersja), true)
})

sprawdz('elementy nieobsługiwane nie znikają po zapisie do kartoteki', () => {
  const { dokument, szablonRoboczy } = utworzSzablonZElementemNieobslugiwanym()
  const szablon = zapiszNowySzablonZReplikatora(szablonRoboczy, dokument, 'Opiekun')

  assert.ok(szablon.elementyNieobslugiwane.length > 0)
  assert.ok(szablon.dokumentBlokowy.struktura.some((blok) => blok.typ === 'ElementNieobslugiwany'))
})
