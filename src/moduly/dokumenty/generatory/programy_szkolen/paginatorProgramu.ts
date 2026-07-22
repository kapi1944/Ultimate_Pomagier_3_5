import type { BlokDokumentu, DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'

export type GrupaPunktowProgramu = {
  id: string
  bloki: BlokDokumentu[]
}

export type ModulPaginacjiProgramu = {
  id: string
  blok: BlokDokumentu
  grupyPunktow: GrupaPunktowProgramu[]
  trybTresc?: 'surowa'
}

export type DzienPaginacjiProgramu = {
  id: string
  blok?: BlokDokumentu
  temat?: BlokDokumentu
  moduly: ModulPaginacjiProgramu[]
}

export type ModelPaginacjiProgramu = {
  dni: DzienPaginacjiProgramu[]
}

export type FragmentModuluProgramu = {
  modul: ModulPaginacjiProgramu
  grupyPunktow: GrupaPunktowProgramu[]
  czyPokazacTytul: boolean
  poczatkowyIndeksNumeracji: number
}

export type FragmentDniaProgramu = {
  dzien: DzienPaginacjiProgramu
  czyPokazacNaglowek: boolean
  moduly: FragmentModuluProgramu[]
}

export type StronaProgramu = {
  numer: number
  fragmentyDni: FragmentDniaProgramu[]
}

export type ProblemPaginacjiProgramu = {
  id: string
  komunikat: string
  blokId?: string
}

export type PomiaryModuluProgramu = {
  wysokoscCalego: number
  wysokoscBazyZTytulem: number
  wysokoscBazyBezTytulu: number
  wysokosciGrup: Record<string, number>
}

export type PomiaryPaginacjiProgramu = {
  pojemnoscPierwszejStrony: number
  pojemnoscKolejnychStron: number
  wysokosciNaglowkowDni: Record<string, number>
  wysokoscOdstepuMiedzyDniami: number
  wysokoscOdstepuMiedzyModulami: number
  wysokoscOdstepuMiedzyPunktami: number
  moduly: Record<string, PomiaryModuluProgramu>
}

export type WynikPaginacjiProgramu = {
  strony: StronaProgramu[]
  problemy: ProblemPaginacjiProgramu[]
}

type StronaWBudowie = {
  strona: StronaProgramu
  wykorzystanaWysokosc: number
}

function pobierzPoziom(blok: BlokDokumentu) {
  return Math.max(0, blok.stylLokalny.wciecie ?? blok.metadane.poziom ?? 0)
}

function utworzGrupyPunktow(bloki: BlokDokumentu[]) {
  const grupy: GrupaPunktowProgramu[] = []

  bloki
    .filter((blok) => blok.typ === 'Punkt' || blok.typ === 'Podpunkt')
    .forEach((blok) => {
      if (!grupy.length || pobierzPoziom(blok) === 0) {
        grupy.push({ id: `grupa-${blok.id}`, bloki: [blok] })
        return
      }

      grupy.at(-1)?.bloki.push(blok)
    })

  return grupy
}

function utworzModulPaginacji(blok: BlokDokumentu): ModulPaginacjiProgramu {
  return {
    id: blok.id,
    blok,
    grupyPunktow: utworzGrupyPunktow(blok.dzieci),
  }
}

function utworzWirtualnyModulDlaPunktow(bloki: BlokDokumentu[]): ModulPaginacjiProgramu {
  const blok: BlokDokumentu = {
    id: 'lista-prosta-programu',
    typ: 'Modul',
    dzieci: bloki,
    metadane: {},
    stylLokalny: {},
    statusDiagnostyczny: 'poprawny',
  }

  return utworzModulPaginacji(blok)
}

export function utworzModelPaginacjiProgramuDlaTekstuSurowego(tekst: string): ModelPaginacjiProgramu {
  if (!tekst.trim()) {
    return { dni: [] }
  }

  const bloki = tekst.split('\n').map((wiersz, indeks) => ({
    id: `wiersz-surowego-programu-${indeks + 1}`,
    typ: 'Punkt' as const,
    tresc: wiersz || '\u00a0',
    dzieci: [],
    metadane: { poziom: 0 },
    stylLokalny: { wciecie: 0 },
    statusDiagnostyczny: 'poprawny' as const,
  }))
  const modul = utworzWirtualnyModulDlaPunktow(bloki)

  return {
    dni: [{ id: 'dzien-tekstu-surowego', moduly: [{ ...modul, id: 'tekst-surowy-programu', trybTresc: 'surowa' }] }],
  }
}

export function utworzModelPaginacjiProgramu(dokument: DokumentBlokowy): ModelPaginacjiProgramu {
  const dni = dokument.struktura.filter((blok) => blok.typ === 'Dzien')

  if (dni.length) {
    return {
      dni: dni.map((blok) => ({
        id: blok.id,
        blok,
        temat: blok.dzieci.find((dziecko) => dziecko.typ === 'Sekcja'),
        moduly: blok.dzieci.filter((dziecko) => dziecko.typ === 'Modul').map(utworzModulPaginacji),
      })),
    }
  }

  const punkty = dokument.struktura.filter((blok) => blok.typ === 'Punkt' || blok.typ === 'Podpunkt')

  return {
    dni: punkty.length
      ? [{ id: 'dzien-listy-prostej', moduly: [utworzWirtualnyModulDlaPunktow(punkty)] }]
      : [],
  }
}

function czyLiczbaJestPomiarem(wartosc: number | undefined) {
  return typeof wartosc === 'number' && Number.isFinite(wartosc) && wartosc >= 0
}

export function czyPomiaryProgramuSaKompletne(model: ModelPaginacjiProgramu, pomiary: PomiaryPaginacjiProgramu | null) {
  if (!pomiary || !czyLiczbaJestPomiarem(pomiary.pojemnoscPierwszejStrony) || !czyLiczbaJestPomiarem(pomiary.pojemnoscKolejnychStron)) {
    return false
  }

  return model.dni.every((dzien) =>
    (!dzien.blok?.tresc || czyLiczbaJestPomiarem(pomiary.wysokosciNaglowkowDni[dzien.id])) &&
    dzien.moduly.every((modul) => {
      const pomiarModulu = pomiary.moduly[modul.id]

      return Boolean(
        pomiarModulu &&
          czyLiczbaJestPomiarem(pomiarModulu.wysokoscCalego) &&
          czyLiczbaJestPomiarem(pomiarModulu.wysokoscBazyZTytulem) &&
          czyLiczbaJestPomiarem(pomiarModulu.wysokoscBazyBezTytulu) &&
          modul.grupyPunktow.every((grupa) => czyLiczbaJestPomiarem(pomiarModulu.wysokosciGrup[grupa.id])),
      )
    }),
  )
}

function pobierzPojemnoscStrony(strona: StronaWBudowie, pomiary: PomiaryPaginacjiProgramu) {
  return strona.strona.numer === 1 ? pomiary.pojemnoscPierwszejStrony : pomiary.pojemnoscKolejnychStron
}

function czyDzienMaNaglowek(dzien: DzienPaginacjiProgramu) {
  return Boolean(dzien.blok?.tresc)
}

function znajdzFragmentDnia(strona: StronaWBudowie, dzienId: string) {
  return strona.strona.fragmentyDni.find((fragment) => fragment.dzien.id === dzienId)
}

function pobierzDoplateZaDodanieModulu(
  strona: StronaWBudowie,
  dzien: DzienPaginacjiProgramu,
  czyDzienZostalRozpoczety: boolean,
  pomiary: PomiaryPaginacjiProgramu,
) {
  const fragmentDnia = znajdzFragmentDnia(strona, dzien.id)

  if (fragmentDnia) {
    return fragmentDnia.moduly.length ? pomiary.wysokoscOdstepuMiedzyModulami : 0
  }

  const odstepPrzedDniem = strona.strona.fragmentyDni.length ? pomiary.wysokoscOdstepuMiedzyDniami : 0
  const wysokoscNaglowka = !czyDzienZostalRozpoczety && czyDzienMaNaglowek(dzien)
    ? pomiary.wysokosciNaglowkowDni[dzien.id] ?? 0
    : 0

  return odstepPrzedDniem + wysokoscNaglowka
}

function utworzPustaStrone(numer: number): StronaWBudowie {
  return { strona: { numer, fragmentyDni: [] }, wykorzystanaWysokosc: 0 }
}

function pobierzWysokoscFragmentuModulu(
  pomiarModulu: PomiaryModuluProgramu,
  grupyPunktow: GrupaPunktowProgramu[],
  czyPokazacTytul: boolean,
  wysokoscOdstepuMiedzyPunktami: number,
) {
  const wysokoscBazy = czyPokazacTytul ? pomiarModulu.wysokoscBazyZTytulem : pomiarModulu.wysokoscBazyBezTytulu
  const wysokoscGrup = grupyPunktow.reduce((suma, grupa) => suma + (pomiarModulu.wysokosciGrup[grupa.id] ?? 0), 0)
  const wysokoscOdstepow = Math.max(0, grupyPunktow.length - 1) * wysokoscOdstepuMiedzyPunktami

  return wysokoscBazy + wysokoscGrup + wysokoscOdstepow
}

function dodajFragmentModulu(
  strona: StronaWBudowie,
  dzien: DzienPaginacjiProgramu,
  modul: ModulPaginacjiProgramu,
  grupyPunktow: GrupaPunktowProgramu[],
  czyPokazacTytul: boolean,
  poczatkowyIndeksNumeracji: number,
  doplata: number,
  wysokosc: number,
  czyDzienZostalRozpoczety: boolean,
) {
  let fragmentDnia = znajdzFragmentDnia(strona, dzien.id)

  if (!fragmentDnia) {
    fragmentDnia = {
      dzien,
      czyPokazacNaglowek: !czyDzienZostalRozpoczety && czyDzienMaNaglowek(dzien),
      moduly: [],
    }
    strona.strona.fragmentyDni.push(fragmentDnia)
  }

  fragmentDnia.moduly.push({ modul, grupyPunktow, czyPokazacTytul, poczatkowyIndeksNumeracji })
  strona.wykorzystanaWysokosc += doplata + wysokosc
}

export function paginujProgram(model: ModelPaginacjiProgramu, pomiary: PomiaryPaginacjiProgramu): WynikPaginacjiProgramu {
  const stronyWBudowie = [utworzPustaStrone(1)]
  const problemy: ProblemPaginacjiProgramu[] = []
  const rozpoczęteDni = new Set<string>()
  let aktualnaStrona = stronyWBudowie[0]

  function utworzNowaStrone() {
    aktualnaStrona = utworzPustaStrone(stronyWBudowie.length + 1)
    stronyWBudowie.push(aktualnaStrona)
  }

  function czyMiesciSieNaAktualnejStronie(doplata: number, wysokosc: number) {
    return aktualnaStrona.wykorzystanaWysokosc + doplata + wysokosc <= pobierzPojemnoscStrony(aktualnaStrona, pomiary)
  }

  for (const dzien of model.dni) {
    for (const modul of dzien.moduly) {
      const pomiarModulu = pomiary.moduly[modul.id]

      if (!pomiarModulu) {
        problemy.push({ id: `brak-pomiaru-${modul.id}`, blokId: modul.id, komunikat: 'Nie udało się zmierzyć modułu programu.' })
        continue
      }

      let indeksPoczatkowejGrupy = 0
      let czyPierwszyFragmentModulu = true

      if (!modul.grupyPunktow.length) {
        while (true) {
          const czyDzienZostalRozpoczety = rozpoczęteDni.has(dzien.id)
          const doplata = pobierzDoplateZaDodanieModulu(aktualnaStrona, dzien, czyDzienZostalRozpoczety, pomiary)

          if (czyMiesciSieNaAktualnejStronie(doplata, pomiarModulu.wysokoscCalego)) {
            dodajFragmentModulu(aktualnaStrona, dzien, modul, [], true, 0, doplata, pomiarModulu.wysokoscCalego, czyDzienZostalRozpoczety)
            rozpoczęteDni.add(dzien.id)
            break
          }

          if (aktualnaStrona.strona.fragmentyDni.length) {
            utworzNowaStrone()
            continue
          }

          problemy.push({ id: `za-duzy-modul-${modul.id}`, blokId: modul.id, komunikat: 'Moduł bez punktów jest wyższy niż dostępny obszar strony.' })
          break
        }

        continue
      }

      while (indeksPoczatkowejGrupy < modul.grupyPunktow.length) {
        const czyDzienZostalRozpoczety = rozpoczęteDni.has(dzien.id)
        const doplata = pobierzDoplateZaDodanieModulu(aktualnaStrona, dzien, czyDzienZostalRozpoczety, pomiary)

        if (czyPierwszyFragmentModulu && czyMiesciSieNaAktualnejStronie(doplata, pomiarModulu.wysokoscCalego)) {
          dodajFragmentModulu(
            aktualnaStrona,
            dzien,
            modul,
            modul.grupyPunktow,
            true,
            0,
            doplata,
            pomiarModulu.wysokoscCalego,
            czyDzienZostalRozpoczety,
          )
          rozpoczęteDni.add(dzien.id)
          break
        }

        const dostepnaWysokosc = pobierzPojemnoscStrony(aktualnaStrona, pomiary) - aktualnaStrona.wykorzystanaWysokosc - doplata
        let indeksKoncaGrupy = indeksPoczatkowejGrupy

        while (indeksKoncaGrupy < modul.grupyPunktow.length) {
          const kandydat = modul.grupyPunktow.slice(indeksPoczatkowejGrupy, indeksKoncaGrupy + 1)
          const wysokoscKandydata = pobierzWysokoscFragmentuModulu(
            pomiarModulu,
            kandydat,
            czyPierwszyFragmentModulu,
            pomiary.wysokoscOdstepuMiedzyPunktami,
          )

          if (wysokoscKandydata > dostepnaWysokosc) {
            break
          }

          indeksKoncaGrupy += 1
        }

        if (indeksKoncaGrupy === indeksPoczatkowejGrupy) {
          if (aktualnaStrona.strona.fragmentyDni.length) {
            utworzNowaStrone()
            continue
          }

          const grupa = modul.grupyPunktow[indeksPoczatkowejGrupy]
          problemy.push({
            id: `za-duzy-punkt-${grupa.id}`,
            blokId: grupa.bloki[0]?.id,
            komunikat: 'Pojedynczy punkt programu jest wyższy niż dostępny obszar strony i nie może zostać podzielony automatycznie.',
          })
          indeksPoczatkowejGrupy += 1
          continue
        }

        const grupyNaStronie = modul.grupyPunktow.slice(indeksPoczatkowejGrupy, indeksKoncaGrupy)
        const wysokoscFragmentu = pobierzWysokoscFragmentuModulu(
          pomiarModulu,
          grupyNaStronie,
          czyPierwszyFragmentModulu,
          pomiary.wysokoscOdstepuMiedzyPunktami,
        )

        dodajFragmentModulu(
          aktualnaStrona,
          dzien,
          modul,
          grupyNaStronie,
          czyPierwszyFragmentModulu,
          indeksPoczatkowejGrupy,
          doplata,
          wysokoscFragmentu,
          czyDzienZostalRozpoczety,
        )
        rozpoczęteDni.add(dzien.id)
        indeksPoczatkowejGrupy = indeksKoncaGrupy
        czyPierwszyFragmentModulu = false

        if (indeksPoczatkowejGrupy < modul.grupyPunktow.length) {
          utworzNowaStrone()
        }
      }
    }
  }

  const strony = stronyWBudowie
    .filter((strona, indeks) => indeks === 0 || strona.strona.fragmentyDni.length)
    .map((strona, indeks) => ({ ...strona.strona, numer: indeks + 1 }))

  return { strony: strony.length ? strony : [{ numer: 1, fragmentyDni: [] }], problemy }
}
