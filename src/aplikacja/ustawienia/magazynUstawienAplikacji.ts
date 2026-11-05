import {
  domyslneUstawieniaAplikacji,
  normalizujUstawieniaAplikacji,
  type UstawieniaAplikacji,
} from './modelUstawienAplikacji'
import { zastosujSkaleInterfejsu } from './skalaInterfejsu'
import { walidujHarmonogramPracy } from '../../moduly/zamkniete/pulpit/logika/harmonogramPracy'
import { normalizujOsCzasu, walidujOsCzasu, type KonfiguracjaOsiCzasu } from '../../moduly/zamkniete/pulpit/logika/czasDnia'
import { czyKontoJestAktywne, type Uzytkownik } from '../../kartoteki/uzytkownicy/typyUzytkownikow'

export const kluczUstawienAplikacji = 'ultimatePomagier.ustawieniaAplikacji.v1'
export const zdarzenieZmianyUstawienAplikacji = 'ultimatePomagier:zmianaUstawienAplikacji'

const gestoscGap: Record<UstawieniaAplikacji['wyglad']['gestosc'], number> = {
  KOMPAKTOWA: 12,
  STANDARDOWA: 18,
  PRZESTRONNA: 24,
}

const poswiataPx: Record<UstawieniaAplikacji['pulpit']['deadline']['poswiata'], number> = {
  BRAK: 0,
  SUBTELNA: 6,
  STANDARDOWA: 12,
  MOCNA: 18,
}

export function pobierzUstawieniaAplikacji(): UstawieniaAplikacji {
  try {
    const zapisane = localStorage.getItem(kluczUstawienAplikacji)
    if (!zapisane) return normalizujUstawieniaAplikacji(domyslneUstawieniaAplikacji)
    return normalizujUstawieniaAplikacji(JSON.parse(zapisane))
  } catch {
    return normalizujUstawieniaAplikacji(domyslneUstawieniaAplikacji)
  }
}

export function zastosujUstawieniaAplikacji(ustawienia: UstawieniaAplikacji) {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  void zastosujSkaleInterfejsu(ustawienia.wyglad.skalaInterfejsu)

  root.dataset.uiPaleta = ustawienia.wyglad.paleta
  root.dataset.uiGestosc = ustawienia.wyglad.gestosc
  root.dataset.uiOgraniczAnimacje = String(ustawienia.dostepnosc.ograniczAnimacje)
  root.dataset.uiPokazPlomienAsap = String(ustawienia.pulpit.deadline.pokazPlomienAsap)

  root.style.setProperty('--ui-promien-karty', ustawienia.wyglad.promienKart + 'px')
  root.style.setProperty('--ui-promien-pola', ustawienia.wyglad.promienPol + 'px')
  root.style.setProperty('--ui-transition-ms', ustawienia.wyglad.czasPrzejsciaMs + 'ms')
  root.style.setProperty('--ui-hover-scale', String(ustawienia.wyglad.skalaHover))
  root.style.setProperty('--ui-density-gap', gestoscGap[ustawienia.wyglad.gestosc] + 'px')

  root.style.setProperty('--ui-menu-width', ustawienia.nawigacja.szerokoscMenu + 'px')

  const wysokoscPrzyciskuMenu = {
    KOMPAKTOWA: 34,
    STANDARDOWA: 40,
    DUZA: 48,
  }[ustawienia.nawigacja.wysokoscPrzyciskuMenu]

  root.style.setProperty('--ui-menu-button-height', wysokoscPrzyciskuMenu + 'px')

  root.style.setProperty('--pulpit-deadline-size', ustawienia.pulpit.deadline.rozmiarRombu + 'px')
  root.style.setProperty('--pulpit-deadline-border', ustawienia.pulpit.deadline.gruboscObramowania + 'px')
  root.style.setProperty('--pulpit-deadline-dot-size', ustawienia.pulpit.deadline.rozmiarKropki + 'px')
  root.style.setProperty('--pulpit-deadline-glow', poswiataPx[ustawienia.pulpit.deadline.poswiata] + 'px')
}

export function zapiszUstawieniaAplikacji(dane: UstawieniaAplikacji) {
  if (dane.pulpit.harmonogramPracy !== undefined && walidujHarmonogramPracy(dane.pulpit.harmonogramPracy).length) return false
  const poprzednie = pobierzUstawieniaAplikacji()
  const praca = { poczatek: dane.pulpit.poczatekDnia, koniec: dane.pulpit.koniecDnia }
  let doZapisu = dane
  if ((praca.poczatek !== poprzednie.pulpit.poczatekDnia || praca.koniec !== poprzednie.pulpit.koniecDnia) && JSON.stringify(dane.pulpit.osCzasu) === JSON.stringify(poprzednie.pulpit.osCzasu)) {
    doZapisu = { ...dane, pulpit: { ...dane.pulpit, osCzasu: normalizujOsCzasu(dane.pulpit.osCzasu, praca), osieUzytkownikow: Object.fromEntries(Object.entries(dane.pulpit.osieUzytkownikow ?? {}).map(([id, os]) => [id, normalizujOsCzasu(os, praca)])) } }
  }
  if (walidujUstawieniaOsi(doZapisu.pulpit).length) return false
  const ustawienia = normalizujUstawieniaAplikacji(doZapisu)

  try {
    localStorage.setItem(kluczUstawienAplikacji, JSON.stringify(ustawienia))
    zastosujUstawieniaAplikacji(ustawienia)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(zdarzenieZmianyUstawienAplikacji))
    }

    return true
  } catch {
    return false
  }
}

export function eksportujUstawieniaAplikacji(
  ustawienia: UstawieniaAplikacji = pobierzUstawieniaAplikacji(),
) {
  return JSON.stringify(ustawienia, null, 2)
}

export function importujUstawieniaAplikacji(tekst: string):
  | { ok: true; ustawienia: UstawieniaAplikacji }
  | { ok: false; blad: string } {
  try {
    const dane = JSON.parse(tekst) as unknown

    if (
      dane === null
      || typeof dane !== 'object'
      || Array.isArray(dane)
      || (dane as Record<string, unknown>).wersja !== 1
    ) {
      return { ok: false, blad: 'Plik nie zawiera obsługiwanej wersji ustawień.' }
    }

    const pulpit = (dane as Record<string, unknown>).pulpit
    if (pulpit && typeof pulpit === 'object' && 'harmonogramPracy' in pulpit) {
      const bledy = walidujHarmonogramPracy(pulpit.harmonogramPracy)
      if (bledy.length) return { ok: false, blad: bledy.join(' ') }
    }
    if (pulpit && typeof pulpit === 'object') {
      const bledy = walidujUstawieniaOsi(pulpit)
      if (bledy.length) return { ok: false, blad: bledy.join(' ') }
    }
    return {
      ok: true,
      ustawienia: normalizujUstawieniaAplikacji(dane),
    }
  } catch {
    return { ok: false, blad: 'Plik nie jest poprawnym dokumentem JSON.' }
  }
}

export function walidujUstawieniaOsi(dane: object): string[] {
  const pulpit = dane as Record<string, unknown>
  const praca = { poczatek: typeof pulpit.poczatekDnia === 'string' ? pulpit.poczatekDnia : domyslneUstawieniaAplikacji.pulpit.poczatekDnia, koniec: typeof pulpit.koniecDnia === 'string' ? pulpit.koniecDnia : domyslneUstawieniaAplikacji.pulpit.koniecDnia }
  const bledy = pulpit.osCzasu === undefined ? [] : walidujOsCzasu(pulpit.osCzasu, praca)
  if (pulpit.osieUzytkownikow !== undefined) {
    if (!pulpit.osieUzytkownikow || typeof pulpit.osieUzytkownikow !== 'object' || Array.isArray(pulpit.osieUzytkownikow)) return [...bledy, 'Nieprawidłowe preferencje osi użytkowników.']
    Object.values(pulpit.osieUzytkownikow).forEach((os) => bledy.push(...walidujOsCzasu(os, praca)))
  }
  return [...new Set(bledy)]
}

export function zapiszOsUzytkownika(os: KonfiguracjaOsiCzasu, uzytkownik: Uzytkownik | null): boolean {
  if (!uzytkownik || !czyKontoJestAktywne(uzytkownik)) return false
  const ustawienia = pobierzUstawieniaAplikacji()
  if (walidujOsCzasu(os, { poczatek: ustawienia.pulpit.poczatekDnia, koniec: ustawienia.pulpit.koniecDnia }).length) return false
  return zapiszUstawieniaAplikacji({ ...ustawienia, pulpit: { ...ustawienia.pulpit, osieUzytkownikow: { ...ustawienia.pulpit.osieUzytkownikow, [uzytkownik.id]: { ...os } } } })
}
