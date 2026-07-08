import type { KontoSzczegolow } from '../uzytkownicySzczegolow'
import type {
  DaneAdresatow,
  DaneFormularza,
  GrupaSzkoleniowa,
  KopiaRoboczaSzkolenia,
  OpublikowaneSzczegolyOrganizacyjne,
  StatusOpublikowanychSzczegolow,
  StatusyPolImportu,
  WersjaRoboczaGeneratora,
} from '../typy'

const kluczAktualnejWersji = 'ultimatePomagier.szczegolyOrganizacyjne.aktualnaWersja'
const kluczKopiiRoboczych = 'ultimatePomagier.szczegolyOrganizacyjne.kopieRobocze'
const kluczOpublikowanychSzczegolow = 'ultimatePomagier.szczegolyOrganizacyjne.opublikowane'
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

function zapiszKopieRobocze(kopie: KopiaRoboczaSzkolenia[]) {
  localStorage.setItem(kluczKopiiRoboczych, JSON.stringify(kopie))
}

function zapiszOpublikowaneSzczegoly(rekordy: OpublikowaneSzczegolyOrganizacyjne[]) {
  localStorage.setItem(kluczOpublikowanychSzczegolow, JSON.stringify(rekordy))
}

function utworzNazweOpublikowanegoRekordu(wersja: WersjaRoboczaGeneratora) {
  return wersja.nazwa.replace('[Kopia robocza]', '[Opublikowane]')
}

export function pobierzAktualnaWersjeRobocza() {
  return bezpiecznieParsuj<WersjaRoboczaGeneratora | null>(localStorage.getItem(kluczAktualnejWersji), null)
}

export function pobierzKopieRobocze() {
  return bezpiecznieParsuj<KopiaRoboczaSzkolenia[]>(localStorage.getItem(kluczKopiiRoboczych), [])
}

export function pobierzOpublikowaneSzczegoly() {
  return bezpiecznieParsuj<OpublikowaneSzczegolyOrganizacyjne[]>(localStorage.getItem(kluczOpublikowanychSzczegolow), [])
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
  return {
    id: metadane?.id || `wersja-${Date.now()}`,
    wersja: wersjaEksportuSzczegolow,
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

  const kopie = pobierzKopieRobocze()
  const pozostaleKopie = kopie.filter((kopia) => kopia.id !== wersja.id)
  const noweKopie = [wersja, ...pozostaleKopie].slice(0, 20)
  zapiszKopieRobocze(noweKopie)
}

export function usunKopieRobocza(id: string) {
  const kopie = pobierzKopieRobocze().filter((kopia) => kopia.id !== id)
  zapiszKopieRobocze(kopie)

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
    dane: daneOpublikowane,
    grupy: wersja.grupy,
    adresaci: wersja.adresaci,
    statusyPol: wersja.statusyPol,
    zrodloKopiiRoboczejId: wersja.id,
  }

  zapiszOpublikowaneSzczegoly([rekord, ...pobierzOpublikowaneSzczegoly()])
  usunKopieRobocza(wersja.id)

  return rekord
}

export function ustawStatusOpublikowanychSzczegolow(id: string, status: StatusOpublikowanychSzczegolow) {
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
  return rekordy
}

export function utworzKopieRoboczaZOpublikowanychSzczegolow(rekord: OpublikowaneSzczegolyOrganizacyjne, konto: KontoSzczegolow) {
  const kopia: WersjaRoboczaGeneratora = {
    id: `wersja-${Date.now()}`,
    wersja: wersjaEksportuSzczegolow,
    nazwa: `[Kopia robocza] Aktualizacja - ${rekord.dane.tytulSzkolenia || rekord.nazwa}`,
    dataZapisu: new Date().toISOString(),
    autorId: konto.id,
    autorNazwa: konto.nazwa,
    zrodloOpublikowanegoId: rekord.id,
    dane: {
      ...rekord.dane,
      status: 'PEŁNE',
    },
    grupy: rekord.grupy,
    adresaci: rekord.adresaci,
    statusyPol: rekord.statusyPol,
  }

  zapiszWersjeRobocza(kopia)
  return kopia
}