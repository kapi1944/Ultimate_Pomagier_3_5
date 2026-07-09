import { useMemo, useState, type ChangeEvent } from 'react'
import { uzupelnijAnalizeDokumentu } from '../../../wspolne/dokumenty/analizaDokumentu'
import PanelKontroliJakosciDokumentu from '../../../wspolne/dokumenty/PanelKontroliJakosciDokumentu'
import type { ProblemDokumentu } from '../../../wspolne/dokumenty/modelBlokowy'
import {
  pobierzSzablonyDokumentowZKartoteki,
  utworzNazweSzablonuZDopiskiem,
  wykryjKonfliktNazwySzablonu,
  zapiszNowaWersjeSzablonu,
  zapiszNowySzablonZReplikatora,
} from '../../../kartoteki/szablony_dokumentow/magazynSzablonowDokumentow'
import type { SzablonDokumentuKartoteki } from '../../../kartoteki/szablony_dokumentow/typySzablonowDokumentow'
import { utworzDokumentZTekstu } from '../../../wspolne/dokumenty/utworzDokumentZTekstu'
import { importujPlikDoDokumentu } from '../../../wspolne/import/importujPlikDoDokumentu'
import { rozpoznajTypPliku } from '../../../wspolne/import/rozpoznajTypPliku'
import type {
  DaneWyekstrahowaneDokumentu,
  DokumentPomagiera,
  ElementDokumentu,
  ElementKsztaltuDokumentu,
  ElementObrazuDokumentu,
  ElementTabeliDokumentu,
  ElementTekstowyDokumentu,
  MarkaDokumentu,
  PozycjaElementuDokumentu,
  RolaGrafikiDokumentu,
  RolaKsztaltuDokumentu,
  StatusDanychWyekstrahowanych,
  StatusElementuDokumentu,
  TypZrodlaDokumentu,
} from '../../../wspolne/dokumenty/typyDokumentu'
import { tekstPrzykladowyReplikatora } from './przykladyReplikatora'
import {
  aktualizujDokumentBlokowyTekstem,
  importujDocxReplikatora,
  ustawOrganizatoraDokumentuBlokowego,
  ustawTypDokumentuBlokowego,
  utworzSzablonRoboczyZDokumentu,
  utworzSzablonRoboczyZTekstu,
  zatwierdzNiskaZgodnoscSzablonu,
  zsynchronizujDokumentPomagieraZDokumentemBlokowym,
} from './parserDocxReplikatora'
import { importujPdfReplikatora } from './parserPdfReplikatora'
import { polaczStatusyPlaceholderow, czyPlaceholderySaZatwierdzone } from './placeholderyReplikatora'
import { opiszPoziomZgodnosci, pobierzBlokiReplikatora, utworzRaportReplikacji } from './raportReplikacji'
import type {
  DecyzjaUzytkownikaReplikatora,
  PlaceholderReplikatora,
  SzablonRoboczyReplikatora,
  TypDokumentuReplikatora,
  WynikImportuReplikatora,
} from './typyReplikatora'
import PodgladOryginaluDokumentu from './PodgladOryginaluDokumentu'
import RenderujDokumentPomagiera from './RenderujDokumentPomagiera'
import './replikatorDokumentow.css'

const tekstPrzykladowy = tekstPrzykladowyReplikatora

type TrybPorownania = 'normalny' | 'porownanie' | 'nakladka'

type RolaDostepu = 'Opiekun' | 'Administrator' | 'Architekt'

const roleGrafik: RolaGrafikiDokumentu[] = ['logo', 'podpis', 'tlo', 'qr', 'dekoracja', 'znak_wodny', 'logotyp_projektowy', 'inne']
const roleKsztaltow: RolaKsztaltuDokumentu[] = ['tlo_tytulu', 'separator', 'ramka', 'dekoracja', 'inne']
const statusyElementow: StatusElementuDokumentu[] = ['staly', 'dynamiczny', 'niepewny', 'ignorowany']
const statusyDanych: StatusDanychWyekstrahowanych[] = ['do_zatwierdzenia', 'zatwierdzone', 'odrzucone']
const typyDokumentowReplikatora: TypDokumentuReplikatora[] = [
  'Program szkolenia',
  'Dyplom',
  'Certyfikat',
  'Zaświadczenie',
  'Lista obecności',
  'Ankieta',
  'Protokół',
  'Materiał dodatkowy',
  'Inny',
]

function opiszTypZrodla(typ: TypZrodlaDokumentu) {
  const etykiety: Record<TypZrodlaDokumentu, string> = {
    tekst: 'Tekst',
    docx: 'DOCX',
    pdf: 'PDF',
    obraz: 'Obraz / skan',
    ocr: 'OCR',
    csv: 'CSV',
    nieznany: 'Nieznany',
  }

  return etykiety[typ]
}

function pobierzRoleUzytkownika(): RolaDostepu {
  try {
    const zapisSesji = localStorage.getItem('ultimate-pomagier.zalogowany-uzytkownik')
    const zapisRoli = localStorage.getItem('ultimate-pomagier.aktywna-rola')
    const daneSesji = zapisSesji ? JSON.parse(zapisSesji) : null
    const rola = typeof daneSesji?.rola === 'string' ? daneSesji.rola : zapisRoli

    return rola === 'Opiekun' || rola === 'Administrator' || rola === 'Architekt' ? rola : 'Architekt'
  } catch {
    return 'Architekt'
  }
}

function pobierzNazweUzytkownika() {
  try {
    const zapisSesji = localStorage.getItem('ultimate-pomagier.zalogowany-uzytkownik')
    const daneSesji = zapisSesji ? JSON.parse(zapisSesji) : null

    return typeof daneSesji?.nazwa === 'string' ? daneSesji.nazwa : 'Architekt'
  } catch {
    return 'Architekt'
  }
}

function pobierzElementy(elementy: ElementDokumentu[]): ElementDokumentu[] {
  return elementy.flatMap((element) => (element.rodzaj === 'blok' ? [element, ...pobierzElementy(element.elementy)] : [element]))
}

function znajdzElement(dokument: DokumentPomagiera, elementId: string | null) {
  if (!elementId) {
    return null
  }

  return dokument.strony.flatMap((strona) => pobierzElementy(strona.elementy)).find((element) => element.id === elementId) ?? null
}

function aktualizujElementy(
  elementy: ElementDokumentu[],
  elementId: string,
  aktualizuj: (element: ElementDokumentu) => ElementDokumentu,
): ElementDokumentu[] {
  return elementy.map((element) => {
    if (element.rodzaj === 'blok') {
      const blok = {
        ...element,
        elementy: aktualizujElementy(element.elementy, elementId, aktualizuj),
      }

      return blok.id === elementId ? aktualizuj(blok) : blok
    }

    return element.id === elementId ? aktualizuj(element) : element
  })
}

function ustawMarkeDokumentu(dokument: DokumentPomagiera, marka: MarkaDokumentu): DokumentPomagiera {
  const kolory: Record<MarkaDokumentu, { kolorGlowny: string; kolorDodatkowy: string }> = {
    SEMPER: { kolorGlowny: '#0f766e', kolorDodatkowy: '#dc2626' },
    IIST: { kolorGlowny: '#1d4ed8', kolorDodatkowy: '#0f172a' },
    klient: { kolorGlowny: '#7c3aed', kolorDodatkowy: '#f59e0b' },
  }

  return {
    ...dokument,
    metadane: {
      ...dokument.metadane,
      branding: {
        marka,
        ...kolory[marka],
      },
    },
  }
}

function utworzDecyzje(
  typ: DecyzjaUzytkownikaReplikatora['typ'],
  komentarz: string,
  uzytkownik: string,
  poprzedniWynikZgodnosci?: number,
): DecyzjaUzytkownikaReplikatora {
  return {
    id: `decyzja-${typ}-${Date.now()}`,
    typ,
    komentarz,
    uzytkownik,
    data: new Date().toISOString(),
    poprzedniWynikZgodnosci,
  }
}

function policzBlokiDokumentu(szablon: SzablonRoboczyReplikatora) {
  return pobierzBlokiReplikatora(szablon.dokumentBlokowy).length
}

function czyElementTekstowy(element: ElementDokumentu | null): element is ElementTekstowyDokumentu {
  return Boolean(element && (element.rodzaj === 'tekst' || element.rodzaj === 'naglowek' || element.rodzaj === 'stopka'))
}

function czyElementObrazu(element: ElementDokumentu | null): element is ElementObrazuDokumentu {
  return Boolean(element && element.rodzaj === 'obraz')
}

function czyElementTabeli(element: ElementDokumentu | null): element is ElementTabeliDokumentu {
  return Boolean(element && element.rodzaj === 'tabela')
}

function czyElementKsztaltu(element: ElementDokumentu | null): element is ElementKsztaltuDokumentu {
  return Boolean(element && element.rodzaj === 'ksztalt')
}

function opiszRodzajElementu(element: ElementDokumentu) {
  const opisy: Record<ElementDokumentu['rodzaj'], string> = {
    tekst: 'Tekst',
    naglowek: 'Nagłówek',
    stopka: 'Stopka',
    obraz: 'Grafika',
    plik_osadzony: 'Plik osadzony',
    tabela: 'Tabela',
    linia: 'Linia',
    ksztalt: 'Kształt',
    checkbox: 'Checkbox',
    blok: 'Grupa',
  }

  return opisy[element.rodzaj]
}

function ustawPozycjeElementu(element: ElementDokumentu, pole: keyof PozycjaElementuDokumentu, wartosc: number): ElementDokumentu {
  return {
    ...element,
    pozycja: {
      ...element.pozycja,
      [pole]: Number.isFinite(wartosc) ? wartosc : element.pozycja[pole],
    },
  }
}

export default function WidokReplikatoraDokumentow() {
  const [rolaUzytkownika] = useState<RolaDostepu>(pobierzRoleUzytkownika)
  const [uzytkownik] = useState(pobierzNazweUzytkownika)
  const [nazwaWzorca, ustawNazweWzorca] = useState('Wzorzec tekstowy')
  const [tekstWzorca, ustawTekstWzorca] = useState(tekstPrzykladowy)
  const [dokument, ustawDokument] = useState<DokumentPomagiera>(() =>
    utworzDokumentZTekstu('Wzorzec tekstowy', tekstPrzykladowy),
  )
  const [szablonRoboczy, ustawSzablonRoboczy] = useState<SzablonRoboczyReplikatora>(() =>
    utworzSzablonRoboczyZTekstu('Wzorzec tekstowy', tekstPrzykladowy, pobierzNazweUzytkownika()),
  )
  const [komunikat, ustawKomunikat] = useState('Replikator działa lokalnie na tekście, DOCX, CSV, PDF i obrazach.')
  const [zaznaczonyElementId, ustawZaznaczonyElementId] = useState<string | null>(null)
  const [trybPorownania, ustawTrybPorownania] = useState<TrybPorownania>('normalny')
  const [przezroczystoscOryginalu, ustawPrzezroczystoscOryginalu] = useState(45)
  const [szablony, ustawSzablony] = useState<SzablonDokumentuKartoteki[]>(pobierzSzablonyDokumentowZKartoteki)
  const [wybranySzablonId, ustawWybranySzablonId] = useState('')
  const [ostatnioWybranyPlik, ustawOstatnioWybranyPlik] = useState<File | null>(null)
  const [komentarzNiskiejZgodnosci, ustawKomentarzNiskiejZgodnosci] = useState('')

  const raport = dokument.metadane.raportImportu
  const raportReplikacji = szablonRoboczy.raportImportu
  const czyPlaceholderyZatwierdzone = czyPlaceholderySaZatwierdzone(szablonRoboczy.placeholdery)
  const czyMoznaZapisacSzablon = czyPlaceholderyZatwierdzone
  const czyZatwierdzonoNiskaZgodnosc = szablonRoboczy.dokumentBlokowy.metadane.zatwierdzonyPrzezUzytkownika && szablonRoboczy.procentZgodnosci <= 70
  const zaznaczonyElement = useMemo(() => znajdzElement(dokument, zaznaczonyElementId), [dokument, zaznaczonyElementId])
  const poleZaznaczonegoElementu = useMemo(
    () => dokument.polaDynamiczne.find((pole) => pole.elementId === zaznaczonyElementId),
    [dokument.polaDynamiczne, zaznaczonyElementId],
  )

  function przeliczDokument(nowyDokument: DokumentPomagiera, tekstZrodlowy = tekstWzorca) {
    const dokumentZAnaliza = uzupelnijAnalizeDokumentu(nowyDokument, tekstZrodlowy)

    ustawDokument(dokumentZAnaliza)
    ustawSzablonRoboczy((obecnySzablon) => {
      const nowySzablon = utworzSzablonRoboczyZDokumentu(
        dokumentZAnaliza,
        obecnySzablon.zrodloImportu,
        uzytkownik,
        obecnySzablon.raportImportu.ograniczenia,
        obecnySzablon.historiaDecyzji,
      )

      return {
        ...obecnySzablon,
        nazwa: dokumentZAnaliza.nazwa,
        organizator: dokumentZAnaliza.metadane.branding.marka,
        dokumentPodgladu: dokumentZAnaliza,
        dokumentBlokowy: nowySzablon.dokumentBlokowy,
        raportImportu: nowySzablon.raportImportu,
        procentZgodnosci: nowySzablon.procentZgodnosci,
        poziomZgodnosci: nowySzablon.poziomZgodnosci,
        placeholdery: polaczStatusyPlaceholderow(nowySzablon.placeholdery, obecnySzablon.placeholdery),
        elementyNiepewne: nowySzablon.elementyNiepewne,
        elementyNieobslugiwane: nowySzablon.elementyNieobslugiwane,
      }
    })
  }

  function aktualizujElement(elementId: string, aktualizuj: (element: ElementDokumentu) => ElementDokumentu) {
    przeliczDokument({
      ...dokument,
      strony: dokument.strony.map((strona) => ({
        ...strona,
        elementy: aktualizujElementy(strona.elementy, elementId, aktualizuj),
      })),
    })
  }

  function obsluzZmianeNazwy(nazwa: string) {
    ustawNazweWzorca(nazwa)
    ustawSzablonRoboczy((obecnySzablon) => ({ ...obecnySzablon, nazwa }))

    if (dokument.zrodlo.typ === 'tekst') {
      przeliczDokument(utworzDokumentZTekstu(nazwa, tekstWzorca), tekstWzorca)
    } else {
      przeliczDokument({ ...dokument, nazwa: nazwa.trim() || dokument.nazwa })
    }
  }

  function obsluzZmianeTekstu(tekst: string) {
    ustawTekstWzorca(tekst)
    przeliczDokument(utworzDokumentZTekstu(nazwaWzorca, tekst), tekst)
    ustawKomunikat('Zaktualizowano tekstowy wzorzec dokumentu.')
  }

  async function importujWybranyPlik(plik: File, czyPonownyImport = false) {
    try {
      const typPliku = rozpoznajTypPliku(plik)
      let wynik: WynikImportuReplikatora

      if (typPliku === 'docx') {
        wynik = await importujDocxReplikatora(plik, uzytkownik)
      } else if (typPliku === 'pdf') {
        wynik = await importujPdfReplikatora(plik, uzytkownik)
      } else {
        const wynikImportu = await importujPlikDoDokumentu(plik)

        wynik = {
          dokumentPodgladu: wynikImportu.dokument,
          szablonRoboczy: utworzSzablonRoboczyZDokumentu(wynikImportu.dokument, typPliku === 'tekst' ? 'TEKST' : 'DOCX', uzytkownik, [
            typPliku === 'obraz' ? 'Obrazy wymagają OCR i są oznaczane jako niepewne.' : 'Format nie jest docelowym importem Replikatora DOCX/PDF.',
          ]),
          tekstZrodlowy: wynikImportu.tekstZrodlowy,
          komunikat: wynikImportu.komunikat,
        }
      }

      ustawNazweWzorca(wynik.dokumentPodgladu.nazwa)
      ustawTekstWzorca(wynik.tekstZrodlowy)
      ustawDokument(wynik.dokumentPodgladu)
      ustawSzablonRoboczy(wynik.szablonRoboczy)
      ustawZaznaczonyElementId(null)
      ustawKomunikat(czyPonownyImport ? `Ponownie zaimportowano plik: ${plik.name}. ${wynik.komunikat}` : wynik.komunikat)
    } catch {
      ustawKomunikat('Nie udało się zaimportować pliku. Sprawdź format albo zapisz dokument ponownie jako DOCX.')
    }
  }

  async function obsluzWyborPliku(zdarzenie: ChangeEvent<HTMLInputElement>) {
    const plik = zdarzenie.target.files?.[0]

    if (!plik) {
      return
    }

    ustawOstatnioWybranyPlik(plik)

    try {
      await importujWybranyPlik(plik)
    } finally {
      zdarzenie.target.value = ''
    }
  }

  function obsluzPonownyImport() {
    if (!ostatnioWybranyPlik) {
      ustawKomunikat('Najpierw wybierz plik do importu.')
      return
    }

    void importujWybranyPlik(ostatnioWybranyPlik, true)
  }

  function zatwierdzPole(poleId: string) {
    const pole = dokument.polaDynamiczne.find((obecnePole) => obecnePole.id === poleId)

    if (!pole) {
      return
    }

    const dokumentZPolem = {
      ...dokument,
      polaDynamiczne: dokument.polaDynamiczne.map((obecnePole) =>
        obecnePole.id === poleId ? { ...obecnePole, status: 'zatwierdzone' as const, wartoscPrzykladowa: `{{${obecnePole.nazwa}}}` } : obecnePole,
      ),
      strony: dokument.strony.map((strona) => ({
        ...strona,
        elementy: aktualizujElementy(strona.elementy, pole.elementId, (element) =>
          czyElementTekstowy(element)
            ? {
                ...element,
                status: 'dynamiczny',
                poleDynamiczneId: pole.id,
                tekst: `{{${pole.nazwa}}}`,
              }
            : element,
        ),
      })),
    }

    przeliczDokument(dokumentZPolem)
    ustawKomunikat(`Zatwierdzono pole {{${pole.nazwa}}}.`)
  }

  function aktualizujPlaceholder(placeholderId: string, zmiany: Partial<PlaceholderReplikatora>) {
    ustawSzablonRoboczy((obecnySzablon) => ({
      ...obecnySzablon,
      placeholdery: obecnySzablon.placeholdery.map((placeholder) =>
        placeholder.id === placeholderId ? { ...placeholder, ...zmiany } : placeholder,
      ),
    }))
  }

  function zatwierdzPlaceholder(placeholderId: string) {
    aktualizujPlaceholder(placeholderId, { status: 'zatwierdzony' })
    ustawKomunikat('Zatwierdzono placeholder przed zapisem szablonu.')
  }

  function aktualizujDaneWyekstrahowane(id: string, zmiany: Partial<DaneWyekstrahowaneDokumentu>) {
    przeliczDokument({
      ...dokument,
      metadane: {
        ...dokument.metadane,
        daneWyekstrahowane: dokument.metadane.daneWyekstrahowane.map((dane) => (dane.id === id ? { ...dane, ...zmiany } : dane)),
      },
    })
  }

  function zapiszNowySzablon() {
    if (!czyMoznaZapisacSzablon) {
      ustawKomunikat('Przed zapisem zatwierdź albo odrzuć wszystkie placeholdery.')
      return
    }

    const istniejacySzablon = wykryjKonfliktNazwySzablonu(nazwaWzorca, szablony)
    const nazwaBezKonfliktu = utworzNazweSzablonuZDopiskiem(nazwaWzorca, szablony)
    const czyZmianaNazwy = Boolean(istniejacySzablon)

    if (istniejacySzablon) {
      const czyNowyZDopiskiem = window.confirm(`Istnieje już szablon o nazwie "${nazwaWzorca}". Utworzyć nowy szablon jako "${nazwaBezKonfliktu}"? Wybierz Anuluj, aby zapisać jako nową wersję istniejącego szablonu.`)

      if (!czyNowyZDopiskiem) {
        const czyWersja = window.confirm(`Zapisać wynik jako nową wersję szablonu "${istniejacySzablon.nazwa}"?`)

        if (!czyWersja) {
          ustawKomunikat('Anulowano zapis, aby nie nadpisać istniejącego szablonu.')
          return
        }

        const historiaDecyzji = [
          ...szablonRoboczy.historiaDecyzji,
          utworzDecyzje('zapis', `Zapisano jako nową wersję szablonu ${istniejacySzablon.nazwa}.`, uzytkownik),
        ]
        const szablonDoZapisu = {
          ...szablonRoboczy,
          historiaDecyzji,
        }
        const dokumentDoZapisu = zsynchronizujDokumentPomagieraZDokumentemBlokowym(dokument, szablonDoZapisu.dokumentBlokowy)
        const szablon = zapiszNowaWersjeSzablonu(istniejacySzablon.id, szablonDoZapisu, dokumentDoZapisu, uzytkownik)

        ustawSzablony(pobierzSzablonyDokumentowZKartoteki())
        ustawWybranySzablonId(szablon.id)
        ustawSzablonRoboczy(szablonDoZapisu)
        ustawDokument(dokumentDoZapisu)
        ustawKomunikat('Zapisano wynik jako nową wersję istniejącego szablonu w Kartotece.')
        return
      }
    }

    const historiaDecyzji = [
      ...szablonRoboczy.historiaDecyzji,
      ...(czyZmianaNazwy ? [utworzDecyzje('nadpisanie', `Utworzono nowy szablon jako "${nazwaBezKonfliktu}" zamiast nadpisania istniejącego.`, uzytkownik)] : []),
      utworzDecyzje('zapis', 'Zapisano import jako wersję roboczą szablonu.', uzytkownik),
    ]
    const szablonDoZapisuBazowy: SzablonRoboczyReplikatora = {
      ...szablonRoboczy,
      nazwa: nazwaBezKonfliktu,
      historiaDecyzji,
    }
    const dokumentDoZapisu = {
      ...zsynchronizujDokumentPomagieraZDokumentemBlokowym(dokument, szablonDoZapisuBazowy.dokumentBlokowy),
      nazwa: nazwaBezKonfliktu,
    }
    const szablonDoZapisu: SzablonRoboczyReplikatora = {
      ...szablonDoZapisuBazowy,
      dokumentPodgladu: dokumentDoZapisu,
    }
    const szablon = zapiszNowySzablonZReplikatora(szablonDoZapisu, dokumentDoZapisu, uzytkownik, nazwaBezKonfliktu)

    ustawSzablony(pobierzSzablonyDokumentowZKartoteki())
    ustawWybranySzablonId(szablon.id)
    ustawSzablonRoboczy(szablonDoZapisu)
    ustawDokument(dokumentDoZapisu)
    ustawNazweWzorca(nazwaBezKonfliktu)
    ustawKomunikat('Zapisano dokument jako roboczy szablon w Kartotece -> Szablony dokumentów.')
  }

  function zapiszWersjeSzablonu() {
    if (!czyMoznaZapisacSzablon) {
      ustawKomunikat('Przed zapisem wersji zatwierdź albo odrzuć wszystkie placeholdery.')
      return
    }

    const wybranySzablon = szablony.find((szablon) => szablon.id === wybranySzablonId)

    if (wybranySzablon && !window.confirm(`Zapisać import jako nową iterację szablonu "${wybranySzablon.nazwa}"?`)) {
      ustawKomunikat('Anulowano zapis nowej iteracji szablonu.')
      return
    }

    const szablonDoZapisuBazowy: SzablonRoboczyReplikatora = {
      ...szablonRoboczy,
      historiaDecyzji: [
        ...szablonRoboczy.historiaDecyzji,
        utworzDecyzje('zapis', `Zapisano jako nową iterację szablonu ${wybranySzablon?.nazwa ?? wybranySzablonId}.`, uzytkownik),
      ],
    }
    const dokumentDoZapisu = zsynchronizujDokumentPomagieraZDokumentemBlokowym(dokument, szablonDoZapisuBazowy.dokumentBlokowy)
    const szablonDoZapisu: SzablonRoboczyReplikatora = {
      ...szablonDoZapisuBazowy,
      dokumentPodgladu: dokumentDoZapisu,
    }
    const szablon = zapiszNowaWersjeSzablonu(wybranySzablonId, szablonDoZapisu, dokumentDoZapisu, uzytkownik)

    ustawSzablony(pobierzSzablonyDokumentowZKartoteki())
    ustawWybranySzablonId(szablon.id)
    ustawSzablonRoboczy(szablonDoZapisu)
    ustawDokument(dokumentDoZapisu)
    ustawKomunikat('Zapisano dokument jako nową wersję istniejącego szablonu.')
  }

  function obsluzZmianeTypuDokumentu(typDokumentu: TypDokumentuReplikatora) {
    ustawSzablonRoboczy((obecnySzablon) => {
      const dokumentBlokowy = ustawTypDokumentuBlokowego(obecnySzablon.dokumentBlokowy, typDokumentu)
      const raportImportu = utworzRaportReplikacji(dokumentBlokowy, obecnySzablon.zrodloImportu, obecnySzablon.raportImportu.ograniczenia)

      return {
        ...obecnySzablon,
        typDokumentu,
        pewnoscTypuDokumentu: 1,
        dokumentBlokowy,
        raportImportu,
        procentZgodnosci: raportImportu.procentZgodnosci,
        poziomZgodnosci: raportImportu.poziomZgodnosci,
      }
    })
  }

  function obsluzZmianeOrganizatora(organizator: MarkaDokumentu) {
    const nowyDokument = ustawMarkeDokumentu(dokument, organizator)

    ustawDokument(nowyDokument)
    ustawSzablonRoboczy((obecnySzablon) => ({
      ...obecnySzablon,
      organizator,
      dokumentPodgladu: nowyDokument,
      dokumentBlokowy: ustawOrganizatoraDokumentuBlokowego(obecnySzablon.dokumentBlokowy, organizator),
    }))
  }

  function oznaczJakoPoprawnyMimoNiskiejZgodnosci() {
    const komentarz = komentarzNiskiejZgodnosci.trim()

    if (!komentarz) {
      ustawKomunikat('Podaj komentarz decyzji dla niskiej zgodności.')
      return
    }

    ustawSzablonRoboczy((obecnySzablon) => zatwierdzNiskaZgodnoscSzablonu(obecnySzablon, komentarz, uzytkownik))
    ustawKomentarzNiskiejZgodnosci('')
    ustawKomunikat('Zapisano świadomą decyzję użytkownika dla niskiej zgodności.')
  }

  function ustawWidocznoscZnakuWodnego(czyWidoczny: boolean) {
    ustawSzablonRoboczy((obecnySzablon) => ({
      ...obecnySzablon,
      czyPokazacZnakWodnyWersjiTestowej: czyWidoczny,
      historiaDecyzji: [
        ...obecnySzablon.historiaDecyzji,
        utworzDecyzje('znak_wodny', czyWidoczny ? 'Pokazano oznaczenie wersji testowej.' : 'Ukryto oznaczenie wersji testowej po świadomej decyzji.', uzytkownik),
      ],
    }))
  }

  function przejdzDoProblemu(problem: ProblemDokumentu) {
    const idElementuZrodlowego = problem.blokId?.replace(/^blok-/, '') ?? null

    ustawZaznaczonyElementId(idElementuZrodlowego)
  }

  function drukujPodglad() {
    window.print()
  }

  function renderujStrony() {
    return (
      <RenderujDokumentPomagiera
        dokument={dokument}
        pokazOryginalJakoTlo={trybPorownania === 'nakladka'}
        przezroczystoscOryginalu={przezroczystoscOryginalu}
        zaznaczonyElementId={zaznaczonyElementId}
        onZaznaczElement={ustawZaznaczonyElementId}
        onZmienTekst={(elementId, tekst) => {
          aktualizujElement(elementId, (element) => (czyElementTekstowy(element) ? { ...element, tekst } : element))
          ustawSzablonRoboczy((obecnySzablon) => {
            const dokumentBlokowy = aktualizujDokumentBlokowyTekstem(obecnySzablon.dokumentBlokowy, elementId, tekst)
            const raportImportu = utworzRaportReplikacji(dokumentBlokowy, obecnySzablon.zrodloImportu, obecnySzablon.raportImportu.ograniczenia)

            return {
              ...obecnySzablon,
              dokumentBlokowy,
              raportImportu,
              procentZgodnosci: raportImportu.procentZgodnosci,
              poziomZgodnosci: raportImportu.poziomZgodnosci,
            }
          })
        }}
      />
    )
  }

  return (
    <section className="widok replikator-dokumentow">
      <header className="replikator-dokumentow__naglowek">
        <div>
          <h1>Replikator dokumentów</h1>
          <p>Import wzorca, korekta modelu i zapis szablonu dla generatorów.</p>
        </div>
        <span>{`${rolaUzytkownika} | ${opiszTypZrodla(dokument.zrodlo.typ)}`}</span>
      </header>

      <div className="replikator-dokumentow__uklad">
        <section className="replikator-dokumentow__panel">
          <h2>Import wzorca</h2>

          <label className="replikator-dokumentow__pole">
            Nazwa wzorca
            <input value={nazwaWzorca} onChange={(zdarzenie) => obsluzZmianeNazwy(zdarzenie.target.value)} />
          </label>

          <label className="replikator-dokumentow__pole">
            Typ dokumentu
            <select value={szablonRoboczy.typDokumentu} onChange={(zdarzenie) => obsluzZmianeTypuDokumentu(zdarzenie.target.value as TypDokumentuReplikatora)}>
              {typyDokumentowReplikatora.map((typ) => <option key={typ} value={typ}>{typ}</option>)}
            </select>
          </label>

          <label className="replikator-dokumentow__pole">
            Plik źródłowy DOCX/PDF
            <input accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={obsluzWyborPliku} type="file" />
          </label>

          <div className="replikator-dokumentow__formularz-linia">
            <button disabled={!ostatnioWybranyPlik} type="button" onClick={obsluzPonownyImport}>
              Ponownie importuj plik
            </button>
            <p className="replikator-dokumentow__plik-ostatni">
              {ostatnioWybranyPlik ? `Ostatni plik: ${ostatnioWybranyPlik.name}` : 'Brak wybranego pliku do ponownego importu.'}
            </p>
          </div>

          <label className="replikator-dokumentow__pole">
            Treść rozpoznana
            <textarea value={tekstWzorca} onChange={(zdarzenie) => obsluzZmianeTekstu(zdarzenie.target.value)} />
          </label>

          <div className="replikator-dokumentow__formularz-linia">
            <label className="replikator-dokumentow__pole">
              Marka
              <select value={szablonRoboczy.organizator} onChange={(zdarzenie) => obsluzZmianeOrganizatora(zdarzenie.target.value as MarkaDokumentu)}>
                <option value="SEMPER">SEMPER</option>
                <option value="IIST">IIST</option>
                <option value="klient">Klient</option>
              </select>
            </label>
            <button type="button" onClick={drukujPodglad}>Drukuj podgląd</button>
          </div>

          <p className="replikator-dokumentow__komunikat">{komunikat}</p>

          <section className="replikator-dokumentow__raport">
            <h3>Raport importu</h3>
            <dl>
              <div><dt>Strony</dt><dd>{raport?.liczbaStron ?? dokument.strony.length}</dd></div>
              <div><dt>Teksty</dt><dd>{raport?.liczbaTekstow ?? 0}</dd></div>
              <div><dt>Obrazy</dt><dd>{raport?.liczbaObrazow ?? 0}</dd></div>
              <div><dt>Kształty</dt><dd>{raport?.liczbaKsztaltow ?? 0}</dd></div>
              <div><dt>Tabele</dt><dd>{raport?.liczbaTabel ?? 0}</dd></div>
              <div><dt>Checkboxy</dt><dd>{raport?.liczbaCheckboxow ?? 0}</dd></div>
              <div><dt>Pola</dt><dd>{raport?.liczbaPolDynamicznych ?? dokument.polaDynamiczne.length}</dd></div>
              <div><dt>Niepewne</dt><dd>{raport?.liczbaNiepewnych ?? 0}</dd></div>
              <div><dt>Typ</dt><dd>{raport?.mozliwyTypDokumentu ?? '-'}</dd></div>
              <div><dt>Zgodność</dt><dd>{raportReplikacji.procentZgodnosci}%</dd></div>
              <div><dt>Poziom</dt><dd>{opiszPoziomZgodnosci(raportReplikacji.poziomZgodnosci)}</dd></div>
            </dl>
            <p>{raportReplikacji.opisHeurystyki}</p>
            {raport?.ostrzezenia.map((ostrzezenie) => (
              <p className="replikator-dokumentow__ostrzezenie" key={ostrzezenie}>{ostrzezenie}</p>
            ))}
            {szablonRoboczy.pewnoscTypuDokumentu < 0.7 && (
              <p className="replikator-dokumentow__ostrzezenie">Typ dokumentu rozpoznany z niską pewnością. Wybierz typ ręcznie przed dalszym użyciem.</p>
            )}
            {czyZatwierdzonoNiskaZgodnosc && (
              <p className="replikator-dokumentow__ostrzezenie">Szablon został ręcznie zatwierdzony, ale pierwotny wynik zgodności nadal oznacza tylko wersję roboczą.</p>
            )}
          </section>

          <PanelKontroliJakosciDokumentu
            problemy={[...szablonRoboczy.dokumentBlokowy.problemy, ...raportReplikacji.problemyJakosci]}
            czyZatwierdzony={szablonRoboczy.dokumentBlokowy.metadane.zatwierdzonyPrzezUzytkownika}
            liczbaBlokow={policzBlokiDokumentu(szablonRoboczy)}
            raportReplikacji={{
              procentZgodnosci: raportReplikacji.procentZgodnosci,
              poziomZgodnosci: opiszPoziomZgodnosci(raportReplikacji.poziomZgodnosci),
              odtworzono: raportReplikacji.odtworzono,
              nieOdtworzono: raportReplikacji.nieOdtworzono,
              wymagaPoprawy: raportReplikacji.wymagaPoprawy,
              ograniczenia: raportReplikacji.ograniczenia,
            }}
            statusSzablonu={szablonRoboczy.status}
            onPrzejdzDoProblemu={przejdzDoProblemu}
          />

          <section className="replikator-dokumentow__lista">
            <h3>Dane wyekstrahowane</h3>
            {dokument.metadane.daneWyekstrahowane.length ? dokument.metadane.daneWyekstrahowane.map((dane) => (
              <div className="replikator-dokumentow__wiersz-danych" key={dane.id}>
                <span>{dane.etykieta}</span>
                <input value={dane.wartosc} onChange={(zdarzenie) => aktualizujDaneWyekstrahowane(dane.id, { wartosc: zdarzenie.target.value })} />
                <select value={dane.status} onChange={(zdarzenie) => aktualizujDaneWyekstrahowane(dane.id, { status: zdarzenie.target.value as StatusDanychWyekstrahowanych })}>
                  {statusyDanych.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            )) : <p>Brak danych do zatwierdzenia.</p>}
          </section>

          <section className="replikator-dokumentow__lista">
            <h3>Placeholdery do zatwierdzenia</h3>
            {szablonRoboczy.placeholdery.length ? szablonRoboczy.placeholdery.map((placeholder) => (
              <div className="replikator-dokumentow__wiersz-pola" key={placeholder.id}>
                <span>{`{{${placeholder.nazwa}}}`}</span>
                <small>{placeholder.rodzaj} | {placeholder.powiazanie} | {placeholder.status}</small>
                <button type="button" disabled={placeholder.status === 'zatwierdzony'} onClick={() => zatwierdzPlaceholder(placeholder.id)}>
                  Zatwierdź
                </button>
                <button type="button" disabled={placeholder.status === 'odrzucony'} onClick={() => aktualizujPlaceholder(placeholder.id, { status: 'odrzucony' })}>
                  Odrzuć
                </button>
              </div>
            )) : <p>Brak propozycji placeholderów.</p>}
            {!czyPlaceholderyZatwierdzone && <p className="replikator-dokumentow__ostrzezenie">Zapis jest zablokowany do czasu zatwierdzenia albo odrzucenia placeholderów.</p>}
          </section>

          <section className="replikator-dokumentow__lista">
            <h3>Pola dynamiczne podglądu</h3>
            {dokument.polaDynamiczne.length ? dokument.polaDynamiczne.map((pole) => (
              <div className="replikator-dokumentow__wiersz-pola" key={pole.id}>
                <span>{`{{${pole.nazwa}}}`}</span>
                <small>{pole.status}</small>
                <button type="button" disabled={pole.status === 'zatwierdzone'} onClick={() => zatwierdzPole(pole.id)}>
                  Zatwierdź
                </button>
              </div>
            )) : <p>Brak propozycji pól.</p>}
          </section>

          <section className="replikator-dokumentow__lista">
            <h3>Zapis szablonu</h3>
            {szablonRoboczy.procentZgodnosci <= 70 && (
              <label className="replikator-dokumentow__pole">
                Komentarz użytkownika dla niskiej zgodności
                <textarea value={komentarzNiskiejZgodnosci} onChange={(zdarzenie) => ustawKomentarzNiskiejZgodnosci(zdarzenie.target.value)} />
                <button type="button" onClick={oznaczJakoPoprawnyMimoNiskiejZgodnosci}>
                  Oznacz jako poprawny mimo niższego wyniku
                </button>
              </label>
            )}
            <div className="replikator-dokumentow__formularz-linia">
              <button type="button" disabled={!czyMoznaZapisacSzablon} onClick={zapiszNowySzablon}>Zapisz jako nowy szablon</button>
              <select value={wybranySzablonId} onChange={(zdarzenie) => ustawWybranySzablonId(zdarzenie.target.value)}>
                <option value="">Wybierz szablon</option>
                {szablony.map((szablon) => <option key={szablon.id} value={szablon.id}>{`${szablon.nazwa} v${szablon.wersja}`}</option>)}
              </select>
              <button type="button" disabled={!wybranySzablonId || !czyMoznaZapisacSzablon} onClick={zapiszWersjeSzablonu}>Zapisz jako wersję</button>
            </div>
          </section>
        </section>

        <section className="replikator-dokumentow__panel replikator-dokumentow__panel--podglad">
          <div className="replikator-dokumentow__pasek">
            <div>
              <h2>Podgląd modelu</h2>
              <span>{dokument.strony.length} stron, {raport?.liczbaTekstow ?? 0} tekstów, {raport?.liczbaTabel ?? 0} tabel</span>
            </div>
            <span>{dokument.zrodlo.typ.toUpperCase()}</span>
          </div>

          <div className="replikator-dokumentow__tryby">
            <button className={trybPorownania === 'normalny' ? 'replikator-dokumentow__aktywny' : ''} type="button" onClick={() => ustawTrybPorownania('normalny')}>Normalny</button>
            <button className={trybPorownania === 'porownanie' ? 'replikator-dokumentow__aktywny' : ''} type="button" onClick={() => ustawTrybPorownania('porownanie')}>Porównanie</button>
            <button className={trybPorownania === 'nakladka' ? 'replikator-dokumentow__aktywny' : ''} type="button" onClick={() => ustawTrybPorownania('nakladka')}>Nakładka</button>
            <label>
              Oryginał
              <input min="0" max="90" type="range" value={przezroczystoscOryginalu} onChange={(zdarzenie) => ustawPrzezroczystoscOryginalu(Number(zdarzenie.target.value))} />
            </label>
            <label>
              Wersja testowa
              <input checked={szablonRoboczy.czyPokazacZnakWodnyWersjiTestowej} type="checkbox" onChange={(zdarzenie) => ustawWidocznoscZnakuWodnego(zdarzenie.target.checked)} />
            </label>
          </div>

          {szablonRoboczy.status === 'Roboczy' && szablonRoboczy.czyPokazacZnakWodnyWersjiTestowej && (
            <div className="replikator-dokumentow__znak-wodny">wersja testowa</div>
          )}

          {trybPorownania === 'porownanie' ? (
            <div className="replikator-dokumentow__porownanie">
              <section className="replikator-dokumentow__oryginal" aria-label="Oryginalny załącznik">
                <PodgladOryginaluDokumentu dokument={dokument} />
              </section>
              {renderujStrony()}
            </div>
          ) : renderujStrony()}

          <section className="replikator-dokumentow__wlasciwosci">
            <h3>Właściwości elementu</h3>
            {zaznaczonyElement ? (
              <>
                <dl className="replikator-dokumentow__metryka">
                  <div><dt>Typ</dt><dd>{opiszRodzajElementu(zaznaczonyElement)}</dd></div>
                  <div><dt>Id</dt><dd>{zaznaczonyElement.id}</dd></div>
                </dl>

                <label>
                  Status
                  <select value={zaznaczonyElement.status} onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => ({ ...element, status: zdarzenie.target.value as StatusElementuDokumentu }))}>
                    {statusyElementow.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </label>

                <div className="replikator-dokumentow__pozycja">
                  {(['x', 'y', 'szerokosc', 'wysokosc'] as const).map((pole) => (
                    <label key={pole}>
                      {pole}
                      <input
                        type="number"
                        value={zaznaczonyElement.pozycja[pole]}
                        onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => ustawPozycjeElementu(element, pole, Number(zdarzenie.target.value)))}
                      />
                    </label>
                  ))}
                </div>

                {czyElementTekstowy(zaznaczonyElement) && (
                  <>
                    {poleZaznaczonegoElementu && (
                      <p className="replikator-dokumentow__chip">{`{{${poleZaznaczonegoElementu.nazwa}}}`}</p>
                    )}
                    <label>
                      Tekst
                      <textarea value={zaznaczonyElement.tekst} onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => (czyElementTekstowy(element) ? { ...element, tekst: zdarzenie.target.value } : element))} />
                    </label>
                    <label>
                      Kolor
                      <input type="color" value={zaznaczonyElement.styl.kolor} onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => (czyElementTekstowy(element) ? { ...element, styl: { ...element.styl, kolor: zdarzenie.target.value } } : element))} />
                    </label>
                    <label>
                      Rozmiar
                      <input min="6" max="48" type="number" value={zaznaczonyElement.styl.rozmiarCzcionki} onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => (czyElementTekstowy(element) ? { ...element, styl: { ...element.styl, rozmiarCzcionki: Number(zdarzenie.target.value) } } : element))} />
                    </label>
                  </>
                )}

                {czyElementObrazu(zaznaczonyElement) && (
                  <>
                    <label>
                      Rola grafiki
                      <select value={zaznaczonyElement.rola} onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => (czyElementObrazu(element) ? { ...element, rola: zdarzenie.target.value as RolaGrafikiDokumentu } : element))}>
                        {roleGrafik.map((rola) => <option key={rola} value={rola}>{rola}</option>)}
                      </select>
                    </label>
                    <dl className="replikator-dokumentow__metryka">
                      <div><dt>Zasób</dt><dd>{zaznaczonyElement.zasobId ?? '-'}</dd></div>
                      <div><dt>Nazwa</dt><dd>{zaznaczonyElement.nazwa}</dd></div>
                    </dl>
                  </>
                )}

                {czyElementKsztaltu(zaznaczonyElement) && (
                  <>
                    <label>
                      Rola kształtu
                      <select value={zaznaczonyElement.rola} onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => (czyElementKsztaltu(element) ? { ...element, rola: zdarzenie.target.value as RolaKsztaltuDokumentu } : element))}>
                        {roleKsztaltow.map((rola) => <option key={rola} value={rola}>{rola}</option>)}
                      </select>
                    </label>
                    <label>
                      Wypełnienie
                      <input type="color" value={zaznaczonyElement.wypelnienie} onChange={(zdarzenie) => aktualizujElement(zaznaczonyElement.id, (element) => (czyElementKsztaltu(element) ? { ...element, wypelnienie: zdarzenie.target.value } : element))} />
                    </label>
                  </>
                )}

                {czyElementTabeli(zaznaczonyElement) && (
                  <dl className="replikator-dokumentow__metryka">
                    <div><dt>Wiersze</dt><dd>{zaznaczonyElement.komorki.length}</dd></div>
                    <div><dt>Kolumny</dt><dd>{zaznaczonyElement.kolumny.length}</dd></div>
                    <div><dt>Kolumny podpisu</dt><dd>{zaznaczonyElement.liczbaKolumnPodpisu ?? '-'}</dd></div>
                    <div><dt>Nagłówek</dt><dd>{zaznaczonyElement.powtorzNaglowek ? 'powtarzany' : 'bez powtarzania'}</dd></div>
                    <div><dt>Ostrzeżenia</dt><dd>{zaznaczonyElement.ostrzezenia?.join(', ') || '-'}</dd></div>
                  </dl>
                )}
              </>
            ) : (
              <p>Zaznacz element w podglądzie.</p>
            )}
          </section>

          <dl className="replikator-dokumentow__metryka">
            <div><dt>Id dokumentu</dt><dd>{dokument.id}</dd></div>
            <div><dt>Format</dt><dd>A4 210x297 mm</dd></div>
            <div><dt>Jednostki</dt><dd>mm</dd></div>
            <div><dt>Zasoby</dt><dd>{dokument.zasoby.length}</dd></div>
          </dl>
        </section>
      </div>
    </section>
  )
}
