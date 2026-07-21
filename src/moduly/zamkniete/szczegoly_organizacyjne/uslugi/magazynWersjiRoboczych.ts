import type { KontoSzczegolow } from '../uzytkownicySzczegolow'
import type {
  AutosaveSzczegolow,
  DaneAdresatow,
  DaneFormularza,
  GrupaSzkoleniowa,
  OpublikowaneSzczegolyOrganizacyjne,
  StatusOpublikowanychSzczegolow,
  StatusSzkolenia,
  StatusyPolImportu,
  WersjaRoboczaGeneratora,
  WpisHistoriiSzczegolow,
} from '../typy'
import { utworzPoczatkowaGrupe } from '../danePoczatkowe'
import { repozytoriumWspolnychDokumentow } from '../../../../wspolne/dokumenty/rejestrDokumentow'
import { repozytoriumDokumentow } from '../../../../wspolne/dokumenty/repozytoriumDokumentow'
import { zapiszDokumentRoboczyGeneratora } from '../../../../wspolne/dokumenty/zapisDokumentuGeneratora'
import { czyMoznaUtworzycAktualizacje, walidujPrzejscieStatusuSzczegolow, type AkcjaStatusuSzczegolow } from '../workflowStatusow'
const kluczAktualnejWersji = 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja'

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

function zapiszOpublikowaneSzczegoly(rekordy: OpublikowaneSzczegolyOrganizacyjne[]) {
  rekordy.forEach((rekord) => {
    const zmiany = {
      tytul: rekord.dane.tytulSzkolenia || rekord.nazwa,
      status: 'OPUBLIKOWANY' as const,
      opublikowano: rekord.dataPublikacji,
      autorId: rekord.autorId,
      wlascicielId: rekord.opiekunId,
      daneDokumentu: rekord,
      ustawieniaDokumentu: { wersja: rekord.wersja, statusyPol: rekord.statusyPol },
      klientId: rekord.dane.nazwaKlienta || null,
      organizatorId: rekord.dane.organizator,
    }
    const poprzedni = repozytoriumWspolnychDokumentow.pobierzPoId(rekord.id)

    if (poprzedni) {
      repozytoriumWspolnychDokumentow.aktualizuj(rekord.id, zmiany)
      return
    }

    zapiszDokumentRoboczyGeneratora({
      id: rekord.id,
      typ: 'SZCZEGOLY_ORGANIZACYJNE',
      generatorId: 'szczegoly_organizacyjne',
      tytul: zmiany.tytul,
      daneDokumentu: rekord,
      ustawieniaDokumentu: zmiany.ustawieniaDokumentu,
      klientId: zmiany.klientId,
      organizatorId: zmiany.organizatorId,
      autorId: rekord.autorId,
      wlascicielId: rekord.opiekunId,
    })
    repozytoriumWspolnychDokumentow.aktualizuj(rekord.id, zmiany)
  })
}

function zmigrujStarszeOpublikowaneSzczegoly() {
  const rekordy = bezpiecznieParsuj<unknown>(localStorage.getItem(kluczOpublikowanychSzczegolow), [])

  if (Array.isArray(rekordy)) {
    zapiszOpublikowaneSzczegoly(rekordy.filter((rekord): rekord is OpublikowaneSzczegolyOrganizacyjne => Boolean(rekord && typeof rekord === 'object' && typeof (rekord as { id?: unknown }).id === 'string')))
  }
}

function zmigrujStarszaHistorieSzczegolow() {
  const historia = bezpiecznieParsuj<unknown>(localStorage.getItem(kluczHistorii), [])

  if (!Array.isArray(historia)) {
    return
  }

  const istniejaceId = new Set(repozytoriumDokumentow.pobierzHistorie('szczegoly_organizacyjne').map((wpis) => wpis.id))
  historia.forEach((wpis) => {
    if (!wpis || typeof wpis !== 'object' || typeof (wpis as { id?: unknown }).id !== 'string' || istniejaceId.has((wpis as { id: string }).id)) {
      return
    }

    const staryWpis = wpis as WpisHistoriiSzczegolow
    repozytoriumDokumentow.dodajWersjeHistorii({
      id: staryWpis.id,
      typGeneratora: 'szczegoly_organizacyjne',
      data: staryWpis.data,
      dane: staryWpis,
    })
  })
}

function utworzNazweOpublikowanegoRekordu(wersja: WersjaRoboczaGeneratora) {
  return wersja.nazwa.replace('[Kopia robocza]', '[Opublikowane]')
}

export function ustalDokumentIdWersji(wersja: Pick<WersjaRoboczaGeneratora, 'id' | 'dokumentId' | 'zrodloOpublikowanegoId'>) {
  return wersja.dokumentId || wersja.zrodloOpublikowanegoId || wersja.id
}

function normalizujWersjeRobocza(wersja: WersjaRoboczaGeneratora): WersjaRoboczaGeneratora {
  return { ...wersja, dokumentId: ustalDokumentIdWersji(wersja) }
}

function normalizujOpublikowaneSzczegoly(rekord: OpublikowaneSzczegolyOrganizacyjne): OpublikowaneSzczegolyOrganizacyjne {
  const dataPublikacji = rekord.dataPublikacji || new Date().toISOString()
  return {
    ...rekord,
    numerWersji: rekord.numerWersji || 1,
    dataPierwszejPublikacji: rekord.dataPierwszejPublikacji || dataPublikacji,
    dataOstatniejPublikacji: rekord.dataOstatniejPublikacji || dataPublikacji,
    dataPublikacji,
  }
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
  repozytoriumDokumentow.dodajWersjeHistorii({
    id: wpis.id,
    typGeneratora: 'szczegoly_organizacyjne',
    data: wpis.data,
    dokumentId: wpis.dokumentId,
    dane: wpis,
  })
}

export function pobierzAktualnaWersjeRobocza() {
  const wersja = bezpiecznieParsuj<WersjaRoboczaGeneratora | null>(localStorage.getItem(kluczAktualnejWersji), null)
  return wersja ? normalizujWersjeRobocza(wersja) : null
}

export function pobierzKopieRobocze() {
  return repozytoriumWspolnychDokumentow
    .pobierzWszystkie()
    .filter((dokument) => dokument.typ === 'SZCZEGOLY_ORGANIZACYJNE' && dokument.generatorId === 'szczegoly_organizacyjne' && dokument.status === 'ROBOCZY' && !dokument.czyZarchiwizowany && !dokument.czyUsunietyMiekko)
    .map((dokument) => normalizujWersjeRobocza(dokument.daneDokumentu as WersjaRoboczaGeneratora))
}

export function pobierzOpublikowaneSzczegoly() {
  zmigrujStarszeOpublikowaneSzczegoly()
  return repozytoriumWspolnychDokumentow
    .pobierzWszystkie()
    .filter((dokument) => dokument.typ === 'SZCZEGOLY_ORGANIZACYJNE' && dokument.generatorId === 'szczegoly_organizacyjne' && dokument.status === 'OPUBLIKOWANY' && !dokument.czyUsunietyMiekko)
    .map((dokument) => normalizujOpublikowaneSzczegoly(dokument.daneDokumentu as OpublikowaneSzczegolyOrganizacyjne))
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
  zmigrujStarszaHistorieSzczegolow()
  return repozytoriumDokumentow
    .pobierzHistorie('szczegoly_organizacyjne')
    .map((wpis) => wpis.dane as WpisHistoriiSzczegolow)
}

export function dodajWpisHistoriiSzczegolow(wpis: Omit<WpisHistoriiSzczegolow, 'id' | 'data'>) {
  if (wpis.typ === 'wersja' && wpis.dokumentId && wpis.numerWersji && pobierzHistorieSzczegolow().some((pozycja) => pozycja.typ === 'wersja' && pozycja.dokumentId === wpis.dokumentId && pozycja.numerWersji === wpis.numerWersji)) {
    return
  }

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
  metadane?: { id?: string | null; dokumentId?: string; zrodloOpublikowanegoId?: string; bazowaWersjaOpublikowana?: number },
): WersjaRoboczaGeneratora {
  const historia = pobierzHistorieSzczegolow()
  const id = metadane?.id || `wersja-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    id,
    dokumentId: metadane?.dokumentId || metadane?.zrodloOpublikowanegoId || id,
    bazowaWersjaOpublikowana: metadane?.bazowaWersjaOpublikowana,
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
  wersja = normalizujWersjeRobocza(wersja)
  zapiszDokumentRoboczyGeneratora({
    id: wersja.id,
    typ: 'SZCZEGOLY_ORGANIZACYJNE',
    generatorId: 'szczegoly_organizacyjne',
    tytul: wersja.dane.tytulSzkolenia || wersja.nazwa,
    daneDokumentu: wersja,
    ustawieniaDokumentu: { wersja: wersja.wersja, statusyPol: wersja.statusyPol },
    klientId: wersja.dane.nazwaKlienta || null,
    organizatorId: wersja.dane.organizator,
    autorId: wersja.autorId,
    wlascicielId: wersja.dane.opiekunId || null,
  })
  ustawAktualnaWersjeRobocza(wersja)

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
    dokumentId: wersja.dokumentId,
    wersjaRoboczaId: wersja.id,
  })
  usunAutosaveSzczegolow()
}

export function usunKopieRobocza(id: string) {
  repozytoriumWspolnychDokumentow.usunMiekko(id)

  if (pobierzAktualnaWersjeRobocza()?.id === id) {
    wyczyscAktualnaWersjeRobocza()
  }
}

export function wyczyscAktualnaWersjeRobocza() {
  localStorage.removeItem(kluczAktualnejWersji)
}

export function opublikujWersjeRobocza(wersja: WersjaRoboczaGeneratora) {
  wersja = normalizujWersjeRobocza(wersja)
  const walidacjaPrzejscia = walidujPrzejscieStatusuSzczegolow(wersja.dane.status, 'OCZEKUJĄCE')
  if (!walidacjaPrzejscia.poprawne || !walidacjaPrzejscia.przejscie) {
    throw new Error(walidacjaPrzejscia.komunikat)
  }

  const opublikowane = pobierzOpublikowaneSzczegoly()
  const istniejacy = opublikowane.find((rekord) => rekord.id === wersja.dokumentId)

  if (istniejacy?.zrodloKopiiRoboczejId === wersja.id) {
    return istniejacy
  }

  if (wersja.zrodloOpublikowanegoId && !istniejacy) {
    throw new Error('Nie znaleziono opublikowanego dokumentu źródłowego aktualizacji.')
  }

  if (istniejacy && wersja.bazowaWersjaOpublikowana !== istniejacy.numerWersji) {
    throw new Error('Konflikt wersji: aktualizacja powstała na podstawie nieaktualnej wersji opublikowanej.')
  }

  const daneOpublikowane: DaneFormularza = {
    ...wersja.dane,
    status: 'OCZEKUJĄCE',
  }
  const teraz = new Date().toISOString()
  const numerWersji = istniejacy ? istniejacy.numerWersji + 1 : 1
  const rekord: OpublikowaneSzczegolyOrganizacyjne = {
    ...(istniejacy ?? {}),
    id: wersja.dokumentId,
    wersja: wersjaEksportuSzczegolow,
    nazwa: utworzNazweOpublikowanegoRekordu(wersja),
    dataPublikacji: teraz,
    dataPierwszejPublikacji: istniejacy?.dataPierwszejPublikacji ?? teraz,
    dataOstatniejPublikacji: teraz,
    numerWersji,
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

  zapiszOpublikowaneSzczegoly([rekord, ...opublikowane.filter((pozycja) => pozycja.id !== rekord.id)])
  if (wersja.id !== rekord.id) {
    usunKopieRobocza(wersja.id)
  } else if (pobierzAktualnaWersjeRobocza()?.id === wersja.id) {
    wyczyscAktualnaWersjeRobocza()
  }
  dodajWpisHistoriiSzczegolow({
    typ: 'wersja',
    autorId: wersja.autorId,
    autorNazwa: wersja.autorNazwa,
    komentarz: istniejacy ? `Opublikowano aktualizację jako wersję ${numerWersji}.` : 'Opublikowano szczegóły organizacyjne jako wersję 1.',
    akcjaStatusu: 'publikacja',
    automatyczne: true,
    zmianaStatusu: { z: wersja.dane.status, na: 'OCZEKUJĄCE' },
    dokumentId: rekord.id,
    numerWersji,
    wersjaRoboczaId: wersja.id,
    dane: daneOpublikowane,
    grupy: wersja.grupy,
    adresaci: wersja.adresaci,
    statusyPol: wersja.statusyPol,
  })

  return rekord
}

export type OpcjeZmianyStatusuOpublikowanychSzczegolow = {
  konto: KontoSzczegolow
  komentarz?: string
  powod?: string
}

export function ustawStatusOpublikowanychSzczegolow(
  id: string,
  status: StatusOpublikowanychSzczegolow,
  opcje: OpcjeZmianyStatusuOpublikowanychSzczegolow,
) {
  const poprzedni = pobierzOpublikowaneSzczegoly().find((rekord) => rekord.id === id)
  if (!poprzedni) {
    return pobierzOpublikowaneSzczegoly()
  }

  if (!opcje?.konto) {
    throw new Error('Ręczna zmiana statusu wymaga wskazania aktora.')
  }

  const walidacjaPrzejscia = walidujPrzejscieStatusuSzczegolow(poprzedni.status, status, opcje.powod)
  if (!walidacjaPrzejscia.poprawne || !walidacjaPrzejscia.przejscie) {
    throw new Error(walidacjaPrzejscia.komunikat)
  }

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
  dodajWpisHistoriiSzczegolow({
    typ: 'status',
    autorId: opcje.konto.id,
    autorNazwa: opcje.konto.nazwa,
    komentarz: opcje.komentarz?.trim() ?? '',
    powod: opcje.powod?.trim() || undefined,
    akcjaStatusu: walidacjaPrzejscia.przejscie.akcja as AkcjaStatusuSzczegolow,
    automatyczne: false,
    zmianaStatusu: { z: poprzedni.status, na: status },
  })

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
  if (!czyMoznaUtworzycAktualizacje(rekord.status)) {
    return null
  }

  const grupy = czyBezGrup ? [utworzPoczatkowaGrupe(1)] : rekord.grupy
  const kopia: WersjaRoboczaGeneratora = {
    id: `wersja-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    dokumentId: rekord.id,
    bazowaWersjaOpublikowana: rekord.numerWersji,
    wersja: wersjaEksportuSzczegolow,
    etykietaWersji: utworzEtykieteWersji(pobierzHistorieSzczegolow()),
    nazwa: `[Kopia robocza] Aktualizacja - ${rekord.dane.tytulSzkolenia || rekord.nazwa}`,
    dataZapisu: new Date().toISOString(),
    autorId: konto.id,
    autorNazwa: konto.nazwa,
    zrodloOpublikowanegoId: rekord.id,
    dane: {
      ...rekord.dane,
      status: statusPelny,
    },
    grupy,
    adresaci: rekord.adresaci,
    statusyPol: rekord.statusyPol,
  }

  zapiszWersjeRobocza(kopia)
  return kopia
}

const statusPelny = ('PE' + String.fromCharCode(0x0141) + 'NE') as DaneFormularza['status']

function sklonujWartosc<Typ>(wartosc: Typ): Typ {
  return JSON.parse(JSON.stringify(wartosc)) as Typ
}

export function duplikujOpublikowaneSzczegoly(rekord: OpublikowaneSzczegolyOrganizacyjne, konto: KontoSzczegolow) {
  const kopia = zbudujWersjeRobocza(
    { ...sklonujWartosc(rekord.dane), status: statusPelny },
    sklonujWartosc(rekord.grupy),
    sklonujWartosc(rekord.adresaci),
    sklonujWartosc(rekord.statusyPol),
    konto,
  )
  kopia.nazwa = `[Kopia robocza] Kopia - ${rekord.dane.tytulSzkolenia || rekord.nazwa}`
  zapiszWersjeRobocza(kopia)
  return kopia
}

export function duplikujKopieRobocza(kopiaZrodlowa: WersjaRoboczaGeneratora, konto: KontoSzczegolow) {
  const kopia = zbudujWersjeRobocza(
    { ...sklonujWartosc(kopiaZrodlowa.dane), status: statusPelny },
    sklonujWartosc(kopiaZrodlowa.grupy),
    sklonujWartosc(kopiaZrodlowa.adresaci),
    sklonujWartosc(kopiaZrodlowa.statusyPol),
    konto,
  )
  kopia.nazwa = `[Kopia robocza] Kopia - ${kopiaZrodlowa.dane.tytulSzkolenia || kopiaZrodlowa.nazwa}`
  zapiszWersjeRobocza(kopia)
  return kopia
}

export function usunOpublikowaneSzczegoly(id: string) {
  return repozytoriumWspolnychDokumentow.usunMiekko(id)
}