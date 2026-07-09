import { utworzModelStronyA4, type BlokDokumentu, type DokumentBlokowy } from '../../../wspolne/dokumenty/modelBlokowy'
import { utworzDokumentZTekstu } from '../../../wspolne/dokumenty/utworzDokumentZTekstu'
import { importujPlikDoDokumentu } from '../../../wspolne/import/importujPlikDoDokumentu'
import { wykryjPlaceholderyReplikatora } from './placeholderyReplikatora'
import { pobierzBlokiReplikatora, utworzRaportReplikacji } from './raportReplikacji'
import type { DecyzjaUzytkownikaReplikatora, SzablonRoboczyReplikatora, WynikImportuReplikatora } from './typyReplikatora'

function oczyscTekstPdf(tekst: string) {
  return tekst
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wydobadzTekstPdfOstroznie(zawartoscPdf: string) {
  const fragmenty = [
    ...Array.from(zawartoscPdf.matchAll(/\(([^()]*)\)\s*Tj/g), (dopasowanie) => dopasowanie[1]),
    ...Array.from(zawartoscPdf.matchAll(/\[(.*?)\]\s*TJ/gs), (dopasowanie) =>
      Array.from(dopasowanie[1].matchAll(/\(([^()]*)\)/g), (fragment) => fragment[1]).join(' '),
    ),
  ]
    .map(oczyscTekstPdf)
    .filter((tekst) => tekst.length > 1 && /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9]/.test(tekst))

  return Array.from(new Set(fragmenty)).join('\n')
}

function utworzBlokPdf(id: string, tresc: string): BlokDokumentu {
  return {
    id,
    typ: 'Akapit',
    tresc,
    dane: {},
    dzieci: [],
    metadane: {
      zrodlo: 'import',
      opisDiagnostyczny: 'Tekst PDF wydobyty ostrożnym parserem bez OCR; układ wymaga ręcznej kontroli.',
    },
    stylLokalny: {},
    statusDiagnostyczny: 'do_sprawdzenia',
  }
}

function utworzElementNieobslugiwanyPdf(id: string, opis: string): BlokDokumentu {
  return {
    id,
    typ: 'ElementNieobslugiwany',
    tresc: opis,
    dane: {},
    dzieci: [],
    metadane: {
      zrodlo: 'import',
      opisDiagnostyczny: opis,
    },
    stylLokalny: {},
    statusDiagnostyczny: 'blad',
  }
}

function policzStronyPdf(zawartoscPdf: string) {
  return Math.max(1, Array.from(zawartoscPdf.matchAll(/\/Type\s*\/Page\b/g)).length)
}

function utworzDokumentBlokowyPdf(nazwa: string, tekst: string, liczbaStron: number): DokumentBlokowy {
  const strona = utworzModelStronyA4('SEMPER')
  const wiersze = tekst.split(/\r?\n/).map((wiersz) => wiersz.trim()).filter(Boolean)
  const struktura = wiersze.length
    ? wiersze.map((wiersz, indeks) => utworzBlokPdf(`blok-pdf-tekst-${indeks + 1}`, wiersz))
    : [
        utworzElementNieobslugiwanyPdf(
          'blok-pdf-brak-warstwy-tekstu',
          'PDF nie udostępnia wiarygodnej warstwy tekstowej bez OCR. Import zachował ograniczenie zamiast zgadywania treści.',
        ),
      ]

  if (liczbaStron > 1) {
    struktura.push({
      id: 'blok-pdf-podzial-stron',
      typ: 'ElementNiepewny',
      tresc: `Wykryto ${liczbaStron} stron PDF, ale podział bloków na strony wymaga kontroli.`,
      dane: { liczbaStron },
      dzieci: [],
      metadane: {
        zrodlo: 'import',
        opisDiagnostyczny: 'Parser PDF nie odtwarza jeszcze pewnego położenia bloków między stronami.',
      },
      stylLokalny: {},
      statusDiagnostyczny: 'do_sprawdzenia',
    })
  }

  return {
    id: `blokowy-pdf-${Date.now()}`,
    typ: 'inny',
    dane: {
      tytulSzkolenia: wiersze.find((wiersz) => wiersz.length > 6) ?? nazwa,
      organizator: 'SEMPER',
    },
    struktura,
    strona,
    wyglad: {
      marginesy: strona.marginesy,
      styleBlokow: {},
    },
    problemy: [],
    raportyEksportu: [],
    metadane: {
      wersjaModelu: 1,
      zrodlo: 'import',
      zatwierdzonyPrzezUzytkownika: false,
    },
  }
}

function utworzSzablonRoboczyPdf(
  nazwa: string,
  dokumentBlokowy: DokumentBlokowy,
  dokumentPodgladu: Awaited<ReturnType<typeof importujPlikDoDokumentu>>['dokument'],
  uzytkownik: string,
  ograniczenia: string[],
): SzablonRoboczyReplikatora {
  const raportImportu = utworzRaportReplikacji(dokumentBlokowy, 'PDF', ograniczenia)
  const bloki = pobierzBlokiReplikatora(dokumentBlokowy)
  const historiaDecyzji: DecyzjaUzytkownikaReplikatora[] = [
    {
      id: `decyzja-import-pdf-${Date.now()}`,
      typ: 'import',
      komentarz: `Import PDF: ${nazwa}. Parser działa bez OCR i oznacza ograniczenia jawnie.`,
      uzytkownik,
      data: new Date().toISOString(),
    },
  ]

  return {
    id: `szablon-roboczy-pdf-${Date.now()}`,
    nazwa,
    typDokumentu: 'Inny',
    pewnoscTypuDokumentu: 0.25,
    organizator: 'SEMPER',
    status: 'Roboczy',
    zrodloImportu: 'PDF',
    dataImportu: raportImportu.dataImportu,
    uzytkownik,
    wersja: 1,
    procentZgodnosci: raportImportu.procentZgodnosci,
    poziomZgodnosci: raportImportu.poziomZgodnosci,
    raportImportu,
    dokumentBlokowy,
    dokumentPodgladu,
    placeholdery: wykryjPlaceholderyReplikatora(dokumentBlokowy),
    elementyNiepewne: bloki.filter((blok) => blok.typ === 'ElementNiepewny' || blok.statusDiagnostyczny === 'do_sprawdzenia').map((blok) => blok.id),
    elementyNieobslugiwane: bloki.filter((blok) => blok.typ === 'ElementNieobslugiwany').map((blok) => blok.id),
    historiaDecyzji,
    czyPokazacZnakWodnyWersjiTestowej: true,
  }
}

export async function importujPdfReplikatora(plik: File, uzytkownik: string): Promise<WynikImportuReplikatora> {
  const zawartosc = new TextDecoder('latin1').decode(await plik.arrayBuffer())
  const tekst = wydobadzTekstPdfOstroznie(zawartosc)
  const liczbaStron = policzStronyPdf(zawartosc)
  const nazwa = plik.name.replace(/\.[^.]+$/, '')
  const dokumentBlokowy = utworzDokumentBlokowyPdf(nazwa, tekst, liczbaStron)
  const wynikPodgladu = await importujPlikDoDokumentu(plik)
  const ograniczenia = [
    'PDF importowany bez OCR i bez rozpoznawania obrazów.',
    'Pozycjonowanie PDF jest traktowane orientacyjnie; wymaga kontroli użytkownika.',
    ...(tekst ? ['Warstwa tekstowa PDF została wydobyta ostrożnie, bez gwarancji pełnego układu 1:1.'] : ['Nie wykryto wiarygodnej warstwy tekstowej PDF.']),
  ]
  const szablonRoboczy = utworzSzablonRoboczyPdf(nazwa, dokumentBlokowy, wynikPodgladu.dokument, uzytkownik, ograniczenia)

  return {
    szablonRoboczy,
    dokumentPodgladu: wynikPodgladu.dokument,
    tekstZrodlowy: tekst,
    komunikat: tekst
      ? 'Zaimportowano PDF w trybie bezpiecznym: wydobyto tekst i oznaczono ograniczenia układu.'
      : 'PDF nie ma wiarygodnej warstwy tekstowej. Utworzono wersję roboczą z elementem nieobsługiwanym.',
  }
}

export function utworzSzablonRoboczyPdfZTekstu(nazwa: string, tekst: string, uzytkownik: string) {
  const dokumentPodgladu = utworzDokumentZTekstu(nazwa, tekst)
  const dokumentBlokowy = utworzDokumentBlokowyPdf(nazwa, tekst, 1)

  return utworzSzablonRoboczyPdf(nazwa, dokumentBlokowy, dokumentPodgladu, uzytkownik, ['Tryb testowy PDF utworzony z tekstu.'])
}
