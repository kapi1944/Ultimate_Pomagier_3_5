import { pobierzLogoOrganizatora } from '../../../../wspolne/dokumenty/logoOrganizatora'
import { zbudujKontekstZeSzczegolow } from '../../../../wspolne/integracje/szczegolyDoDokumentow/zbudujKontekstZeSzczegolow'
import { czyPozycjaJestAktywna, formatujDateDoWydruku, pobierzDaneSzkoleniaChecklisty, pobierzIloscPozycji } from './modelChecklistyPaczki'
import type { DokumentChecklistyPaczki, SzczegolyDoChecklisty } from './rejestrChecklistPaczek'

export const celeEtykiety = { s: 'Szczegóły', k: 'Kompletowanie', m: 'Materiały' } as const
export type CelEtykiety = keyof typeof celeEtykiety
export type TrybEtykiety = 'termiczny' | 'kolorowy'
export type WymiaryEtykiety = { szerokosc: number; wysokosc: number }
export const domyslneWymiaryEtykiety: WymiaryEtykiety = { szerokosc: 100, wysokosc: 150 }

export function czyWymiaryEtykietyPoprawne({ szerokosc, wysokosc }: WymiaryEtykiety) {
  return Number.isFinite(szerokosc) && szerokosc >= 88 && szerokosc <= 220 && Number.isFinite(wysokosc) && wysokosc >= 80 && wysokosc <= 320
}

export function utworzAdresyEtykiety(dokumentId: string, paczkaId: string) {
  const sciezka = `/dokumenty/checklisty-paczek/${encodeURIComponent(dokumentId)}`
  const adres = (cel: CelEtykiety) => `${sciezka}?cel=${cel}#paczka-${encodeURIComponent(paczkaId)}`
  return { s: adres('s'), k: adres('k'), m: adres('m') }
}

export function odczytajCelEtykiety(wyszukiwanie: string, kotwica: string): { cel: CelEtykiety; paczkaId: string } | null {
  const cel = new URLSearchParams(wyszukiwanie).get('cel')
  if (cel !== 's' && cel !== 'k' && cel !== 'm') return null
  return { cel, paczkaId: odczytajPaczkeZKotwicy(kotwica) }
}

export function odczytajPaczkeZKotwicy(kotwica: string) {
  if (!kotwica.startsWith('#paczka-')) return ''
  try { return decodeURIComponent(kotwica.slice('#paczka-'.length)) } catch { return '' }
}

export function pobierzEtykietyPaczek(dokument: DokumentChecklistyPaczki, szczegoly?: SzczegolyDoChecklisty) {
  const dane = dokument.daneDokumentu
  const biezace = pobierzDaneSzkoleniaChecklisty(dane)
  const grupa = szczegoly && dane.grupaId ? zbudujKontekstZeSzczegolow(szczegoly.zrodloKontekstu).grupy.find((grupa) => grupa.id === dane.grupaId) : undefined
  const migawka = dane.migawkaZrodla
  const wybierz = <Wartosc,>(biezaca: Wartosc, pierwotna: Wartosc | undefined, aktualna: Wartosc | undefined) =>
    aktualna !== undefined && (!migawka || JSON.stringify(biezaca) === JSON.stringify(pierwotna)) ? aktualna : biezaca
  const miejsceGrupy = grupa?.lokalizacje.map((miejsce) => [miejsce.nazwa, miejsce.adres, miejsce.sala].filter(Boolean).join(', ')).filter(Boolean)
  const miejsce = wybierz(biezace.miejsce, migawka?.miejsce, miejsceGrupy?.length ? [...new Set(miejsceGrupy)].join('\n') : grupa?.tryb ?? undefined)
  const miasto = miejsce.match(/\b\d{2}-\d{3}\s+([^,\n]+)/)?.[1]?.trim() || grupa?.lokalizacje[0]?.nazwa || ''
  const uczestnicy = wybierz(biezace.liczbaUczestnikow, migawka?.liczbaUczestnikow, grupa?.liczbaUczestnikow)
  const terminy = wybierz(biezace.terminy, migawka?.terminy, grupa?.daty)
  const organizator = (grupa ? szczegoly?.dane.organizator : biezace.organizator)?.trim().toUpperCase() ?? ''
  const logo = organizator === 'SEMPER' || organizator === 'IIST' ? pobierzLogoOrganizatora(organizator) : ''
  const paczki = [...dane.paczki].sort((pierwsza, druga) => pierwsza.kolejnosc - druga.kolejnosc)
  const kategorie = new Map(dane.kategorie.map((kategoria) => [kategoria.id, kategoria.kolejnosc]))
  return paczki.map((paczka, indeks) => {
    const korekta = dane.korektyEtykiet?.[paczka.id]
    const pozycjeZrodlowe = dane.pozycje.filter((pozycja) => pozycja.paczkaId === paczka.id && !pozycja.czyOnline && czyPozycjaJestAktywna(pozycja))
      .sort((pierwsza, druga) => (kategorie.get(pierwsza.kategoriaId) ?? 0) - (kategorie.get(druga.kategoriaId) ?? 0) || pierwsza.kolejnosc - druga.kolejnosc)
      .map((pozycja) => ({
        id: pozycja.id, nazwa: pozycja.nazwa, ilosc: pobierzIloscPozycji(pozycja, uczestnicy, new Set(terminy).size).koncowa,
        uwagi: pozycja.uwagiDrukowane,
      }))
    const pozycje = pozycjeZrodlowe.map((pozycja) => ({ ...pozycja, ...korekta?.pozycje?.[pozycja.id] }))
    const tresc = {
      paczkaId: paczka.id, nazwaPaczki: paczka.nazwa, numer: indeks + 1, razem: paczki.length, organizator, logo,
      kod: korekta?.kod ?? szczegoly?.dane.kodSzkolenia?.trim() ?? '',
      tytul: wybierz(biezace.tytulSzkolenia, migawka?.tytulSzkolenia, szczegoly?.dane.tytulSzkolenia),
      grupa: wybierz(biezace.nazwaGrupy, migawka?.nazwaGrupy, grupa?.nazwa), uczestnicy, miasto, miejsce,
      termin: terminy.map(formatujDateDoWydruku).join(', '),
      trenerzy: wybierz(biezace.trenerzy, migawka?.trenerzy, grupa?.trenerzy.map((trener) => trener.imieINazwisko)),
      uwagi: korekta?.uwagi ?? szczegoly?.dane.odbiorcaPaczki.informacjaNaEtykiecie ?? '', pozycje,
    }
    const odcisk = JSON.stringify([dane.szczegolyOrganizacyjneId, dane.grupaId, tresc, szczegoly?.dane.odbiorcaPaczki.informacjaNaEtykiecie,
      grupa?.daty, grupa?.liczbaUczestnikow, grupa?.nazwa, korekta?.pozycje ? pozycjeZrodlowe : null])
    const wydruki = dane.historia.filter((wpis) => wpis.paczkaId === paczka.id && wpis.wydrukEtykiety)
    const ostatniPotwierdzony = wydruki.findLast((wpis) => wpis.wydrukEtykiety?.czyPotwierdzony)?.wydrukEtykiety
    const ostatni = ostatniPotwierdzony ?? wydruki.at(-1)?.wydrukEtykiety
    return { ...tresc, odcisk, wydruki, czyNieaktualna: Boolean(ostatni && ostatni.odcisk !== odcisk),
      adresy: utworzAdresyEtykiety(dokument.id, paczka.id), czyPowiazana: Boolean(grupa) }
  })
}

export type EtykietaPaczki = ReturnType<typeof pobierzEtykietyPaczek>[number]
