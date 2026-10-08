import type { Produkt, StanZakupow, WariantProduktu } from '../modele/zakupy'

export function obliczMiarkeStanu(stan: number, cel?: number) {
  if (cel === undefined || !Number.isFinite(cel) || cel <= 0) {
    return { procent: null, aktywneSegmenty: 0, kolor: 'neutralny' } as const
  }
  const procent = (stan / cel) * 100
  const aktywneSegmenty = stan === 0 ? 0 : Math.max(1, Math.min(10, Math.ceil((stan / cel) * 10)))
  const kolor = aktywneSegmenty === 0 ? 'neutralny' : aktywneSegmenty <= 3 ? 'czerwony' : aktywneSegmenty <= 6 ? 'pomaranczowy' : 'zielony'
  return { procent, aktywneSegmenty, kolor }
}

export const filtryStanow = [
  { id: 'wszystkie', etykieta: 'Wszystkie' },
  { id: 'do_zamowienia', etykieta: 'Do zamówienia' },
  { id: 'niski', etykieta: 'Niski stan' },
  { id: 'prawidlowy', etykieta: 'Stan prawidłowy' },
  { id: 'brak', etykieta: 'Brak' },
  { id: 'do_przeliczenia', etykieta: 'Do przeliczenia' },
  { id: 'materialy', etykieta: 'Materiały' },
  { id: 'sprzet', etykieta: 'Sprzęt' },
] as const

export type FiltrStanow = typeof filtryStanow[number]['id']

export type WierszStanuMagazynowego = {
  id: string
  produkt: Produkt
  wariant?: WariantProduktu
  stan: number
  minimum?: number
  cel?: number
  lokalizacje: { id: string; nazwa: string; ilosc: number }[]
  ostatniaInwentaryzacja?: string
  czyDoPrzeliczenia: boolean
}

export function wyliczStanyMagazynowe(dane: StanZakupow): WierszStanuMagazynowego[] {
  function utworzWiersz(produkt: Produkt, wariant?: WariantProduktu): WierszStanuMagazynowego {
    const pasujeProdukt = (pozycja: { produktId: string; wariantProduktuId?: string }) => pozycja.produktId === produkt.id && (!wariant || pozycja.wariantProduktuId === wariant.id)
    const stany = dane.stanyWLokalizacjach.filter(pasujeProdukt)
    const lokalizacje = [...new Set(stany.map((stan) => stan.lokalizacjaId))].map((id) => ({
      id,
      nazwa: dane.lokalizacjeMagazynowe.find((lokalizacja) => lokalizacja.id === id)?.nazwa ?? 'Nieznana lokalizacja',
      ilosc: stany.filter((stan) => stan.lokalizacjaId === id).reduce((suma, stan) => suma + stan.ilosc, 0),
    }))
    const przeliczenia = dane.pozycjeInwentaryzacji.filter(pasujeProdukt).flatMap((pozycja) => {
      const inwentaryzacja = dane.inwentaryzacje.find((obecna) => obecna.id === pozycja.inwentaryzacjaId)
      return inwentaryzacja ? [{ pozycja, inwentaryzacja }] : []
    })
    const zakonczone = przeliczenia.filter(({ pozycja, inwentaryzacja }) => inwentaryzacja.status === 'ZAMKNIETA' && inwentaryzacja.zakonczono && pozycja.iloscStwierdzona !== undefined)
    const daty = zakonczone.map(({ inwentaryzacja }) => inwentaryzacja.zakonczono!).sort()
    const brakPrzeliczenia = stany.length === 0 ? zakonczone.length === 0 : stany.some((stan) => !zakonczone.some(({ pozycja, inwentaryzacja }) =>
      inwentaryzacja.lokalizacjaId === stan.lokalizacjaId && pozycja.wariantProduktuId === stan.wariantProduktuId && pozycja.egzemplarzProduktuId === stan.egzemplarzProduktuId))
    return {
      id: wariant ? `wariant:${wariant.id}` : `produkt:${produkt.id}`,
      produkt, wariant,
      stan: lokalizacje.reduce((suma, lokalizacja) => suma + lokalizacja.ilosc, 0),
      minimum: (wariant ?? produkt).stanMinimalny,
      cel: (wariant ?? produkt).stanDocelowy,
      lokalizacje,
      ostatniaInwentaryzacja: daty.at(-1),
      czyDoPrzeliczenia: brakPrzeliczenia || przeliczenia.some(({ inwentaryzacja }) => inwentaryzacja.status === 'W_TRAKCIE'),
    }
  }

  return dane.produkty.flatMap((produkt) => [
    utworzWiersz(produkt),
    ...dane.wariantyProduktow.filter((wariant) => wariant.produktId === produkt.id).map((wariant) => utworzWiersz(produkt, wariant)),
  ])
}

export function czyWierszPasujeDoFiltra(wiersz: WierszStanuMagazynowego, filtr: FiltrStanow) {
  const miarka = obliczMiarkeStanu(wiersz.stan, wiersz.cel)
  switch (filtr) {
    case 'wszystkie': return true
    case 'do_zamowienia': return wiersz.stan === 0 || (wiersz.minimum !== undefined && wiersz.stan < wiersz.minimum)
    case 'niski': return miarka.aktywneSegmenty >= 1 && miarka.aktywneSegmenty <= 6
    case 'prawidlowy': return miarka.aktywneSegmenty >= 7
    case 'brak': return wiersz.stan === 0
    case 'do_przeliczenia': return wiersz.czyDoPrzeliczenia
    case 'materialy': return wiersz.produkt.rodzaj === 'MATERIAL_ZUZYWALNY'
    case 'sprzet': return wiersz.produkt.rodzaj === 'SPRZET'
  }
}
