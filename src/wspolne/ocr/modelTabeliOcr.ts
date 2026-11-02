export type ObszarOcr = { x: number; y: number; szerokosc: number; wysokosc: number }
export type SlowoOcr = ObszarOcr & { tekst: string; pewnosc: number }
export type KomorkaOcr = { tekst: string; pewnosc: number; zweryfikowana: boolean; obszar?: ObszarOcr; podpis?: boolean }
export type TabelaOcr = { id: string; strona: number; naglowki: string[]; wiersze: KomorkaOcr[][]; zaznaczone: number[]; informacje: string; odręczna: boolean }
export type UczestnikOcr = { imieINazwisko: string; firma?: string }
export const opisyGrafikiPodpisu = ['Grafika — sprawdź oryginał', 'Nie wykryto grafiki', 'Niejednoznaczna grafika']
export function opisPodpisuDoEksportu(tekst: string) { return opisyGrafikiPodpisu.includes(tekst) ? tekst : opisyGrafikiPodpisu[0] }

export function ocenObecnoscGrafikiPodpisu(piksele: Uint8ClampedArray) {
  let ciemne = 0, probki = 0
  for (let indeks = 0; indeks < piksele.length; indeks += 16) {
    probki++
    if (piksele[indeks] + piksele[indeks + 1] + piksele[indeks + 2] < 450) ciemne++
  }
  return ciemne === 0 ? opisyGrafikiPodpisu[1] : ciemne / Math.max(1, probki) < 0.005 ? opisyGrafikiPodpisu[2] : opisyGrafikiPodpisu[0]
}

export function kluczNazwyOcr(tekst: string) { return tekst.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pl') }
export function czyPodpisOcr(tekst: string) { return /podpis|signature/i.test(tekst) }
export function rolaKolumnyOcr(tekst: string) {
  const nazwa = tekst.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')
  return czyPodpisOcr(nazwa) ? 'podpis' : /nazwisko/.test(nazwa) && /imie/.test(nazwa) ? 'pelna' : /nazwisko/.test(nazwa) ? 'nazwisko' : /imie/.test(nazwa) ? 'imie' : /firma|zespol|dzial|jednostk/.test(nazwa) ? 'firma' : 'inna'
}

export function zbudujTabeleOcr(slowa: SlowoOcr[], pionowe: number[], poziome: number[], strona: number, odreczna = false): TabelaOcr {
  const komorka = (obszar: ObszarOcr): KomorkaOcr => {
    const wybrane = slowa.filter((slowo) => slowo.x + slowo.szerokosc / 2 > obszar.x && slowo.x + slowo.szerokosc / 2 < obszar.x + obszar.szerokosc && slowo.y + slowo.wysokosc / 2 > obszar.y && slowo.y + slowo.wysokosc / 2 < obszar.y + obszar.wysokosc).sort((a, b) => Math.abs(a.y - b.y) > Math.min(a.wysokosc, b.wysokosc) / 2 ? a.y - b.y : a.x - b.x)
    return { tekst: wybrane.map((slowo) => slowo.tekst).join(' '), pewnosc: wybrane.length ? Math.min(...wybrane.map((slowo) => slowo.pewnosc), odreczna ? 60 : 100) : 0, zweryfikowana: false, obszar }
  }
  let naglowki: string[] = []
  let wiersze: KomorkaOcr[][] = []
  if (pionowe.length >= 3 && poziome.length >= 3) {
    const siatka = poziome.slice(0, -1).map((y, indeks) => pionowe.slice(0, -1).map((x, kolumna) => komorka({ x, y, szerokosc: pionowe[kolumna + 1] - x, wysokosc: poziome[indeks + 1] - y })))
    naglowki = siatka[0].map((pole, indeks) => pole.tekst || `Kolumna ${indeks + 1}`)
    wiersze = siatka.slice(1)
  } else {
    // Dla tabel bez linii zachowujemy geometrię wierszy i granice wynikające z nagłówków.
    const linie: SlowoOcr[][] = []
    for (const slowo of [...slowa].sort((a, b) => a.y - b.y || a.x - b.x)) {
      const linia = linie.find((wiersz) => Math.abs(wiersz[0].y - slowo.y) < Math.max(6, slowo.wysokosc * 0.6))
      if (linia) linia.push(slowo); else linie.push([slowo])
    }
    const indeksNaglowka = linie.findIndex((linia) => linia.some((slowo) => /nazwisko|imi[eę]/i.test(slowo.tekst)))
    if (indeksNaglowka >= 0) {
      const naglowek = linie[indeksNaglowka].sort((a, b) => a.x - b.x)
      const grupy: SlowoOcr[][] = []
      for (const slowo of naglowek) {
        const poprzednia = grupy.at(-1)
        const ostatnie = poprzednia?.at(-1)
        if (ostatnie && slowo.x - ostatnie.x - ostatnie.szerokosc < Math.max(16, slowo.wysokosc * 1.1)) poprzednia!.push(slowo)
        else grupy.push([slowo])
      }
      naglowki = grupy.map((grupa) => grupa.map((slowo) => slowo.tekst).join(' '))
      const granice = grupy.map((grupa) => grupa[0].x - 4)
      wiersze = linie.slice(indeksNaglowka + 1).map((linia) => granice.map((x, indeks) => komorka({ x, y: Math.min(...linia.map((s) => s.y)) - 2, szerokosc: (granice[indeks + 1] ?? Math.max(...slowa.map((s) => s.x + s.szerokosc)) + 8) - x, wysokosc: Math.max(...linia.map((s) => s.wysokosc)) + 5 })))
    }
  }
  wiersze = wiersze.map((wiersz) => wiersz.map((pole, indeks) => czyPodpisOcr(naglowki[indeks]) ? { ...pole, tekst: 'Grafika — sprawdź oryginał', podpis: true, pewnosc: 0 } : pole))
  return { id: crypto.randomUUID(), strona, naglowki, wiersze, zaznaczone: [], informacje: slowa.filter((s) => !poziome.length || s.y < poziome[0]).map((s) => s.tekst).join(' '), odręczna: odreczna }
}

export function pobierzUczestnikowOcr(tabele: TabelaOcr[]): UczestnikOcr[] {
  const wynik: UczestnikOcr[] = []
  for (const tabela of tabele) {
    const role = tabela.naglowki.map(rolaKolumnyOcr)
    if (!role.includes('pelna') && !(role.includes('imie') && role.includes('nazwisko'))) throw new Error('Wskaż kolumnę „Imię i nazwisko” albo oddzielne kolumny „Imię” i „Nazwisko”.')
    for (const indeks of tabela.zaznaczone) {
      const wiersz = tabela.wiersze[indeks]
      if (!wiersz) continue
      const pola = wiersz.filter((_, kolumna) => ['pelna', 'imie', 'nazwisko', 'firma'].includes(role[kolumna]))
      if (pola.some((pole) => pole.podpis)) throw new Error('Obszaru podpisu nie można użyć jako danych uczestnika. Sprawdź nagłówki i oryginał.')
      if (pola.some((pole) => !pole.zweryfikowana)) throw new Error('Zweryfikuj dane osób w zaznaczonych wierszach przed importem.')
      const wartosc = (rola: ReturnType<typeof rolaKolumnyOcr>) => wiersz[role.indexOf(rola)]?.tekst.trim() ?? ''
      const nazwa = wartosc('pelna') || `${wartosc('imie')} ${wartosc('nazwisko')}`.trim()
      if (nazwa.split(/\s+/).length < 2 || !/\p{L}/u.test(nazwa)) throw new Error('Uzupełnij imię i nazwisko w zaznaczonych wierszach.')
      wynik.push({ imieINazwisko: nazwa, firma: wartosc('firma') || undefined })
    }
  }
  if (!wynik.length) throw new Error('Zaznacz co najmniej jeden zweryfikowany wiersz.')
  return wynik
}

export function dodajUczestnikowBezDuplikatow<Typ extends { id: string; imieINazwisko: string }>(obecni: Typ[], nowi: UczestnikOcr[]) {
  const znane = new Set(obecni.map((osoba) => kluczNazwyOcr(osoba.imieINazwisko)))
  const dodani: (UczestnikOcr & { id: string; czyReczny: true })[] = []
  for (const osoba of nowi) {
    const klucz = kluczNazwyOcr(osoba.imieINazwisko)
    if (znane.has(klucz)) continue
    znane.add(klucz)
    dodani.push({ ...osoba, id: crypto.randomUUID(), czyReczny: true })
  }
  return [...obecni, ...dodani]
}
