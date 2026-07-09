import { sprawdzDokumentBlokowy, type BlokDokumentu, type DokumentBlokowy, type ProblemDokumentu, type TypBlokuDokumentu } from '../../../wspolne/dokumenty/modelBlokowy'
import type {
  PoziomZgodnosciReplikatora,
  RaportReplikacji,
  StatystykiBlokowReplikatora,
  ZrodloImportuReplikatora,
} from './typyReplikatora'

export function klasyfikujPoziomZgodnosci(procentZgodnosci: number): PoziomZgodnosciReplikatora {
  if (procentZgodnosci >= 95) {
    return 'bardzo_dobra_zgodnosc'
  }

  if (procentZgodnosci >= 81) {
    return 'dobra_zgodnosc'
  }

  if (procentZgodnosci >= 71) {
    return 'wymaga_sprawdzenia'
  }

  return 'tylko_wersja_robocza'
}

export function opiszPoziomZgodnosci(poziom: PoziomZgodnosciReplikatora) {
  const etykiety: Record<PoziomZgodnosciReplikatora, string> = {
    bardzo_dobra_zgodnosc: '95-100% - bardzo dobra zgodność',
    dobra_zgodnosc: '81-94% - dobra zgodność',
    wymaga_sprawdzenia: '71-80% - wymaga sprawdzenia',
    tylko_wersja_robocza: '<=70% - tylko wersja robocza',
  }

  return etykiety[poziom]
}

function splaszczBloki(bloki: BlokDokumentu[]): BlokDokumentu[] {
  return bloki.flatMap((blok) => [blok, ...splaszczBloki(blok.dzieci)])
}

export function policzBlokiReplikatora(dokument: DokumentBlokowy): StatystykiBlokowReplikatora {
  return splaszczBloki(dokument.struktura).reduce<StatystykiBlokowReplikatora>((statystyki, blok) => {
    statystyki[blok.typ] = (statystyki[blok.typ] ?? 0) + 1
    return statystyki
  }, {})
}

export function pobierzBlokiReplikatora(dokument: DokumentBlokowy) {
  return splaszczBloki(dokument.struktura)
}

export function utworzProblemReplikacji(
  id: string,
  poziom: ProblemDokumentu['poziom'],
  komunikat: string,
  blokId?: string,
): ProblemDokumentu {
  return {
    id,
    poziom,
    kategoria: poziom === 'blad_krytyczny' ? 'struktura' : 'parser',
    komunikat,
    blokId,
    czyBlokujeEksport: poziom === 'blad_krytyczny',
  }
}

export function policzZgodnoscReplikacji(
  dokument: DokumentBlokowy,
  zrodloImportu: ZrodloImportuReplikatora,
  ograniczenia: string[] = [],
) {
  const bloki = splaszczBloki(dokument.struktura)
  const liczbaNiepewnych = bloki.filter((blok) => blok.typ === 'ElementNiepewny' || blok.statusDiagnostyczny === 'do_sprawdzenia').length
  const liczbaNieobslugiwanych = bloki.filter((blok) => blok.typ === 'ElementNieobslugiwany' || blok.statusDiagnostyczny === 'blad').length
  const liczbaTekstow = bloki.filter((blok) => ['Tytul', 'Naglowek', 'Akapit', 'Punkt', 'Podpunkt', 'Stopka'].includes(blok.typ)).length
  const karaZaPdf = zrodloImportu === 'PDF' ? 18 : 0
  const karaZaBrakTekstuPdf = zrodloImportu === 'PDF' && liczbaTekstow === 0 ? 24 : 0
  const karaZaOgraniczenia = Math.min(18, ograniczenia.length * 3)
  const wynik = 100 - liczbaNiepewnych * 5 - liczbaNieobslugiwanych * 13 - karaZaPdf - karaZaBrakTekstuPdf - karaZaOgraniczenia

  return Math.max(35, Math.min(99, Math.round(wynik)))
}

function zliczNazwy(statystyki: StatystykiBlokowReplikatora, typy: TypBlokuDokumentu[], etykieta: string) {
  const suma = typy.reduce((obecnaSuma, typ) => obecnaSuma + (statystyki[typ] ?? 0), 0)
  return suma ? `${etykieta}: ${suma}` : null
}

export function utworzRaportReplikacji(
  dokument: DokumentBlokowy,
  zrodloImportu: ZrodloImportuReplikatora,
  ograniczenia: string[] = [],
): RaportReplikacji {
  const statystyki = policzBlokiReplikatora(dokument)
  const bloki = splaszczBloki(dokument.struktura)
  const procentZgodnosci = policzZgodnoscReplikacji(dokument, zrodloImportu, ograniczenia)
  const problemyModelu = sprawdzDokumentBlokowy(dokument)
  const problemyReplikacji = bloki.flatMap((blok, indeks) => {
    if (blok.typ === 'ElementNieobslugiwany') {
      return [utworzProblemReplikacji(`replikacja-nieobslugiwany-${indeks + 1}`, 'blad_krytyczny', blok.metadane.opisDiagnostyczny ?? 'Element nieobsługiwany wymaga decyzji użytkownika.', blok.id)]
    }

    if (blok.typ === 'ElementNiepewny' || blok.statusDiagnostyczny === 'do_sprawdzenia') {
      return [utworzProblemReplikacji(`replikacja-niepewny-${indeks + 1}`, 'ostrzezenie', blok.metadane.opisDiagnostyczny ?? 'Element wymaga sprawdzenia.', blok.id)]
    }

    return []
  })
  const odtworzono = [
    zliczNazwy(statystyki, ['Tytul', 'Naglowek'], 'nagłówki i tytuły'),
    zliczNazwy(statystyki, ['Akapit'], 'akapity'),
    zliczNazwy(statystyki, ['Punkt', 'Podpunkt'], 'listy'),
    zliczNazwy(statystyki, ['Tabela'], 'tabele'),
    zliczNazwy(statystyki, ['Obraz', 'Logotyp'], 'obrazy/logotypy'),
    zliczNazwy(statystyki, ['Stopka'], 'stopki'),
    zliczNazwy(statystyki, ['PoleZmienne'], 'pola zmienne'),
  ].filter((wartosc): wartosc is string => Boolean(wartosc))
  const nieOdtworzono = [
    ...(statystyki.ElementNieobslugiwany ? [`elementy nieobsługiwane: ${statystyki.ElementNieobslugiwany}`] : []),
    ...ograniczenia,
  ]
  const wymagaPoprawy = [
    ...(statystyki.ElementNiepewny ? [`elementy niepewne: ${statystyki.ElementNiepewny}`] : []),
    ...(procentZgodnosci <= 80 ? ['wynik zgodności wymaga ręcznej kontroli'] : []),
  ]

  return {
    id: `raport-replikacji-${Date.now()}`,
    zrodloImportu,
    dataImportu: new Date().toISOString(),
    odtworzono,
    nieOdtworzono,
    wymagaPoprawy,
    ograniczenia,
    procentZgodnosci,
    poziomZgodnosci: klasyfikujPoziomZgodnosci(procentZgodnosci),
    opisHeurystyki: 'Wynik jest heurystyką: start 100%, kary za PDF, elementy niepewne, elementy nieobsługiwane i jawnie zapisane ograniczenia importu. To nie jest porównanie piksel do piksela.',
    problemyJakosci: [...problemyModelu, ...problemyReplikacji],
  }
}
