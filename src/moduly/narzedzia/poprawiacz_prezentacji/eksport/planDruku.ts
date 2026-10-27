export type OrientacjaPapieru = 'pionowa' | 'pozioma'
export type UstawieniaDruku = {
  profil: 'automatyczny' | 'reczny'
  papier: 'A4' | 'A3' | 'Letter'
  orientacja: OrientacjaPapieru
  slajdowNaStronie: 1 | 2
  zakres: string
  dwustronnie: boolean
  odwracanie: 'dluga' | 'krotka'
  marginesMm: number
  kolor: 'kolorowy' | 'szary'
  pustaStronaNaKoncu: boolean
}
export type DokumentDruku = { nazwa: string; ustawienia: UstawieniaDruku; strony: number[][] }
export type ObszarSlajduNaStronie = { x: number; y: number; szerokosc: number; wysokosc: number }

export function domyslneUstawieniaDruku(): UstawieniaDruku {
  return { profil: 'automatyczny', papier: 'A4', orientacja: 'pozioma', slajdowNaStronie: 1, zakres: '', dwustronnie: true, odwracanie: 'dluga', marginesMm: 8, kolor: 'kolorowy', pustaStronaNaKoncu: false }
}

export function rozmiarPapieru(ustawienia: Pick<UstawieniaDruku, 'papier' | 'orientacja'>) {
  const rozmiar = { A4: [210, 297], A3: [297, 420], Letter: [215.9, 279.4] }[ustawienia.papier]
  if (!rozmiar || !['pionowa', 'pozioma'].includes(ustawienia.orientacja)) throw new Error('Nieobsługiwany format papieru.')
  return ustawienia.orientacja === 'pionowa' ? { szerokosc: rozmiar[0], wysokosc: rozmiar[1] } : { szerokosc: rozmiar[1], wysokosc: rozmiar[0] }
}

export function odczytajZakresSlajdow(tekst: string, liczba: number) {
  if (!Number.isInteger(liczba) || liczba < 1) throw new Error('Prezentacja musi mieć przynajmniej jeden slajd.')
  if (!tekst.trim()) return Array.from({ length: liczba }, (_, indeks) => indeks + 1)
  const wybrane = new Set<number>()
  for (const fragment of tekst.split(',')) {
    const dopasowanie = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(fragment)
    if (!dopasowanie) throw new Error('Zakres slajdów podaj np. 1-10, 15, 20-25.')
    const poczatek = Number(dopasowanie[1]), koniec = Number(dopasowanie[2] ?? dopasowanie[1])
    if (poczatek < 1 || koniec > liczba || koniec < poczatek) throw new Error(`Zakres musi mieścić się między 1 a ${liczba}.`)
    for (let numer = poczatek; numer <= koniec; numer++) wybrane.add(numer)
  }
  return [...wybrane].sort((a, b) => a - b)
}

export function obszaryNaStronie(ustawienia: UstawieniaDruku): ObszarSlajduNaStronie[] {
  const papier = rozmiarPapieru(ustawienia)
  const margines = ustawienia.marginesMm
  if (!Number.isFinite(margines) || margines < 0 || margines > 50) throw new Error('Margines musi mieścić się w zakresie 0–50 mm.')
  if (![1, 2].includes(ustawienia.slajdowNaStronie)) throw new Error('Wybierz jeden lub dwa slajdy na stronie.')
  const przerwa = ustawienia.slajdowNaStronie === 2 ? 5 : 0
  const szerokosc = papier.szerokosc - 2 * margines
  const wysokosc = (papier.wysokosc - 2 * margines - przerwa) / ustawienia.slajdowNaStronie
  return Array.from({ length: ustawienia.slajdowNaStronie }, (_, indeks) => ({ x: margines, y: margines + indeks * (wysokosc + przerwa), szerokosc, wysokosc }))
}

export function dopasujProporcjonalnie(szerokosc: number, wysokosc: number, obszar: ObszarSlajduNaStronie): ObszarSlajduNaStronie {
  if (![szerokosc, wysokosc].every((wartosc) => Number.isFinite(wartosc) && wartosc > 0)) throw new Error('Nieprawidłowe wymiary slajdu.')
  const skala = Math.min(obszar.szerokosc / szerokosc, obszar.wysokosc / wysokosc)
  return { x: obszar.x + (obszar.szerokosc - szerokosc * skala) / 2, y: obszar.y + (obszar.wysokosc - wysokosc * skala) / 2, szerokosc: szerokosc * skala, wysokosc: wysokosc * skala }
}

export function przygotujPlanDruku(liczba: number, ustawienia: UstawieniaDruku): DokumentDruku[] {
  obszaryNaStronie(ustawienia)
  const numery = odczytajZakresSlajdow(ustawienia.zakres, liczba)
  const zbuduj = (nazwa: string, wybrane: number[], ustawieniaPliku: UstawieniaDruku): DokumentDruku => {
    const strony: number[][] = []
    for (let indeks = 0; indeks < wybrane.length; indeks += ustawieniaPliku.slajdowNaStronie) strony.push(wybrane.slice(indeks, indeks + ustawieniaPliku.slajdowNaStronie))
    if (ustawieniaPliku.dwustronnie && ustawieniaPliku.pustaStronaNaKoncu && strony.length % 2) strony.push([])
    return { nazwa, ustawienia: ustawieniaPliku, strony }
  }
  if (ustawienia.profil === 'automatyczny' && liczba > 100) {
    return [
      ...(numery.includes(1) ? [zbuduj('okladka_do_druku', [1], { ...ustawienia, orientacja: 'pionowa', slajdowNaStronie: 1, dwustronnie: false, pustaStronaNaKoncu: false })] : []),
      ...(numery.some((numer) => numer > 1) ? [zbuduj('materialy_do_druku', numery.filter((numer) => numer > 1), { ...ustawienia, orientacja: 'pozioma', slajdowNaStronie: 2 })] : []),
    ]
  }
  return [zbuduj('prezentacja_do_druku', numery, ustawienia)]
}

export function zaleceniaDruku(ustawienia: UstawieniaDruku) {
  return `${ustawienia.papier}, ${ustawienia.orientacja}, ${ustawienia.kolor === 'kolorowy' ? 'kolor' : 'skala szarości'}, ${ustawienia.dwustronnie ? `dwustronnie; odwracanie: ${ustawienia.odwracanie === 'dluga' ? 'dłuższa' : 'krótsza'} krawędź` : 'jednostronnie'}. Drukuj PDF w skali 100%, jedna strona PDF na arkusz. Ustawienia dwustronności i odwracania wybierz w sterowniku drukarki.`
}
