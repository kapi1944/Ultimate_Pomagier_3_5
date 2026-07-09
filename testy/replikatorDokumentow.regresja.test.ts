import assert from 'node:assert/strict'
import { utworzDokumentZTekstu } from '../src/wspolne/dokumenty/utworzDokumentZTekstu.ts'
import { klasyfikujPoziomZgodnosci, pobierzBlokiReplikatora, utworzRaportReplikacji } from '../src/moduly/dokumenty/replikator_dokumentow/raportReplikacji.ts'
import {
  aktualizujDokumentBlokowyTekstem,
  utworzDokumentBlokowyZDokumentuPomagiera,
  utworzSzablonRoboczyZDokumentu,
  zatwierdzNiskaZgodnoscSzablonu,
  zsynchronizujDokumentPomagieraZDokumentemBlokowym,
} from '../src/moduly/dokumenty/replikator_dokumentow/parserDocxReplikatora.ts'
import { wydobadzTekstPdfOstroznie } from '../src/moduly/dokumenty/replikator_dokumentow/parserPdfReplikatora.ts'
import { wykryjPlaceholderyReplikatora } from '../src/moduly/dokumenty/replikator_dokumentow/placeholderyReplikatora.ts'
import type { DokumentPomagiera, ElementDokumentu } from '../src/wspolne/dokumenty/typyDokumentu.ts'

function sprawdz(nazwa: string, testRegresji: () => void) {
  testRegresji()
  console.log(`OK: ${nazwa}`)
}

sprawdz('klasyfikacja poziomu zgodności zachowuje progi akceptacji', () => {
  assert.equal(klasyfikujPoziomZgodnosci(100), 'bardzo_dobra_zgodnosc')
  assert.equal(klasyfikujPoziomZgodnosci(95), 'bardzo_dobra_zgodnosc')
  assert.equal(klasyfikujPoziomZgodnosci(94), 'dobra_zgodnosc')
  assert.equal(klasyfikujPoziomZgodnosci(81), 'dobra_zgodnosc')
  assert.equal(klasyfikujPoziomZgodnosci(80), 'wymaga_sprawdzenia')
  assert.equal(klasyfikujPoziomZgodnosci(71), 'wymaga_sprawdzenia')
  assert.equal(klasyfikujPoziomZgodnosci(70), 'tylko_wersja_robocza')
})

function utworzDokumentZCheckboxem(): DokumentPomagiera {
  const dokument = utworzDokumentZTekstu('Checkbox', 'Treść')
  const checkbox: ElementDokumentu = {
    id: 'checkbox-testowy',
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

  return {
    ...dokument,
    strony: [
      {
        ...dokument.strony[0],
        elementy: [...dokument.strony[0].elementy, checkbox],
      },
    ],
  }
}

sprawdz('konwersja prostego dokumentu tekstowego tworzy DokumentBlokowy', () => {
  const dokument = utworzDokumentZTekstu('Program szkolenia', 'Program szkolenia\n1. Wstęp\nData: 2026-07-15')
  const dokumentBlokowy = utworzDokumentBlokowyZDokumentuPomagiera(dokument)

  assert.equal(dokumentBlokowy.metadane.zrodlo, 'import')
  assert.ok(dokumentBlokowy.struktura.length >= 3)
  assert.ok(dokumentBlokowy.struktura.some((blok) => blok.typ === 'Tytul'))
  assert.ok(dokumentBlokowy.struktura.some((blok) => blok.typ === 'Punkt'))
})

sprawdz('wykrywanie placeholderów proponuje pola do zatwierdzenia', () => {
  const dokument = utworzDokumentZTekstu('Dane szkolenia', 'Szkolenie: Komunikacja\nData: 2026-07-15\nKlient: ACME')
  const dokumentBlokowy = utworzDokumentBlokowyZDokumentuPomagiera(dokument)
  const placeholdery = wykryjPlaceholderyReplikatora(dokumentBlokowy)

  assert.ok(placeholdery.some((placeholder) => placeholder.nazwa === 'szkolenie.tytul'))
  assert.ok(placeholdery.some((placeholder) => placeholder.rodzaj === 'data'))
  assert.ok(placeholdery.every((placeholder) => placeholder.status === 'propozycja'))
})

sprawdz('raport replikacji opisuje elementy odtworzone i ograniczenia', () => {
  const dokument = utworzDokumentZTekstu('Raport', 'Program szkolenia\n1. Wstęp')
  const dokumentBlokowy = utworzDokumentBlokowyZDokumentuPomagiera(dokument)
  const raport = utworzRaportReplikacji(dokumentBlokowy, 'DOCX', ['kształty złożone wymagają kontroli'])

  assert.ok(raport.odtworzono.length > 0)
  assert.ok(raport.nieOdtworzono.includes('kształty złożone wymagają kontroli'))
  assert.ok(raport.procentZgodnosci <= 99)
})

sprawdz('element nieobsługiwany nie jest usuwany po cichu', () => {
  const dokumentZCheckboxem = utworzDokumentZCheckboxem()
  const dokumentBlokowy = utworzDokumentBlokowyZDokumentuPomagiera(dokumentZCheckboxem)
  const bloki = pobierzBlokiReplikatora(dokumentBlokowy)

  assert.ok(bloki.some((blok) => blok.typ === 'ElementNieobslugiwany' && blok.tresc === 'checkbox'))
})

sprawdz('ręczne zatwierdzenie niskiej zgodności wymaga komentarza', () => {
  const szablon = utworzSzablonRoboczyZDokumentu(utworzDokumentZCheckboxem(), 'DOCX', 'Opiekun')

  assert.throws(() => zatwierdzNiskaZgodnoscSzablonu({ ...szablon, procentZgodnosci: 70 }, '   ', 'Opiekun'), /Komentarz jest wymagany/)
})

sprawdz('ręczne zatwierdzenie niskiej zgodności zapisuje decyzję w historii', () => {
  const szablon = utworzSzablonRoboczyZDokumentu(utworzDokumentZCheckboxem(), 'DOCX', 'Opiekun')
  const szablonZNiskaZgodnoscia = { ...szablon, procentZgodnosci: 70 }
  const liczbaProblemow = szablonZNiskaZgodnoscia.raportImportu.problemyJakosci.length
  const zatwierdzony = zatwierdzNiskaZgodnoscSzablonu(szablonZNiskaZgodnoscia, 'Sprawdzono ręcznie checkbox.', 'Opiekun', '2026-07-09T10:00:00.000Z')
  const decyzja = zatwierdzony.historiaDecyzji.at(-1)

  assert.equal(zatwierdzony.dokumentBlokowy.metadane.zatwierdzonyPrzezUzytkownika, true)
  assert.equal(decyzja?.typ, 'niska_zgodnosc')
  assert.equal(decyzja?.uzytkownik, 'Opiekun')
  assert.equal(decyzja?.data, '2026-07-09T10:00:00.000Z')
  assert.equal(decyzja?.poprzedniWynikZgodnosci, 70)
  assert.equal(decyzja?.komentarz, 'Sprawdzono ręcznie checkbox.')
  assert.equal(zatwierdzony.raportImportu.problemyJakosci.length, liczbaProblemow)
  assert.ok(zatwierdzony.elementyNieobslugiwane.length > 0)
})

sprawdz('zmiany w DokumentBlokowy wracają do warstwy DokumentPomagiera', () => {
  const dokument = utworzDokumentZTekstu('Synchronizacja', 'Program szkolenia')
  const dokumentBlokowy = utworzDokumentBlokowyZDokumentuPomagiera(dokument)
  const pierwszyElement = dokument.strony[0].elementy[0]
  const dokumentPoZmianie = aktualizujDokumentBlokowyTekstem(dokumentBlokowy, pierwszyElement.id, 'Program po korekcie')
  const dokumentPodgladu = zsynchronizujDokumentPomagieraZDokumentemBlokowym(dokument, dokumentPoZmianie)
  const elementPoSynchronizacji = dokumentPodgladu.strony[0].elementy[0]

  assert.equal(elementPoSynchronizacji.rodzaj === 'tekst' ? elementPoSynchronizacji.tekst : '', 'Program po korekcie')
})

sprawdz('parser PDF wydobywa tylko jawną warstwę tekstową', () => {
  const tekst = wydobadzTekstPdfOstroznie('BT (Program szkolenia) Tj [(Data:) 20 (2026-07-15)] TJ ET')

  assert.ok(tekst.includes('Program szkolenia'))
  assert.ok(tekst.includes('2026-07-15'))
})
