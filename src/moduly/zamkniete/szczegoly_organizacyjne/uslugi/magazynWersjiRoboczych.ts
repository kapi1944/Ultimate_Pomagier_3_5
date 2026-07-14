import type { KontoSzczegolow } from '../uzytkownicySzczegolow'
import type {
  AutosaveSzczegolow,
  DaneAdresatow,
  DaneFormularza,
  GrupaSzkoleniowa,
  KopiaRoboczaSzkolenia,
  OpublikowaneSzczegolyOrganizacyjne,
  StatusOpublikowanychSzczegolow,
  StatusSzkolenia,
  StatusyPolImportu,
  WersjaRoboczaGeneratora,
  WpisHistoriiSzczegolow,
} from '../typy'
import { utworzPoczatkowaGrupe } from '../danePoczatkowe'
import {
  pobierzKopieRoboczeGeneratora,
  usunKopieRobocza as usunWspolnaKopieRobocza,
  zapiszKopieRobocza,
} from '../../../../wspolne/dokumenty/magazynKopiiRoboczych'
const kluczAktualnejWersji = 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja'
const kluczKopiiRoboczych = 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze'
const kluczMigracjiKopiiRoboczych = 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze.wspolnyMagazyn.v1'
const kluczOpublikowanychSzczegolow = 'ultimatePomagier.szczegolyOrganizacyjne.opublikowane'
const kluczAutosave = 'ultimatePomagier.szczegolyOrganizacyjne.autosave'
const kluczHistorii = 'ultimatePomagier.szczegolyOrganizacyjne.historia'
export const wersjaEksportuSzczegolow = 'ultimate-pomagier-3.5-szczegoly-organizacyjne'

function bezpiecznieParsuj<Typ>(wartosc: string | null, fallback: Typ): Typ {
  if (!wartosc) {
    return fallback
  }

  try {
    return JSON.parse(wartosc) as Typ
  } catch {
    return fallback
  }
}

function pobierzStarszeKopieRobocze() {
  const kopie = bezpiecznieParsuj<unknown>(localStorage.getItem(kluczKopiiRoboczych), [])

  if (!Array.isArray(kopie)) {
    return []
  }

  return kopie.filter((kopia): kopia is KopiaRoboczaSzkolenia => {
    if (!kopia || typeof kopia !== 'object') {
      return false
    }

    const wersja = kopia as Partial<KopiaRoboczaSzkolenia>

    return typeof wersja.id === 'string' && Boolean(wersja.dane && typeof wersja.dane === 'object')
  })
}

function zapiszOpublikowaneSzczegoly(rekordy: OpublikowaneSzczegolyOrganizacyjne[]) {
  localStorage.setItem(kluczOpublikowanychSzczegolow, JSON.stringify(rekordy))
}

function utworzNazweOpublikowanegoRekordu(wersja: WersjaRoboczaGeneratora) {
  return wersja.nazwa.replace('[Kopia robocza]', '[Opublikowane]')
}

function pobierzDzisiejszyKluczWersji() {
  return new Date().toISOString().slice(0, 10)
}

function utworzEtykieteWersji(historia: WpisHistoriiSzczegolow[]) {
  const data = pobierzDzisiejszyKluczWersji()
  const liczbaDzisiejszychWersji = historia.filter((wpis) => wpis.etykietaWersji?.startsWith(data)).length

  return `${data} v${liczbaDzisiejszychWersji + 1}`
}

function zarejestrujHistorie(wpis: WpisHistoriiSzczegolow) {
  const historia = pobierzHistorieSzczegolow()
  localStorage.setItem(kluczHistorii, JSON.stringify([wpis, ...historia].slice(0, 100)))
}

export function pobierzAktualnaWersjeRobocza() {
  return bezpiecznieParsuj<WersjaRoboczaGeneratora | null>(localStorage.getItem(kluczAktualnejWersji), null)
}

export function pobierzKopieRobocze() {
  const wspolneKopie = pobierzKopieRoboczeGeneratora<WersjaRoboczaGeneratora>('szczegoly_organizacyjne')

  if (wspolneKopie.length || localStorage.getItem(kluczMigracjiKopiiRoboczych) === 'true') {
    return wspolneKopie.map((kopia) => kopia.daneDokumentu)
  }

  const starszeKopie = pobierzStarszeKopieRobocze()
  starszeKopie.forEach((kopia) => {
    zapiszKopieRobocza({
      id: kopia.id,
      typGeneratora: 'szczegoly_organizacyjne',
      tytul: kopia.dane.tytulSzkolenia || kopia.nazwa || 'Bez tytulu',
      status: kopia.dane.status || 'robocza',
      daneDokumentu: kopia,
      wersjaFormatu: kopia.wersja || undefined,
    })
  })
  localStorage.setItem(kluczMigracjiKopiiRoboczych, 'true')

  return pobierzKopieRoboczeGeneratora<WersjaRoboczaGeneratora>('szczegoly_organizacyjne').map((kopia) => kopia.daneDokumentu)
}

export function pobierzOpublikowaneSzczegoly() {
  return bezpiecznieParsuj<OpublikowaneSzczegolyOrganizacyjne[]>(localStorage.getItem(kluczOpublikowanychSzczegolow), [])
}

export function pobierzAutosaveSzczegolow() {
  return bezpiecznieParsuj<AutosaveSzczegolow | null>(localStorage.getItem(kluczAutosave), null)
}

export function zapiszAutosaveSzczegolow(autosave: AutosaveSzczegolow) {
  localStorage.setItem(kluczAutosave, JSON.stringify(autosave))
}

export function usunAutosaveSzczegolow() {
  localStorage.removeItem(kluczAutosave)
}

export function pobierzHistorieSzczegolow() {
  return bezpiecznieParsuj<WpisHistoriiSzczegolow[]>(localStorage.getItem(kluczHistorii), [])
}

export function dodajWpisHistoriiSzczegolow(wpis: Omit<WpisHistoriiSzczegolow, 'id' | 'data'>) {
  zarejestrujHistorie({
    ...wpis,
    id: `historia-${Date.now()}`,
    data: new Date().toISOString(),
  })
}

export function utworzNazweKopiiRoboczej(dane: DaneFormularza, grupy: GrupaSzkoleniowa[]) {
  const data = new Date().toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const tytul = dane.tytulSzkolenia.trim() || 'Bez tytułu'
  const klient = dane.nazwaKlienta.trim() || 'Bez klienta'
  const trener = grupy[0]?.trenerzy[0]?.imieNazwisko || 'Bez trenera'

  return `[Kopia robocza] ${data} - "${tytul}", ${trener} (${klient})`
}

export function zbudujWersjeRobocza(
  dane: DaneFormularza,
  grupy: GrupaSzkoleniowa[],
  adresaci: DaneAdresatow,
  statusyPol: StatusyPolImportu,
  konto: KontoSzczegolow,
  metadane?: { id?: string | null; zrodloOpublikowanegoId?: string },
): WersjaRoboczaGeneratora {
  const historia = pobierzHistorieSzczegolow()

  return {
    id: metadane?.id || `wersja-${Date.now()}`,
    wersja: wersjaEksportuSzczegolow,
    etykietaWersji: utworzEtykieteWersji(historia),
    nazwa: utworzNazweKopiiRoboczej(dane, grupy),
    dataZapisu: new Date().toISOString(),
    autorId: konto.id,
    autorNazwa: konto.nazwa,
    zrodloOpublikowanegoId: metadane?.zrodloOpublikowanegoId,
    dane,
    grupy,
    adresaci,
    statusyPol,
  }
}

export function ustawAktualnaWersjeRobocza(wersja: WersjaRoboczaGeneratora) {
  localStorage.setItem(kluczAktualnejWersji, JSON.stringify(wersja))
}

export function zapiszWersjeRobocza(wersja: WersjaRoboczaGeneratora) {
  ustawAktualnaWersjeRobocza(wersja)

  zapiszKopieRobocza({
    id: wersja.id,
    typGeneratora: 'szczegoly_organizacyjne',
    tytul: wersja.dane.tytulSzkolenia || wersja.nazwa,
    status: wersja.dane.status,
    daneDokumentu: wersja,
    wersjaFormatu: wersja.wersja,
  })
  dodajWpisHistoriiSzczegolow({
    typ: 'wersja',
    etykietaWersji: wersja.etykietaWersji,
    autorId: wersja.autorId,
    autorNazwa: wersja.autorNazwa,
    komentarz: 'Zapisano wersję roboczą.',
    dane: wersja.dane,
    grupy: wersja.grupy,
    adresaci: wersja.adresaci,
    statusyPol: wersja.statusyPol,
  })
  usunAutosaveSzczegolow()
}

export function usunKopieRobocza(id: string) {
  usunWspolnaKopieRobocza('szczegoly_organizacyjne', id)

  if (pobierzAktualnaWersjeRobocza()?.id === id) {
    wyczyscAktualnaWersjeRobocza()
  }
}

export function wyczyscAktualnaWersjeRobocza() {
  localStorage.removeItem(kluczAktualnejWersji)
}

export function opublikujWersjeRobocza(wersja: WersjaRoboczaGeneratora) {
  const daneOpublikowane: DaneFormularza = {
    ...wersja.dane,
    status: 'OCZEKUJĄCE',
  }
  const rekord: OpublikowaneSzczegolyOrganizacyjne = {
    id: `szczegoly-${Date.now()}`,
    wersja: wersjaEksportuSzczegolow,
    nazwa: utworzNazweOpublikowanegoRekordu(wersja),
    dataPublikacji: new Date().toISOString(),
    autorId: wersja.autorId,
    autorNazwa: wersja.autorNazwa,
    opiekunId: daneOpublikowane.opiekunId,
    status: 'OCZEKUJĄCE',
    statusSzkolenia: daneOpublikowane.statusSzkolenia,
    dane: daneOpublikowane,
    grupy: wersja.grupy,
    adresaci: wersja.adresaci,
    statusyPol: wersja.statusyPol,
    zrodloKopiiRoboczejId: wersja.id,
  }

  zapiszOpublikowaneSzczegoly([rekord, ...pobierzOpublikowaneSzczegoly()])
  usunKopieRobocza(wersja.id)
  dodajWpisHistoriiSzczegolow({
    typ: 'status',
    autorId: wersja.autorId,
    autorNazwa: wersja.autorNazwa,
    komentarz: 'Opublikowano szczegóły organizacyjne.',
    zmianaStatusu: { z: wersja.dane.status, na: 'OCZEKUJĄCE' },
  })

  return rekord
}

export function ustawStatusOpublikowanychSzczegolow(id: string, status: StatusOpublikowanychSzczegolow, konto?: KontoSzczegolow, komentarz = 'Zmieniono status szczegółów.') {
  const poprzedni = pobierzOpublikowaneSzczegoly().find((rekord) => rekord.id === id)
  const rekordy = pobierzOpublikowaneSzczegoly().map((rekord) =>
    rekord.id === id
      ? {
          ...rekord,
          status,
          dane: {
            ...rekord.dane,
            status,
          },
        }
      : rekord,
  )

  zapiszOpublikowaneSzczegoly(rekordy)
  if (konto) {
    dodajWpisHistoriiSzczegolow({
      typ: 'status',
      autorId: konto.id,
      autorNazwa: konto.nazwa,
      komentarz,
      zmianaStatusu: { z: poprzedni?.status, na: status },
    })
  }

  return rekordy
}

export function ustawStatusSzkoleniaOpublikowanychSzczegolow(
  id: string,
  statusSzkolenia: StatusSzkolenia,
  konto: KontoSzczegolow,
  komentarz: string,
) {
  const poprzedni = pobierzOpublikowaneSzczegoly().find((rekord) => rekord.id === id)
  const rekordy = pobierzOpublikowaneSzczegoly().map((rekord) =>
    rekord.id === id
      ? {
          ...rekord,
          statusSzkolenia,
          dane: {
            ...rekord.dane,
            statusSzkolenia,
            powodNiezrealizowania: statusSzkolenia === 'NIEZREALIZOWANE' ? komentarz : rekord.dane.powodNiezrealizowania,
          },
        }
      : rekord,
  )

  zapiszOpublikowaneSzczegoly(rekordy)
  dodajWpisHistoriiSzczegolow({
    typ: statusSzkolenia === 'NIEZREALIZOWANE' ? 'zdarzenie' : 'status',
    autorId: konto.id,
    autorNazwa: konto.nazwa,
    komentarz,
    zmianaStatusu: { z: poprzedni?.statusSzkolenia, na: statusSzkolenia },
    zdarzenieSpecjalne: statusSzkolenia === 'NIEZREALIZOWANE' ? 'Ustawiono szkolenie jako niezrealizowane.' : undefined,
  })
  return rekordy
}

export function utworzKopieRoboczaZOpublikowanychSzczegolow(rekord: OpublikowaneSzczegolyOrganizacyjne, konto: KontoSzczegolow, czyBezGrup = false) {
  const grupy = czyBezGrup ? [utworzPoczatkowaGrupe(1)] : rekord.grupy
  const kopia: WersjaRoboczaGeneratora = {
    id: `wersja-${Date.now()}`,
    wersja: wersjaEksportuSzczegolow,
    etykietaWersji: utworzEtykieteWersji(pobierzHistorieSzczegolow()),
    nazwa: `[Kopia robocza] Aktualizacja - ${rekord.dane.tytulSzkolenia || rekord.nazwa}`,
    dataZapisu: new Date().toISOString(),
    autorId: konto.id,
    autorNazwa: konto.nazwa,
    zrodloOpublikowanegoId: rekord.id,
    dane: {
      ...rekord.dane,
      status: 'PEŁNE',
    },
    grupy,
    adresaci: rekord.adresaci,
    statusyPol: rekord.statusyPol,
  }

  zapiszWersjeRobocza(kopia)
  return kopia
}
