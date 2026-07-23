import {
  domyslneUstawieniaAplikacji,
  normalizujUstawieniaAplikacji,
  type UstawieniaAplikacji,
} from './modelUstawienAplikacji'

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
  const ustawienia = normalizujUstawieniaAplikacji(dane)

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

    return {
      ok: true,
      ustawienia: normalizujUstawieniaAplikacji(dane),
    }
  } catch {
    return { ok: false, blad: 'Plik nie jest poprawnym dokumentem JSON.' }
  }
}
