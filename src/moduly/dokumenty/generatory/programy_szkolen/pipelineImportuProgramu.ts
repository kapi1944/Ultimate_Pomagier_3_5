import type { ProblemDokumentu } from '../../../../wspolne/dokumenty/modelBlokowy'
import { parsujTekstProgramu } from './ParserTekstu'
import {
  normalizujProgramSzkolenia,
  utworzDokumentProgramuSzkolenia,
  walidujProgramSzkolenia,
  type ModelProgramuSzkolenia,
} from './modelProgramuSzkolenia'

export type RodzajZrodlaImportuProgramu = 'TEKST' | 'DOCX' | 'PDF' | 'EMAIL'
export type PewnoscDanychImportu = 'PEWNE' | 'NIEPEWNE' | 'BRAK'
export type PoleImportuProgramu = 'tytulSzkolenia' | 'trescProgramu'
export type TrybZastosowaniaImportuProgramu = 'UZUPELNIJ' | 'ZASTAP'

export type PropozycjaImportuProgramu = {
  pole: PoleImportuProgramu
  wartosc: string
  pewnosc: PewnoscDanychImportu
  wymagaDecyzjiUzytkownika: boolean
}

export type WynikImportuProgramu = {
  zrodlo: RodzajZrodlaImportuProgramu
  znalezioneDane: Partial<Record<PoleImportuProgramu, string>>
  propozycje: PropozycjaImportuProgramu[]
  ostrzezenia: string[]
  bledy: string[]
  daneWymagajaceDecyzji: PoleImportuProgramu[]
}

export type StanZmianyImportuProgramu = 'GOTOWA_DO_ZASTOSOWANIA' | 'WYMAGA_SPRAWDZENIA' | 'KONFLIKT' | 'BEZ_ZMIANY'

export type ZmianaImportuProgramu = PropozycjaImportuProgramu & {
  wartoscAktualna: string
  stan: StanZmianyImportuProgramu
}

export type WynikZastosowaniaImportuProgramu = {
  model: ModelProgramuSzkolenia
  zmiany: ZmianaImportuProgramu[]
  zastosowanePola: PoleImportuProgramu[]
  problemyWalidacji: ProblemDokumentu[]
}

type DaneWynikuImportuProgramu = Omit<WynikImportuProgramu, 'znalezioneDane' | 'daneWymagajaceDecyzji'>

function czyPusta(wartosc: string) {
  return !wartosc.trim()
}

function pobierzWartoscPola(model: ModelProgramuSzkolenia, pole: PoleImportuProgramu) {
  return model[pole]
}

export function utworzWynikImportuProgramu(dane: DaneWynikuImportuProgramu): WynikImportuProgramu {
  const propozycje = dane.propozycje.filter((propozycja) => propozycja.pewnosc !== 'BRAK' && !czyPusta(propozycja.wartosc))

  return {
    ...dane,
    propozycje,
    znalezioneDane: Object.fromEntries(propozycje.map((propozycja) => [propozycja.pole, propozycja.wartosc])),
    daneWymagajaceDecyzji: propozycje
      .filter((propozycja) => propozycja.wymagaDecyzjiUzytkownika || propozycja.pewnosc === 'NIEPEWNE')
      .map((propozycja) => propozycja.pole),
  }
}

export function importujTekstProgramu(tekst: string): WynikImportuProgramu {
  const program = parsujTekstProgramu(tekst)
  const czyTekstNiepewny = program.ostrzezenia.length > 0

  return utworzWynikImportuProgramu({
    zrodlo: 'TEKST',
    propozycje: czyPusta(tekst)
      ? []
      : [{
          pole: 'trescProgramu',
          wartosc: tekst,
          pewnosc: czyTekstNiepewny ? 'NIEPEWNE' : 'PEWNE',
          wymagaDecyzjiUzytkownika: czyTekstNiepewny,
        }],
    ostrzezenia: program.ostrzezenia.map((ostrzezenie) => ostrzezenie.tresc),
    bledy: czyPusta(tekst) ? ['Nie znaleziono treści programu do importu.'] : [],
  })
}

export function przygotujZmianyImportuProgramu(
  aktualnyModel: ModelProgramuSzkolenia,
  wynikImportu: WynikImportuProgramu,
): ZmianaImportuProgramu[] {
  const model = normalizujProgramSzkolenia(aktualnyModel)

  return wynikImportu.propozycje.map((propozycja) => {
    const wartoscAktualna = pobierzWartoscPola(model, propozycja.pole)
    const czyKonflikt = !czyPusta(wartoscAktualna) && wartoscAktualna !== propozycja.wartosc
    const stan = wartoscAktualna === propozycja.wartosc
      ? 'BEZ_ZMIANY'
      : czyKonflikt
        ? 'KONFLIKT'
        : propozycja.pewnosc === 'NIEPEWNE' || propozycja.wymagaDecyzjiUzytkownika
          ? 'WYMAGA_SPRAWDZENIA'
          : 'GOTOWA_DO_ZASTOSOWANIA'

    return { ...propozycja, wartoscAktualna, stan }
  })
}

export function pobierzDomyslnieZaakceptowanePolaImportuProgramu(
  aktualnyModel: ModelProgramuSzkolenia,
  wynikImportu: WynikImportuProgramu,
): PoleImportuProgramu[] {
  return przygotujZmianyImportuProgramu(aktualnyModel, wynikImportu)
    .filter((zmiana) => zmiana.pewnosc === 'PEWNE' && zmiana.stan === 'GOTOWA_DO_ZASTOSOWANIA')
    .map((zmiana) => zmiana.pole)
}

export function zastosujZaakceptowaneZmianyImportuProgramu(
  aktualnyModel: ModelProgramuSzkolenia,
  wynikImportu: WynikImportuProgramu,
  tryb: TrybZastosowaniaImportuProgramu = 'UZUPELNIJ',
  zaakceptowanePola: readonly PoleImportuProgramu[] = [],
): WynikZastosowaniaImportuProgramu {
  const model = normalizujProgramSzkolenia(aktualnyModel)
  const zmiany = przygotujZmianyImportuProgramu(model, wynikImportu)
  const zaakceptowanePolaZbior = new Set(zaakceptowanePola)
  const propozycjeDoZastosowania = zmiany.filter((zmiana) =>
    zaakceptowanePolaZbior.has(zmiana.pole)
      && (zmiana.stan === 'GOTOWA_DO_ZASTOSOWANIA'
        || zmiana.stan === 'WYMAGA_SPRAWDZENIA'
        || (tryb === 'ZASTAP' && zmiana.stan === 'KONFLIKT')),
  )
  const danePoImporcie = propozycjeDoZastosowania.reduce<ModelProgramuSzkolenia>(
    (wynik, zmiana) => ({ ...wynik, [zmiana.pole]: zmiana.wartosc }),
    model,
  )
  const modelPoImporcie = normalizujProgramSzkolenia({
    ...danePoImporcie,
    czyWynikParsowaniaZatwierdzony: propozycjeDoZastosowania.some((zmiana) => zmiana.pole === 'trescProgramu')
      ? false
      : danePoImporcie.czyWynikParsowaniaZatwierdzony,
  })
  const dokument = utworzDokumentProgramuSzkolenia(modelPoImporcie)

  return {
    model: modelPoImporcie,
    zmiany,
    zastosowanePola: propozycjeDoZastosowania.map((zmiana) => zmiana.pole),
    problemyWalidacji: walidujProgramSzkolenia(modelPoImporcie, dokument),
  }
}
