import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import {
  czyPomiaryProgramuSaKompletne,
  paginujProgram,
  type ModelPaginacjiProgramu,
  type PomiaryPaginacjiProgramu,
  type WynikPaginacjiProgramu,
} from './paginatorProgramu'

function pobierzWysokosc(element: Element | null) {
  return element instanceof HTMLElement ? element.getBoundingClientRect().height : Number.NaN
}

function pobierzWartoscStylu(element: Element | null, nazwa: 'gap' | 'marginBottom') {
  if (!(element instanceof HTMLElement)) {
    return Number.NaN
  }

  const style = window.getComputedStyle(element)
  const wartosc = nazwa === 'gap' ? style.rowGap : style.marginBottom
  return Number.parseFloat(wartosc)
}

function znajdzElementPoAtrybucie(obszar: HTMLElement, nazwaAtrybutu: string, wartosc: string) {
  return Array.from(obszar.querySelectorAll<HTMLElement>(`[${nazwaAtrybutu}]`)).find(
    (element) => element.getAttribute(nazwaAtrybutu) === wartosc,
  ) ?? null
}

function pobierzPomiaryZDomu(obszarPomiarowy: HTMLElement): PomiaryPaginacjiProgramu {
  const moduly: PomiaryPaginacjiProgramu['moduly'] = {}

  obszarPomiarowy.querySelectorAll<HTMLElement>('[data-pomiar-modulu]').forEach((element) => {
    const idModulu = element.dataset.pomiarModulu

    if (!idModulu) {
      return
    }

    moduly[idModulu] = {
      wysokoscCalego: pobierzWysokosc(znajdzElementPoAtrybucie(obszarPomiarowy, 'data-pomiar-modulu-calego', idModulu)),
      wysokoscBazyZTytulem: pobierzWysokosc(znajdzElementPoAtrybucie(obszarPomiarowy, 'data-pomiar-modulu-baza-z-tytulem', idModulu)),
      wysokoscBazyBezTytulu: pobierzWysokosc(znajdzElementPoAtrybucie(obszarPomiarowy, 'data-pomiar-modulu-baza-bez-tytulu', idModulu)),
      wysokosciGrup: {},
      wysokosciBlokow: {},
      graniceWierszy: {},
    }
  })

  obszarPomiarowy.querySelectorAll<HTMLElement>('[data-pomiar-grupy]').forEach((element) => {
    const [idModulu, idGrupy] = (element.dataset.pomiarGrupy ?? '').split('|')

    if (idModulu && idGrupy && moduly[idModulu]) {
      moduly[idModulu].wysokosciGrup[idGrupy] = pobierzWysokosc(element)
      moduly[idModulu].wysokoscOdstepuMiedzyBlokami = pobierzWartoscStylu(element, 'gap') || 0
      const zakres = document.createRange()
      const poczatek = element.getBoundingClientRect().top
      const prostokaty: DOMRect[] = []
      const wezly = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      while (wezly.nextNode()) {
        zakres.selectNodeContents(wezly.currentNode)
        prostokaty.push(...Array.from(zakres.getClientRects()))
      }
      const dolneKrawedzie = [...new Set(prostokaty.map((prostokat) => prostokat.bottom - poczatek))].sort((a, b) => a - b)
      const granice = dolneKrawedzie.map((dol) => {
        const nastepnaGora = Math.min(...prostokaty.filter((prostokat) => prostokat.top - poczatek >= dol).map((prostokat) => prostokat.top - poczatek))
        return Number.isFinite(nastepnaGora) ? (dol + nastepnaGora) / 2 : pobierzWysokosc(element)
      })
      moduly[idModulu].graniceWierszy![idGrupy] = [...new Set(granice)]
      element.querySelectorAll<HTMLElement>('[data-pomiar-bloku]').forEach((blok) => {
        const idBloku = blok.dataset.pomiarBloku
        if (idBloku) moduly[idModulu].wysokosciBlokow![idBloku] = pobierzWysokosc(blok)
      })
    }
  })

  const wysokosciNaglowkowDni = Array.from(obszarPomiarowy.querySelectorAll<HTMLElement>('[data-pomiar-naglowka-dnia]')).reduce<Record<string, number>>(
    (wynik, element) => {
      const idDnia = element.dataset.pomiarNaglowkaDnia

      if (idDnia) {
        wynik[idDnia] = pobierzWysokosc(element)
      }

      return wynik
    },
    {},
  )

  const pierwszyModul = obszarPomiarowy.querySelector<HTMLElement>('[data-pomiar-modulu-calego]')
  const kolejnyModul = obszarPomiarowy.querySelector<HTMLElement>('[data-pomiar-modulu-kolejnego]')
  const dodatkowaWysokoscKolejnegoModulu = Math.max(0, pobierzWysokosc(kolejnyModul) - pobierzWysokosc(pierwszyModul))

  return {
    pojemnoscPierwszejStrony: pobierzWysokosc(obszarPomiarowy.querySelector('[data-pomiar-pojemnosci="pierwsza"]')),
    pojemnoscKolejnychStron: pobierzWysokosc(obszarPomiarowy.querySelector('[data-pomiar-pojemnosci="kolejna"]')),
    wysokosciNaglowkowDni,
    wysokoscOdstepuMiedzyDniami: pobierzWartoscStylu(obszarPomiarowy.querySelector('[data-pomiar-dnia]'), 'marginBottom'),
    wysokoscOdstepuMiedzyModulami: pobierzWartoscStylu(obszarPomiarowy.querySelector('[data-pomiar-modulow]'), 'gap') + dodatkowaWysokoscKolejnegoModulu,
    wysokoscOdstepuMiedzyPunktami: pobierzWartoscStylu(obszarPomiarowy.querySelector('[data-pomiar-listy]'), 'gap'),
    moduly,
  }
}

function utworzSygnatureWyniku(wynik: WynikPaginacjiProgramu) {
  return JSON.stringify({
    strony: wynik.strony.map((strona) =>
      strona.fragmentyDni.map((fragmentDnia) => [
        fragmentDnia.dzien.id,
        fragmentDnia.czyPokazacNaglowek,
        fragmentDnia.moduly.map((fragmentModulu) => [
          fragmentModulu.modul.id,
          fragmentModulu.czyPokazacTytul,
          fragmentModulu.poczatkowyIndeksNumeracji,
          fragmentModulu.grupyPunktow.map((grupa) => grupa.id),
          fragmentModulu.grupyPunktow.map((grupa) => grupa.wycinek),
        ]),
      ]),
    ),
    problemy: wynik.problemy.map((problem) => problem.id),
  })
}

export function usePaginacjaProgramu(model: ModelPaginacjiProgramu, kluczUkladu: string) {
  const obszarPomiarowyRef = useRef<HTMLDivElement>(null)
  const [stanWyniku, ustawStanWyniku] = useState<{ kluczUkladu: string; wynik: WynikPaginacjiProgramu } | null>(null)
  const sygnaturaWynikuRef = useRef('')

  const przeliczPaginacje = useCallback(() => {
    const obszarPomiarowy = obszarPomiarowyRef.current

    if (!obszarPomiarowy) {
      return
    }

    const pomiary = pobierzPomiaryZDomu(obszarPomiarowy)

    if (!czyPomiaryProgramuSaKompletne(model, pomiary)) {
      return
    }

    const nowyWynik = paginujProgram(model, pomiary)
    const sygnatura = `${kluczUkladu}|${utworzSygnatureWyniku(nowyWynik)}`

    if (sygnatura === sygnaturaWynikuRef.current) {
      return
    }

    sygnaturaWynikuRef.current = sygnatura
    ustawStanWyniku({ kluczUkladu, wynik: nowyWynik })
  }, [kluczUkladu, model])

  useLayoutEffect(() => {
    const obszarPomiarowy = obszarPomiarowyRef.current

    if (!obszarPomiarowy) {
      return undefined
    }

    let identyfikatorKlatki = window.requestAnimationFrame(przeliczPaginacje)
    const obserwator = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
      window.cancelAnimationFrame(identyfikatorKlatki)
      identyfikatorKlatki = window.requestAnimationFrame(przeliczPaginacje)
    })

    obserwator?.observe(obszarPomiarowy)

    const obrazy = Array.from(obszarPomiarowy.querySelectorAll('img'))
    obrazy.forEach((obraz) => obraz.addEventListener('load', przeliczPaginacje))
    void document.fonts?.ready.then(przeliczPaginacje)

    return () => {
      window.cancelAnimationFrame(identyfikatorKlatki)
      obserwator?.disconnect()
      obrazy.forEach((obraz) => obraz.removeEventListener('load', przeliczPaginacje))
    }
  }, [przeliczPaginacje])

  return {
    obszarPomiarowyRef: obszarPomiarowyRef as RefObject<HTMLDivElement>,
    wynik: stanWyniku?.wynik ?? null,
    czyPomiaryGotowe: stanWyniku?.kluczUkladu === kluczUkladu,
  }
}
