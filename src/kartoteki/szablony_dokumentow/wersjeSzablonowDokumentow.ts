import type { DokumentBlokowy, ProblemDokumentu } from '../../wspolne/dokumenty/modelBlokowy'
import type {
  PorownanieWersjiSzablonu,
  SzablonDokumentuKartoteki,
  WersjaSzablonuDokumentu,
} from './typySzablonowDokumentow'

export function skopiujDaneWersji<T>(wartosc: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(wartosc)
  }

  return JSON.parse(JSON.stringify(wartosc)) as T
}

export function utworzWpisWersjiSzablonu({
  numerWersji,
  data,
  autor,
  komentarz,
  dokumentBlokowy,
  raportJakosci,
  raportReplikacji,
  zrodloZmiany,
  procentZgodnosci,
  poziomZgodnosci,
}: {
  numerWersji: number
  data: string
  autor: string
  komentarz: string
  dokumentBlokowy: DokumentBlokowy
  raportJakosci: ProblemDokumentu[]
  raportReplikacji?: SzablonDokumentuKartoteki['raportReplikacji']
  zrodloZmiany: string
  procentZgodnosci: number
  poziomZgodnosci: SzablonDokumentuKartoteki['poziomZgodnosci']
}): WersjaSzablonuDokumentu {
  return Object.freeze({
    numerWersji,
    data,
    autor,
    komentarz,
    dokumentBlokowy: skopiujDaneWersji(dokumentBlokowy),
    raportJakosci: skopiujDaneWersji(raportJakosci),
    raportReplikacji: raportReplikacji ? skopiujDaneWersji(raportReplikacji) : undefined,
    zrodloZmiany,
    procentZgodnosci,
    poziomZgodnosci,
  })
}

export function utworzWpisWersjiZSzablonu(
  szablon: SzablonDokumentuKartoteki,
  komentarz: string,
  zrodloZmiany: string,
  data = new Date().toISOString(),
): WersjaSzablonuDokumentu {
  return utworzWpisWersjiSzablonu({
    numerWersji: szablon.wersja,
    data,
    autor: szablon.autor,
    komentarz,
    dokumentBlokowy: szablon.dokumentBlokowy,
    raportJakosci: szablon.dokumentBlokowy.problemy,
    raportReplikacji: szablon.raportReplikacji,
    zrodloZmiany,
    procentZgodnosci: szablon.procentZgodnosci,
    poziomZgodnosci: szablon.poziomZgodnosci,
  })
}

export function porownajMetadaneWersji(
  pierwsza: WersjaSzablonuDokumentu,
  druga: WersjaSzablonuDokumentu,
): PorownanieWersjiSzablonu[] {
  const pozycje: PorownanieWersjiSzablonu[] = [
    {
      pole: 'Numer wersji',
      wartoscPierwsza: String(pierwsza.numerWersji),
      wartoscDruga: String(druga.numerWersji),
      czyRozne: pierwsza.numerWersji !== druga.numerWersji,
    },
    {
      pole: 'Zgodność',
      wartoscPierwsza: `${pierwsza.procentZgodnosci}%`,
      wartoscDruga: `${druga.procentZgodnosci}%`,
      czyRozne: pierwsza.procentZgodnosci !== druga.procentZgodnosci,
    },
    {
      pole: 'Poziom zgodności',
      wartoscPierwsza: pierwsza.poziomZgodnosci,
      wartoscDruga: druga.poziomZgodnosci,
      czyRozne: pierwsza.poziomZgodnosci !== druga.poziomZgodnosci,
    },
    {
      pole: 'Liczba problemów',
      wartoscPierwsza: String(pierwsza.raportJakosci.length),
      wartoscDruga: String(druga.raportJakosci.length),
      czyRozne: pierwsza.raportJakosci.length !== druga.raportJakosci.length,
    },
    {
      pole: 'Źródło zmiany',
      wartoscPierwsza: pierwsza.zrodloZmiany,
      wartoscDruga: druga.zrodloZmiany,
      czyRozne: pierwsza.zrodloZmiany !== druga.zrodloZmiany,
    },
  ]

  return pozycje
}
