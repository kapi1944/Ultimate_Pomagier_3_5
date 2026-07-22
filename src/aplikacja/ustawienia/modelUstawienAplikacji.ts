export const paletyInterfejsu = [
  'DOMYSLNA',
  'CRM',
  'DDP',
  'SEMPER',
  'EVENTIS',
  'ARKUSZE_GOOGLE',
] as const

export type PaletaInterfejsu = (typeof paletyInterfejsu)[number]

export const gestosciInterfejsu = [
  'KOMPAKTOWA',
  'STANDARDOWA',
  'PRZESTRONNA',
] as const

export type GestoscInterfejsu = (typeof gestosciInterfejsu)[number]

export const poziomyPoswiaty = [
  'BRAK',
  'SUBTELNA',
  'STANDARDOWA',
  'MOCNA',
] as const

export type PoziomPoswiaty = (typeof poziomyPoswiaty)[number]

export type UstawieniaAplikacji = {
  wersja: 1
  wyglad: {
    paleta: PaletaInterfejsu
    gestosc: GestoscInterfejsu
    promienKart: number
    promienPol: number
    czasPrzejsciaMs: number
    skalaHover: number
  }
  pulpit: {
    poczatekDnia: string
    koniecDnia: string
    deadline: {
      rozmiarRombu: number
      gruboscObramowania: number
      rozmiarKropki: number
      poswiata: PoziomPoswiaty
      pokazPlomienAsap: boolean
    }
  }
  dostepnosc: {
    ograniczAnimacje: boolean
  }
}

export const domyslneUstawieniaAplikacji: UstawieniaAplikacji = {
  wersja: 1,
  wyglad: {
    paleta: 'DOMYSLNA',
    gestosc: 'STANDARDOWA',
    promienKart: 10,
    promienPol: 6,
    czasPrzejsciaMs: 150,
    skalaHover: 1,
  },
  pulpit: {
    poczatekDnia: '07:45',
    koniecDnia: '16:00',
    deadline: {
      rozmiarRombu: 28,
      gruboscObramowania: 5,
      rozmiarKropki: 16,
      poswiata: 'STANDARDOWA',
      pokazPlomienAsap: true,
    },
  },
  dostepnosc: {
    ograniczAnimacje: false,
  },
}

function jakoObiekt(wartosc: unknown): Record<string, unknown> {
  return wartosc !== null && typeof wartosc === 'object' && !Array.isArray(wartosc)
    ? wartosc as Record<string, unknown>
    : {}
}

function ograniczLiczbe(
  wartosc: unknown,
  minimum: number,
  maksimum: number,
  domyslna: number,
) {
  if (typeof wartosc !== 'number' || !Number.isFinite(wartosc)) return domyslna
  return Math.min(maksimum, Math.max(minimum, wartosc))
}

function czyGodzina(wartosc: unknown): wartosc is string {
  if (typeof wartosc !== 'string' || !/^\d{2}:\d{2}$/.test(wartosc)) return false
  const [godzina, minuta] = wartosc.split(':').map(Number)
  return godzina >= 0 && godzina <= 23 && minuta >= 0 && minuta <= 59
}

function minutyDnia(godzina: string) {
  const [godziny, minuty] = godzina.split(':').map(Number)
  return godziny * 60 + minuty
}

function pobierzWartoscZListy<T extends readonly string[]>(
  wartosc: unknown,
  dozwolone: T,
  domyslna: T[number],
): T[number] {
  return typeof wartosc === 'string' && dozwolone.includes(wartosc)
    ? wartosc as T[number]
    : domyslna
}

export function normalizujUstawieniaAplikacji(dane: unknown): UstawieniaAplikacji {
  const korzen = jakoObiekt(dane)
  const wyglad = jakoObiekt(korzen.wyglad)
  const pulpit = jakoObiekt(korzen.pulpit)
  const deadline = jakoObiekt(pulpit.deadline)
  const dostepnosc = jakoObiekt(korzen.dostepnosc)

  let poczatekDnia = czyGodzina(pulpit.poczatekDnia)
    ? pulpit.poczatekDnia
    : domyslneUstawieniaAplikacji.pulpit.poczatekDnia

  let koniecDnia = czyGodzina(pulpit.koniecDnia)
    ? pulpit.koniecDnia
    : domyslneUstawieniaAplikacji.pulpit.koniecDnia

  if (minutyDnia(poczatekDnia) >= minutyDnia(koniecDnia)) {
    poczatekDnia = domyslneUstawieniaAplikacji.pulpit.poczatekDnia
    koniecDnia = domyslneUstawieniaAplikacji.pulpit.koniecDnia
  }

  return {
    wersja: 1,
    wyglad: {
      paleta: pobierzWartoscZListy(
        wyglad.paleta,
        paletyInterfejsu,
        domyslneUstawieniaAplikacji.wyglad.paleta,
      ),
      gestosc: pobierzWartoscZListy(
        wyglad.gestosc,
        gestosciInterfejsu,
        domyslneUstawieniaAplikacji.wyglad.gestosc,
      ),
      promienKart: ograniczLiczbe(
        wyglad.promienKart,
        0,
        32,
        domyslneUstawieniaAplikacji.wyglad.promienKart,
      ),
      promienPol: ograniczLiczbe(
        wyglad.promienPol,
        0,
        24,
        domyslneUstawieniaAplikacji.wyglad.promienPol,
      ),
      czasPrzejsciaMs: ograniczLiczbe(
        wyglad.czasPrzejsciaMs,
        0,
        600,
        domyslneUstawieniaAplikacji.wyglad.czasPrzejsciaMs,
      ),
      skalaHover: ograniczLiczbe(
        wyglad.skalaHover,
        1,
        1.1,
        domyslneUstawieniaAplikacji.wyglad.skalaHover,
      ),
    },
    pulpit: {
      poczatekDnia,
      koniecDnia,
      deadline: {
        rozmiarRombu: ograniczLiczbe(
          deadline.rozmiarRombu,
          18,
          48,
          domyslneUstawieniaAplikacji.pulpit.deadline.rozmiarRombu,
        ),
        gruboscObramowania: ograniczLiczbe(
          deadline.gruboscObramowania,
          1,
          8,
          domyslneUstawieniaAplikacji.pulpit.deadline.gruboscObramowania,
        ),
        rozmiarKropki: ograniczLiczbe(
          deadline.rozmiarKropki,
          6,
          24,
          domyslneUstawieniaAplikacji.pulpit.deadline.rozmiarKropki,
        ),
        poswiata: pobierzWartoscZListy(
          deadline.poswiata,
          poziomyPoswiaty,
          domyslneUstawieniaAplikacji.pulpit.deadline.poswiata,
        ),
        pokazPlomienAsap: typeof deadline.pokazPlomienAsap === 'boolean'
          ? deadline.pokazPlomienAsap
          : domyslneUstawieniaAplikacji.pulpit.deadline.pokazPlomienAsap,
      },
    },
    dostepnosc: {
      ograniczAnimacje: typeof dostepnosc.ograniczAnimacje === 'boolean'
        ? dostepnosc.ograniczAnimacje
        : domyslneUstawieniaAplikacji.dostepnosc.ograniczAnimacje,
    },
  }
}
