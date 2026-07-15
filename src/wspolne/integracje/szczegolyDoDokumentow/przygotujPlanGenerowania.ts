import { pobierzKonfiguracjeTypuDokumentu } from '../../dokumenty/konfiguracjaDokumentow'
import type { TypDokumentu } from '../../dokumenty/modelDokumentu'
import {
  klonujMigawke,
  utworzPowiazanieZeSzczegolami,
  type DaneZrodlowePozycjiGenerowania,
  type KontekstDokumentuSzkolenia,
  type KontekstGrupySzkoleniowej,
  type PlanGenerowania,
  type ProblemWalidacjiKontekstu,
  type StrategiaGenerowaniaDokumentu,
} from './typyKontekstuDokumentu'

export type ParametryPlanuGenerowania = {
  kontekst: KontekstDokumentuSzkolenia
  typDokumentu: TypDokumentu
  strategia: StrategiaGenerowaniaDokumentu
  wybraneGrupyId: string[]
  wybraniUczestnicyId?: string[]
}

function utworzBlad(kod: string, komunikat: string, grupaId: string | null = null): ProblemWalidacjiKontekstu {
  return { kod, komunikat, grupaId, sciezka: grupaId ? 'grupy' : null, poziom: 'blad' }
}

function pobierzTytulTypu(typDokumentu: TypDokumentu): string {
  return pobierzKonfiguracjeTypuDokumentu(typDokumentu)?.etykieta ?? typDokumentu
}

function utworzDaneZrodlowe(kontekst: KontekstDokumentuSzkolenia, grupy: KontekstGrupySzkoleniowej[]): DaneZrodlowePozycjiGenerowania {
  return klonujMigawke({
    zrodlo: utworzPowiazanieZeSzczegolami(kontekst),
    szkolenie: kontekst.szkolenie,
    organizator: kontekst.organizator,
    klient: kontekst.klient,
    trenerzy: kontekst.trenerzy,
    grupy,
    uwagi: kontekst.uwagi,
  })
}

function pobierzWybraneGrupy(kontekst: KontekstDokumentuSzkolenia, wybraneGrupyId: string[]) {
  const bledy: ProblemWalidacjiKontekstu[] = []
  const unikalneId = [...new Set(wybraneGrupyId)]

  if (!unikalneId.length) {
    bledy.push(utworzBlad('BRAK_WYBRANYCH_GRUP', 'Wybierz co najmniej jedną grupę do przygotowania planu.'))
  }

  const grupy = unikalneId.flatMap((grupaId) => {
    const grupa = kontekst.grupy.find((kandydat) => kandydat.id === grupaId)
    if (!grupa) {
      bledy.push(utworzBlad('GRUPA_NIEISTNIEJE', 'Wybrana grupa nie istnieje w kontekście szkolenia.', grupaId))
      return []
    }
    return [grupa]
  })

  return { grupy, bledy }
}

function utworzTytul(typDokumentu: TypDokumentu, kontekst: KontekstDokumentuSzkolenia, grupa?: KontekstGrupySzkoleniowej, uczestnik?: string): string {
  return [pobierzTytulTypu(typDokumentu), kontekst.szkolenie.tytul || 'Bez tytułu szkolenia', grupa?.nazwa, uczestnik]
    .filter((wartosc): wartosc is string => Boolean(wartosc?.trim()))
    .join(' - ')
}

export function przygotujPlanGenerowania(parametry: ParametryPlanuGenerowania): PlanGenerowania {
  const { kontekst, typDokumentu, strategia, wybraniUczestnicyId } = parametry
  const { grupy, bledy } = pobierzWybraneGrupy(kontekst, parametry.wybraneGrupyId)
  const pozycje: PlanGenerowania['pozycje'] = []

  if (strategia === 'JEDEN_NA_GRUPE') {
    grupy.forEach((grupa) => {
      pozycje.push({
        strategia,
        typDokumentu,
        grupaId: grupa.id,
        uczestnikId: null,
        proponowanyTytul: utworzTytul(typDokumentu, kontekst, grupa),
        daneZrodlowe: utworzDaneZrodlowe(kontekst, [grupa]),
      })
    })
  }

  if (strategia === 'JEDEN_NA_UCZESTNIKA') {
    const wybraniUczestnicy = wybraniUczestnicyId ? new Set(wybraniUczestnicyId) : null
    const znalezieniUczestnicy = new Set<string>()

    grupy.forEach((grupa) => {
      grupa.uczestnicy.forEach((uczestnik) => {
        if (wybraniUczestnicy && (!uczestnik.id || !wybraniUczestnicy.has(uczestnik.id))) {
          return
        }

        if (uczestnik.id) {
          znalezieniUczestnicy.add(uczestnik.id)
        }
        const grupaZUczestnikiem = { ...grupa, uczestnicy: [uczestnik], liczbaUczestnikow: 1 }
        pozycje.push({
          strategia,
          typDokumentu,
          grupaId: grupa.id,
          uczestnikId: uczestnik.id,
          proponowanyTytul: utworzTytul(typDokumentu, kontekst, grupa, uczestnik.nazwaPelna),
          daneZrodlowe: utworzDaneZrodlowe(kontekst, [grupaZUczestnikiem]),
        })
      })
    })

    ;[...new Set(wybraniUczestnicyId ?? [])].forEach((uczestnikId) => {
      if (!znalezieniUczestnicy.has(uczestnikId)) {
        bledy.push(utworzBlad('UCZESTNIK_NIEISTNIEJE', 'Wybrany uczestnik nie istnieje w wybranych grupach.'))
      }
    })
  }

  if (strategia === 'JEDEN_ZBIORCZY' && grupy.length) {
    pozycje.push({
      strategia,
      typDokumentu,
      grupaId: null,
      uczestnikId: null,
      proponowanyTytul: utworzTytul(typDokumentu, kontekst),
      daneZrodlowe: utworzDaneZrodlowe(kontekst, grupy),
    })
  }

  return { pozycje, bledy }
}
