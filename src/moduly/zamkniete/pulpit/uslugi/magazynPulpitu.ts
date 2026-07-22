import type { JednostkaPrzypomnienia, PrzypomnienieZadania, StanPulpitu, StatusZapotrzebowaniaZakupowego, ZadaniePulpitu, ZapotrzebowanieZakupowe } from '../modele/pulpit'

const kluczStanuPulpitu = 'ultimatePomagier.pulpit.v1'

function pustyStan(): StanPulpitu {
  return { zadaniaReczne: [], wyslanePaczki: {}, zapotrzebowaniaZakupowe: [] }
}

function tekst(wartosc: unknown) {
  return typeof wartosc === 'string' ? wartosc.trim() : ''
}

function normalizujJednostke(wartosc: unknown): JednostkaPrzypomnienia | null {
  if (wartosc === 'MINUTY' || wartosc === 'minutes') return 'MINUTY'
  if (wartosc === 'GODZINY' || wartosc === 'hours') return 'GODZINY'
  if (wartosc === 'DNI' || wartosc === 'days') return 'DNI'
  return null
}

function normalizujPrzypomnienie(wartosc: unknown, indeks: number): PrzypomnienieZadania | null {
  if (!wartosc || typeof wartosc !== 'object') return null
  const dane = wartosc as Record<string, unknown>
  const liczba = Number(dane.wartosc ?? dane.value)
  const jednostka = normalizujJednostke(dane.jednostka ?? dane.unit)
  if (!Number.isFinite(liczba) || liczba <= 0 || !jednostka) return null
  return {
    id: tekst(dane.id) || 'przypomnienie-' + indeks + '-' + liczba + '-' + jednostka,
    wartosc: liczba,
    jednostka,
  }
}

export function normalizujZadaniePulpitu(wartosc: unknown): ZadaniePulpitu | null {
  if (!wartosc || typeof wartosc !== 'object') return null
  const dane = wartosc as Record<string, unknown>
  const id = tekst(dane.id)
  const tytul = tekst(dane.tytul)
  const data = tekst(dane.data)
  if (!id || !tytul || !data) return null

  const wlascicielId = tekst(dane.wlascicielId)
  const zadaniodawcaId = tekst(dane.zadaniodawcaId) || tekst(dane.createdBy) || tekst(dane.userId) || wlascicielId
  const zadaniobiorcaId = tekst(dane.zadaniobiorcaId) || zadaniodawcaId
  const przypomnienia = (Array.isArray(dane.przypomnienia) ? dane.przypomnienia : Array.isArray(dane.reminders) ? dane.reminders : [])
    .map(normalizujPrzypomnienie)
    .filter((przypomnienie): przypomnienie is PrzypomnienieZadania => Boolean(przypomnienie))

  return {
    ...(dane as unknown as ZadaniePulpitu),
    id,
    tytul,
    data,
    godzina: tekst(dane.godzina) || undefined,
    utworzono: tekst(dane.utworzono) || new Date(0).toISOString(),
    status: dane.status === 'WYKONANE' ? 'WYKONANE' : 'OTWARTE',
    priorytet: dane.priorytet === 'ASAP' || dane.priorytet === 'PILNE' ? dane.priorytet : 'ZWYKLE',
    typZrodla: dane.typZrodla === 'SZKOLENIE' || dane.typZrodla === 'PACZKA' ? dane.typZrodla : 'RECZNE',
    typZadania: tekst(dane.typZadania) || 'ZADANIE_WLASNE',
    wlascicielId: wlascicielId || zadaniobiorcaId || zadaniodawcaId,
    zadaniodawcaId,
    zadaniobiorcaId,
    przypomnienia,
    czyAutomatyczne: dane.czyAutomatyczne === true,
    czyTerminKrytyczny: dane.czyTerminKrytyczny === true,
  }
}

function normalizujStatusZapotrzebowaniaZakupowego(wartosc: unknown): StatusZapotrzebowaniaZakupowego | null {
  if (wartosc === 'ZGLOSZONE' || wartosc === 'DO_ZAKUPU' || wartosc === 'W_REALIZACJI' || wartosc === 'KUPIONE' || wartosc === 'ANULOWANE' || wartosc === 'ZAMKNIETE' || wartosc === 'ARCHIWALNE') return wartosc
  return null
}

export function normalizujZapotrzebowanieZakupowe(wartosc: unknown): ZapotrzebowanieZakupowe | null {
  if (!wartosc || typeof wartosc !== 'object') return null
  const dane = wartosc as Record<string, unknown>
  const id = tekst(dane.id)
  const nazwa = tekst(dane.nazwa)
  const ilosc = Number(dane.ilosc)
  const status = normalizujStatusZapotrzebowaniaZakupowego(dane.status)
  const utworzonePrzezId = tekst(dane.utworzonePrzezId)
  const utworzonoAt = tekst(dane.utworzonoAt)
  if (!id || !nazwa || !Number.isFinite(ilosc) || ilosc <= 0 || !status || !utworzonePrzezId || !utworzonoAt) return null
  return { id, nazwa, ilosc, status, uwagi: tekst(dane.uwagi) || undefined, utworzonePrzezId, utworzonoAt }
}
export function pobierzStanPulpitu(): StanPulpitu {
  try {
    const zapis = localStorage.getItem(kluczStanuPulpitu)
    if (!zapis) return pustyStan()
    const stan = JSON.parse(zapis) as Partial<StanPulpitu>
    return {
      zadaniaReczne: (Array.isArray(stan.zadaniaReczne) ? stan.zadaniaReczne : [])
        .map(normalizujZadaniePulpitu)
        .filter((zadanie): zadanie is ZadaniePulpitu => Boolean(zadanie)),
      wyslanePaczki: stan.wyslanePaczki && typeof stan.wyslanePaczki === 'object' ? stan.wyslanePaczki : {},
      zapotrzebowaniaZakupowe: (Array.isArray(stan.zapotrzebowaniaZakupowe) ? stan.zapotrzebowaniaZakupowe : [])
        .map(normalizujZapotrzebowanieZakupowe)
        .filter((zapotrzebowanie): zapotrzebowanie is ZapotrzebowanieZakupowe => Boolean(zapotrzebowanie)),
    }
  } catch {
    return pustyStan()
  }
}

export function zapiszStanPulpitu(stan: StanPulpitu) {
  try { localStorage.setItem(kluczStanuPulpitu, JSON.stringify(stan)) } catch { return false }
  return true
}

export function zapiszZadanieReczne(zadanie: ZadaniePulpitu) {
  const stan = pobierzStanPulpitu()
  const istnieje = stan.zadaniaReczne.some((obecne) => obecne.id === zadanie.id)
  return zapiszStanPulpitu({ ...stan, zadaniaReczne: istnieje ? stan.zadaniaReczne.map((obecne) => obecne.id === zadanie.id ? zadanie : obecne) : [...stan.zadaniaReczne, zadanie] })
}

export type EdytowalnePolaZadania = Pick<
  ZadaniePulpitu,
  'tytul'
  | 'data'
  | 'godzina'
  | 'priorytet'
  | 'zadaniobiorcaId'
  | 'przypomnienia'
  | 'powiazaneSzkolenieId'
>

export function edytujZadanieRecznePrzezZadaniodawce(
  zadanieId: string,
  uzytkownikId: string,
  zmiany: EdytowalnePolaZadania,
): ZadaniePulpitu | null {
  const stan = pobierzStanPulpitu()
  const obecne = stan.zadaniaReczne.find((zadanie) => zadanie.id === zadanieId)

  if (
    !obecne
    || obecne.czyAutomatyczne
    || obecne.status !== 'OTWARTE'
    || obecne.zadaniodawcaId !== uzytkownikId
  ) {
    return null
  }

  const zaktualizowane: ZadaniePulpitu = {
    ...obecne,
    tytul: zmiany.tytul,
    data: zmiany.data,
    godzina: zmiany.godzina,
    priorytet: zmiany.priorytet,
    zadaniobiorcaId: zmiany.zadaniobiorcaId,
    wlascicielId: zmiany.zadaniobiorcaId,
    przypomnienia: zmiany.przypomnienia,
    powiazaneSzkolenieId: zmiany.powiazaneSzkolenieId,
  }

  const zapisano = zapiszStanPulpitu({
    ...stan,
    zadaniaReczne: stan.zadaniaReczne.map((zadanie) =>
      zadanie.id === zadanieId ? zaktualizowane : zadanie
    ),
  })

  return zapisano ? zaktualizowane : null
}

export function oznaczPaczkeJakoWyslana(idPaczki: string) {
  const stan = pobierzStanPulpitu()
  return zapiszStanPulpitu({ ...stan, wyslanePaczki: { ...stan.wyslanePaczki, [idPaczki]: new Date().toISOString() } })
}
export function usunZadanieReczne(zadanieId: string) {
  const stan = pobierzStanPulpitu()
  return zapiszStanPulpitu({ ...stan, zadaniaReczne: stan.zadaniaReczne.filter((zadanie) => zadanie.id !== zadanieId) })
}

export function zapiszZapotrzebowanieZakupowe(zapotrzebowanie: ZapotrzebowanieZakupowe) {
  const stan = pobierzStanPulpitu()
  const istnieje = stan.zapotrzebowaniaZakupowe.some((obecne) => obecne.id === zapotrzebowanie.id)
  return zapiszStanPulpitu({ ...stan, zapotrzebowaniaZakupowe: istnieje ? stan.zapotrzebowaniaZakupowe.map((obecne) => obecne.id === zapotrzebowanie.id ? zapotrzebowanie : obecne) : [...stan.zapotrzebowaniaZakupowe, zapotrzebowanie] })
}
