import type { BlokDokumentu, DokumentBlokowy } from '../../../../wspolne/dokumenty/modelBlokowy'

export type GrupaPunktowProgramu = {
  id: string
  bloki: BlokDokumentu[]
  wycinek?: { przesuniecie: number; wysokosc: number }
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
  problemy?: ProblemPaginacjiProgramu[]
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
  wysokosciBlokow?: Record<string, number>
  graniceWierszy?: Record<string, number[]>
  wysokoscOdstepuMiedzyBlokami?: number
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
  const punkty = bloki.filter((blok) => blok.typ === 'Punkt' || blok.typ === 'Podpunkt')
  const poziomBazowy = Math.min(...punkty.map(pobierzPoziom))

  punkty
    .forEach((blok) => {
      if (!grupy.length || pobierzPoziom(blok) === poziomBazowy) {
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

function zbudujModelPaginacjiProgramu(dokument: DokumentBlokowy): ModelPaginacjiProgramu {
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

export function sprawdzSpojnoscPaginacjiProgramu(dokument: DokumentBlokowy, model: ModelPaginacjiProgramu, trescProgramu: string): ProblemPaginacjiProgramu[] {
  function czyMaBlokiProgramu(bloki: BlokDokumentu[]): boolean {
    return bloki.some((blok) => (['Modul', 'Punkt', 'Podpunkt'].includes(blok.typ) && Boolean(blok.tresc?.trim())) || czyMaBlokiProgramu(blok.dzieci))
  }
  const czyMaTresc = model.dni.some((dzien) => dzien.moduly.some((modul) => modul.blok.tresc?.trim() || modul.grupyPunktow.some((grupa) => grupa.bloki.some((blok) => blok.tresc?.trim()))))
  return trescProgramu.trim() && czyMaBlokiProgramu(dokument.struktura) && !czyMaTresc
    ? [{ id: 'niespojna-paginacja-programu', komunikat: 'Wykryto bloki programu bez renderowalnej zawartości modelu paginacji. Wynik wymaga weryfikacji; zastosowano awaryjne zachowanie treści.' }]
    : []
}

export function utworzModelPaginacjiProgramu(dokument: DokumentBlokowy, trescProgramu = ''): ModelPaginacjiProgramu {
  const model = zbudujModelPaginacjiProgramu(dokument)
  const problemy = sprawdzSpojnoscPaginacjiProgramu(dokument, model, trescProgramu)
  if (!problemy.length) return model

  const bloki: BlokDokumentu[] = []
  function zachowajTresc(zrodlo: BlokDokumentu[]) {
    for (const blok of zrodlo) {
      if (['Dzien', 'Sekcja', 'Modul', 'Punkt', 'Podpunkt'].includes(blok.typ) && blok.tresc?.trim()) {
        bloki.push({ ...blok, typ: 'Punkt', dzieci: [], metadane: { ...blok.metadane, poziom: 0 }, stylLokalny: { ...blok.stylLokalny, wciecie: 0 } })
      }
      zachowajTresc(blok.dzieci)
    }
  }
  zachowajTresc(dokument.struktura)
  return { dni: [{ id: 'dzien-awaryjnej-tresci', moduly: [utworzWirtualnyModulDlaPunktow(bloki)] }], problemy }
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
          modul.grupyPunktow.every((grupa) => czyLiczbaJestPomiarem(pomiarModulu.wysokosciGrup[grupa.id]) &&
            (grupa.bloki.length < 2 || grupa.bloki.every((blok) => czyLiczbaJestPomiarem(pomiarModulu.wysokosciBlokow?.[blok.id])))),
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

export function paginujProgram(model: ModelPaginacjiProgramu, pomiary: PomiaryPaginacjiProgramu, czyNieDzielicPunktowGlownych = false): WynikPaginacjiProgramu {
  const stronyWBudowie = [utworzPustaStrone(1)]
  const problemy: ProblemPaginacjiProgramu[] = [...model.problemy ?? []]
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
      const pomiarZrodlowy = pomiary.moduly[modul.id]
      const pomiarModulu = pomiarZrodlowy ? { ...pomiarZrodlowy, wysokosciGrup: { ...pomiarZrodlowy.wysokosciGrup }, graniceWierszy: { ...pomiarZrodlowy.graniceWierszy } } : undefined
      const grupyPunktow = [...modul.grupyPunktow]
      const indeksyNumeracji = grupyPunktow.map((_, indeks) => indeks)

      if (!pomiarModulu) {
        problemy.push({ id: `brak-pomiaru-${modul.id}`, blokId: modul.id, komunikat: 'Nie udało się zmierzyć modułu programu.' })
        dodajFragmentModulu(aktualnaStrona, dzien, modul, grupyPunktow, true, 0, 0, 0, rozpoczęteDni.has(dzien.id))
        rozpoczęteDni.add(dzien.id)
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
          dodajFragmentModulu(aktualnaStrona, dzien, modul, [], true, 0, doplata, pomiarModulu.wysokoscCalego, czyDzienZostalRozpoczety)
          rozpoczęteDni.add(dzien.id)
          break
        }

        continue
      }

      while (indeksPoczatkowejGrupy < grupyPunktow.length) {
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

        if (czyNieDzielicPunktowGlownych && czyPierwszyFragmentModulu && modul.blok.tresc?.trim() && modul.trybTresc !== 'surowa') {
          const nowaStrona = utworzPustaStrone(aktualnaStrona.strona.numer + 1)
          const doplataNaNowejStronie = pobierzDoplateZaDodanieModulu(nowaStrona, dzien, czyDzienZostalRozpoczety, pomiary)
          if (doplataNaNowejStronie + pomiarModulu.wysokoscCalego <= pomiary.pojemnoscKolejnychStron) {
            utworzNowaStrone()
            continue
          }
        }

        const dostepnaWysokosc = pobierzPojemnoscStrony(aktualnaStrona, pomiary) - aktualnaStrona.wykorzystanaWysokosc - doplata
        let indeksKoncaGrupy = indeksPoczatkowejGrupy

        while (indeksKoncaGrupy < grupyPunktow.length) {
          const kandydat = grupyPunktow.slice(indeksPoczatkowejGrupy, indeksKoncaGrupy + 1)
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

          const grupa = grupyPunktow[indeksPoczatkowejGrupy]
          if (grupa.bloki.length > 1 && grupa.bloki.every((blok) => czyLiczbaJestPomiarem(pomiarModulu.wysokosciBlokow?.[blok.id]))) {
            const fragmenty = [grupa.bloki.slice(0, 2), ...grupa.bloki.slice(2).map((blok) => [blok])]
              .map((bloki) => ({ id: `${grupa.id}-fragment-${bloki[0].id}`, bloki }))
            if (grupa.bloki.length === 2) {
              problemy.push({ id: `za-duza-para-${grupa.id}`, blokId: grupa.bloki[0].id, komunikat: 'Punkt nadrzędny z pierwszym podpunktem przekracza obszar strony. Wymaga awaryjnego podziału.' })
            } else {
              let przesuniecieFragmentu = 0
              fragmenty.forEach((fragment) => {
                pomiarModulu.wysokosciGrup[fragment.id] = fragment.bloki.reduce((suma, blok) => suma + (pomiarModulu.wysokosciBlokow?.[blok.id] ?? 0), 0)
                  + (fragment.bloki.length - 1) * (pomiarModulu.wysokoscOdstepuMiedzyBlokami ?? 0)
                const wysokosc = pomiarModulu.wysokosciGrup[fragment.id]
                if (pomiarModulu.graniceWierszy?.[grupa.id]) {
                  pomiarModulu.graniceWierszy[fragment.id] = [...pomiarModulu.graniceWierszy[grupa.id]
                    .map((granica) => granica - przesuniecieFragmentu).filter((granica) => granica > 0 && granica < wysokosc), wysokosc]
                }
                przesuniecieFragmentu += wysokosc + (pomiarModulu.wysokoscOdstepuMiedzyBlokami ?? 0)
              })
              grupyPunktow.splice(indeksPoczatkowejGrupy, 1, ...fragmenty)
              indeksyNumeracji.splice(indeksPoczatkowejGrupy, 1, ...fragmenty.map(() => indeksyNumeracji[indeksPoczatkowejGrupy]))
              problemy.push({ id: `awaryjny-podzial-${grupa.id}`, blokId: grupa.bloki[0]?.id, komunikat: 'Zastosowano awaryjny podział zbyt wysokiej grupy punktów z zachowaniem rodzica i pierwszego podpunktu. Zachowano całą treść i kolejność.' })
              continue
            }
          }
          const wysokoscGrupy = pomiarModulu.wysokosciGrup[grupa.id] ?? 0
          const wysokoscBazy = czyPierwszyFragmentModulu ? pomiarModulu.wysokoscBazyZTytulem : pomiarModulu.wysokoscBazyBezTytulu
          const granice = pomiarModulu.graniceWierszy?.[grupa.id]
          if (!grupa.wycinek && granice?.length && wysokoscGrupy > dostepnaWysokosc - wysokoscBazy) {
            let przesuniecie = 0
            const fragmenty: GrupaPunktowProgramu[] = []
            while (przesuniecie < wysokoscGrupy) {
              const limit = fragmenty.length ? pomiary.pojemnoscKolejnychStron - pomiarModulu.wysokoscBazyBezTytulu : dostepnaWysokosc - wysokoscBazy
              const koniec = granice.filter((granica) => granica > przesuniecie && granica <= przesuniecie + limit).at(-1)
                ?? granice.find((granica) => granica > przesuniecie) ?? wysokoscGrupy
              const fragment = { ...grupa, id: `${grupa.id}-wycinek-${fragmenty.length}`, wycinek: { przesuniecie, wysokosc: koniec - przesuniecie } }
              fragmenty.push(fragment)
              pomiarModulu.wysokosciGrup[fragment.id] = koniec - przesuniecie
              przesuniecie = koniec
            }
            grupyPunktow.splice(indeksPoczatkowejGrupy, 1, ...fragmenty)
            indeksyNumeracji.splice(indeksPoczatkowejGrupy, 1, ...fragmenty.map(() => indeksyNumeracji[indeksPoczatkowejGrupy]))
            problemy.push({ id: `awaryjny-podzial-punktu-${grupa.id}`, blokId: grupa.bloki[0].id, komunikat: 'Pojedynczy punkt programu jest wyższy niż dostępny obszar jednej strony. Zastosowano awaryjny podział treści.' })
            continue
          }
          problemy.push({
            id: `za-duzy-punkt-${grupa.id}`,
            blokId: grupa.bloki[0]?.id,
            komunikat: 'Pojedynczy punkt programu jest wyższy niż dostępny obszar strony. Zachowano go w całości; wymaga sprawdzenia układu przed eksportem.',
          })
          dodajFragmentModulu(aktualnaStrona, dzien, modul, [grupa], czyPierwszyFragmentModulu, indeksyNumeracji[indeksPoczatkowejGrupy], doplata, pobierzWysokoscFragmentuModulu(pomiarModulu, [grupa], czyPierwszyFragmentModulu, 0), czyDzienZostalRozpoczety)
          rozpoczęteDni.add(dzien.id)
          czyPierwszyFragmentModulu = false
          indeksPoczatkowejGrupy += 1
          if (indeksPoczatkowejGrupy < grupyPunktow.length) utworzNowaStrone()
          continue
        }

        const grupyNaStronie = grupyPunktow.slice(indeksPoczatkowejGrupy, indeksKoncaGrupy)
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
          indeksyNumeracji[indeksPoczatkowejGrupy],
          doplata,
          wysokoscFragmentu,
          czyDzienZostalRozpoczety,
        )
        rozpoczęteDni.add(dzien.id)
        indeksPoczatkowejGrupy = indeksKoncaGrupy
        czyPierwszyFragmentModulu = false

        if (indeksPoczatkowejGrupy < grupyPunktow.length) {
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
