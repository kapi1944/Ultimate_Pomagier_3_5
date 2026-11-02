import { etykietyMiejsca, parsujMailaSzczegolow, parsujTematWiadomosci, podzielKonteksty, rozdzielNaglowkiWiadomosci, znajdzDaty } from '../../moduly/zamkniete/szczegoly_organizacyjne/uslugi/parserMailaSzczegolow'
import { etykietyPolMaila, normalizujTekst, normalizujTrescMaila, parsujGodzinySzkolenia, znajdzSekcjeMaila } from '../../moduly/zamkniete/szczegoly_organizacyjne/uslugi/analizaTresciMaila'
import type { DaneFormularza, GrupaSzkoleniowa, StatusPolaImportu } from '../../moduly/zamkniete/szczegoly_organizacyjne/typy'

type PolaDomenowe = Pick<DaneFormularza, 'tytulSzkolenia' | 'nazwaKlienta' | 'programSzkolenia'> & Pick<GrupaSzkoleniowa, 'dataOd' | 'dataDo' | 'miejsce' | 'formaSzkolenia' | 'liczbaGodzin' | 'rodzajGodzin'>
// Tekstowy staging służy weryfikacji; nie jest drugim modelem zapisywanego szkolenia.
export type PoleImportuSzkolenia = keyof PolaDomenowe | 'trener' | 'limitUczestnikow'
export type WartosciImportuSzkolenia = Partial<Record<PoleImportuSzkolenia, string>>
export type KandydatImportuSzkolenia = { wartosc: string; fragment: string; zrodlo: string; wywnioskowany?: boolean }
export type RozpoznanePoleSzkolenia = {
  pole: PoleImportuSzkolenia
  etykieta: string
  warianty: KandydatImportuSzkolenia[]
  status: StatusPolaImportu
  konflikt: boolean
}
export type WynikImportuSzkolenia = { pola: RozpoznanePoleSzkolenia[]; ostrzezenia: string[]; blokada?: string }

export const etykietyImportuSzkolenia: Record<PoleImportuSzkolenia, string> = {
  tytulSzkolenia: 'Tytuł', dataOd: 'Data początkowa', dataDo: 'Data końcowa', trener: 'Trener', formaSzkolenia: 'Tryb', miejsce: 'Miejsce', liczbaGodzin: 'Liczba godzin', rodzajGodzin: 'Rodzaj godzin', nazwaKlienta: 'Klient', limitUczestnikow: 'Maksymalna liczba uczestników', programSzkolenia: 'Program szkolenia',
}

export function analizujDaneSzkoleniaZMaila(tekst: string): WynikImportuSzkolenia {
  if (!tekst.trim()) throw new Error('Wklej treść wiadomości przed analizą.')
  if (tekst.length > 250000) throw new Error('Wiadomość jest zbyt długa. Wklej fragment dotyczący jednego szkolenia (do 250 000 znaków).')
  const wiadomosc = rozdzielNaglowkiWiadomosci(tekst)
  const konteksty = podzielKonteksty(wiadomosc.tresc)
  const wynikParsera = parsujMailaSzczegolow(tekst)
  const kandydaci = new Map<PoleImportuSzkolenia, KandydatImportuSzkolenia[]>()
  const ostrzezenia: string[] = []
  const dodaj = (pole: PoleImportuSzkolenia, wartosc: string | number | undefined, fragment: string, zrodlo = 'Treść wiadomości', wywnioskowany = false) => {
    if (wartosc === undefined || !String(wartosc).trim()) return
    const lista = kandydaci.get(pole) ?? []
    lista.push({ wartosc: String(wartosc).trim(), fragment, zrodlo, wywnioskowany: wywnioskowany || /do (?:ustalenia|potwierdzenia)|prawdopodob|wstepn/.test(normalizujTekst(String(wartosc))) })
    kandydaci.set(pole, lista)
  }
  const sekcje = (etykiety: readonly string[]) => znajdzSekcjeMaila(konteksty.dane, etykiety)
  const tytuly = sekcje(['Tytuł szkolenia', 'Temat szkolenia', 'Nazwa szkolenia', 'Nazwa kursu', 'Szkolenie'])
  for (const sekcja of tytuly) dodaj('tytulSzkolenia', sekcja.wartosc.split('\n')[0].replace(/^[„“"«]|[”"»]$/g, ''), sekcja.fragment)
  if (!tytuly.length && wynikParsera.daneFormularza.tytulSzkolenia) {
    const tytul = wynikParsera.daneFormularza.tytulSzkolenia
    const fragment = normalizujTrescMaila(tekst).split('\n').find((wiersz) => wiersz.includes(tytul)) ?? ''
    dodaj('tytulSzkolenia', tytul, fragment, 'Tytuł w wiadomości', wynikParsera.polaNiepewne.includes('tytulSzkolenia'))
  }

  const dodajTermin = (wartosc: string, fragment: string, zrodlo: string) => {
    const daty = znajdzDaty(wartosc)
    if (!daty.dataOd) { ostrzezenia.push(`Nierozpoznany lub nieprawidłowy termin: ${wartosc}`); return }
    dodaj('dataOd', daty.dataOd, fragment, zrodlo, zrodlo === 'Temat wiadomości')
    dodaj('dataDo', daty.dataDo, fragment, zrodlo, zrodlo === 'Temat wiadomości')
  }
  const terminy = sekcje(['Termin', 'Data szkolenia', 'Termin szkolenia', 'Termin realizacji', 'Data realizacji', 'Data', 'Szkolenie odbędzie się'])
  for (const sekcja of terminy) dodajTermin(sekcja.wartosc.split('\n')[0], sekcja.fragment, 'Jawny termin')
  for (const [etykieta, pole] of [['Data od', 'dataOd'], ['Data do', 'dataDo']] as const) {
    for (const sekcja of sekcje([etykieta])) {
      const daty = znajdzDaty(sekcja.wartosc.split('\n')[0])
      if (daty.dataOd) dodaj(pole, daty.dataOd, sekcja.fragment, 'Jawny termin')
      else ostrzezenia.push(`Nierozpoznany lub nieprawidłowy termin: ${sekcja.wartosc}`)
    }
  }
  const temat = wiadomosc.naglowki.temat ?? wiadomosc.naglowki.subject ?? ''
  dodaj('tytulSzkolenia', parsujTematWiadomosci(temat).kandydat?.wartosc, temat, 'Temat wiadomości', true)
  if (znajdzDaty(temat).dataOd) dodajTermin(temat, temat, 'Temat wiadomości')

  for (const sekcja of sekcje(etykietyPolMaila.trener)) {
    const osoba = sekcja.wartosc.split('\n')[0].replace(/\s*[<(].*$/, '').trim().replace(/\.$/, '')
    if (/^(?:(?:dr|hab|mgr|prof|inż)\.?\s+)*\p{Lu}[\p{L}'-]+(?:\s+\p{Lu}[\p{L}'-]+)+$/u.test(osoba)) dodaj('trener', osoba, sekcja.fragment)
    else ostrzezenia.push(`Nie udało się jednoznacznie rozpoznać trenera: ${sekcja.wartosc}`)
  }
  for (const sekcja of sekcje(etykietyMiejsca)) {
    dodaj('miejsce', sekcja.wartosc.split('\n').join(', '), sekcja.fragment)
  }
  const rozpoznajTryb = (wartosc: string, fragment: string) => {
    const tekstTrybu = normalizujTekst(wartosc)
    if (/hybryd/.test(tekstTrybu)) dodaj('formaSzkolenia', 'Hybrydowe', fragment)
    else {
      if (/on[ -]?line|zdaln/.test(tekstTrybu)) dodaj('formaSzkolenia', 'Online', fragment)
      if (/stacjonarn/.test(tekstTrybu)) dodaj('formaSzkolenia', 'Stacjonarne', fragment)
    }
  }
  for (const sekcja of sekcje(['Forma', 'Forma szkolenia', 'Tryb', 'Tryb szkolenia'])) rozpoznajTryb(sekcja.wartosc.split('\n')[0], sekcja.fragment)
  for (const sekcja of sekcje(etykietyPolMaila.godziny)) {
    const wartosc = sekcja.wartosc.split('\n')[0]
    const godziny = parsujGodzinySzkolenia(wartosc)
    dodaj('liczbaGodzin', godziny.liczbaGodzin, sekcja.fragment)
    dodaj('rodzajGodzin', godziny.rodzajGodzin, sekcja.fragment)
    dodaj('rodzajGodzin', parsujGodzinySzkolenia(sekcja.fragment.split(':')[0]).rodzajGodzin, sekcja.fragment)
  }
  for (const sekcja of sekcje(etykietyPolMaila.rodzajGodzin)) dodaj('rodzajGodzin', parsujGodzinySzkolenia(sekcja.wartosc.split('\n')[0]).rodzajGodzin, sekcja.fragment)
  const klient = wynikParsera.daneFormularza.nazwaKlienta
  if (klient) dodaj('nazwaKlienta', klient, sekcje(etykietyPolMaila.klient)[0]?.fragment ?? klient)
  for (const sekcja of sekcje(etykietyPolMaila.uczestnicy)) {
    const limit = normalizujTekst(sekcja.wartosc.split('\n')[0]).match(/^(?:do|maks(?:ymalnie)?\.?|nie wiecej niz)\s*(\d+)\b/)
    if (limit && Number(limit[1]) > 0) dodaj('limitUczestnikow', limit[1], sekcja.fragment)
  }

  // Zdania analizujemy tylko w kontekście szkolenia, poza wysyłką, podpisem i programem.
  for (const wiersz of konteksty.dane.split('\n')) {
    const normalny = normalizujTekst(wiersz)
    if (/^szkoleni[ea]\b.*(?:odbedzie sie|odbylo sie|zaplanowano|zrealizujemy|bedzie (?:realizowane|prowadzone)|zostanie przeprowadzone)/.test(normalny)) {
      if (znajdzDaty(wiersz).dataOd) dodajTermin(wiersz, wiersz, 'Termin w zdaniu')
      rozpoznajTryb(wiersz, wiersz)
    }
    const trener = wiersz.match(/(?:[Ss]zkolenie\s+(?:poprowadzi|prowadzi)|[Pp]rowadząc[ąy]m?\s+(?:będzie|jest))\s+([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+)+)/u)
    if (trener) dodaj('trener', trener[1], wiersz)
    const tytul = wiersz.match(/szkoleni[ea]\s+(?:pt\.?\s*)?[„"]([^”"]+)[”"]/i)
    if (tytul) dodaj('tytulSzkolenia', tytul[1], wiersz)
    if (/szkoleni[ea].*(?:potrwa|trwa|w wymiarze|obejmuje)/.test(normalny)) {
      const godziny = wiersz.match(/(\d+(?:[.,]\d+)?)\s*(?:godzin\w*|godz\.?|h)\s*(zegarow\w*|dydaktyczn\w*|lekcyjn\w*)?/i)
      if (godziny) {
        const wynik = parsujGodzinySzkolenia(godziny[0])
        dodaj('liczbaGodzin', wynik.liczbaGodzin, wiersz)
        dodaj('rodzajGodzin', wynik.rodzajGodzin, wiersz)
      }
    }
    const lokalizacja = wiersz.match(/(?:miejscem szkolenia (?:jest|będzie)|szkolenie odbędzie się (?:stacjonarnie )?w)\s+(.+)/i)
    if (lokalizacja && !znajdzDaty(lokalizacja[1]).dataOd && !/^(?:dniach|dniu|trybie|formie|on[ -]?line)\b/i.test(lokalizacja[1])) dodaj('miejsce', lokalizacja[1].replace(/\.$/, ''), wiersz, 'Miejsce w zdaniu', true)
    const limit = normalny.match(/(?:do|maksymalnie)\s+(\d+)\s+(?:osob|uczestnikow)/)
    if (limit) dodaj('limitUczestnikow', limit[1], wiersz)
    if (/^szkolenie (?:online|on-line|stacjonarne|hybrydowe)[.! ]*$/.test(normalny)) rozpoznajTryb(wiersz, wiersz)
  }

  const harmonogram = znajdzSekcjeMaila(wiadomosc.tresc, ['Harmonogram szkolenia', 'Harmonogram', 'Godziny', 'Godziny zajęć'])
  const datyHarmonogramu: string[] = []
  let minuty = 0
  let liczbaZakresow = 0
  for (const sekcja of harmonogram) for (const wiersz of sekcja.wartosc.split('\n')) {
    if (/przerw|lunch|obiad/i.test(wiersz)) continue
    const daty = znajdzDaty(wiersz)
    if (daty.dataOd) datyHarmonogramu.push(daty.dataOd, daty.dataDo)
    for (const zakres of wiersz.matchAll(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\s*[-–—]\s*([01]?\d|2[0-3])[:.]([0-5]\d)\b/g)) {
      const czas = (Number(zakres[3]) - Number(zakres[1])) * 60 + Number(zakres[4]) - Number(zakres[2])
      if (czas > 0) { minuty += czas; liczbaZakresow += 1 }
      else ostrzezenia.push('Harmonogram zawiera nieprawidłowy zakres godzin. Sprawdź go ręcznie.')
    }
  }
  if (datyHarmonogramu.length) {
    datyHarmonogramu.sort()
    const fragment = harmonogram.map((sekcja) => sekcja.fragment).join('\n')
    dodaj('dataOd', datyHarmonogramu[0], fragment, 'Harmonogram szkolenia')
    dodaj('dataDo', datyHarmonogramu.at(-1), fragment, 'Harmonogram szkolenia')
  }
  const liczbaGodzin = kandydaci.get('liczbaGodzin')?.[0]?.wartosc
  const rodzajGodzin = kandydaci.get('rodzajGodzin')?.[0]?.wartosc
  if (liczbaZakresow && liczbaGodzin && rodzajGodzin) {
    const deklarowaneMinuty = Number(liczbaGodzin) * (rodzajGodzin === 'Zegarowe (60 min)' ? 60 : 45)
    if (Math.abs(minuty - deklarowaneMinuty) > 0.01) ostrzezenia.push(`Harmonogram obejmuje ${minuty / 60} godzin zegarowych, a deklaracja to ${liczbaGodzin} godzin (${rodzajGodzin}). Sprawdź przerwy i kompletność harmonogramu. Zachowano deklarowaną liczbę godzin.`)
  }
  if (!kandydaci.has('formaSzkolenia')) {
    const miejsce = kandydaci.get('miejsce')?.[0]
    if (miejsce && /ul\.|\d{2}-\d{3}|osrodek|hotel|sala\b/.test(normalizujTekst(miejsce.wartosc))) dodaj('formaSzkolenia', 'Stacjonarne', miejsce.fragment, 'Wniosek z fizycznej lokalizacji', true)
  }
  const program = wynikParsera.daneFormularza.programSzkolenia
  if (program) dodaj('programSzkolenia', program, znajdzSekcjeMaila(normalizujTrescMaila(tekst, true), ['Program szkolenia'])[0]?.fragment ?? program)

  const pola = (Object.keys(etykietyImportuSzkolenia) as PoleImportuSzkolenia[]).map((pole): RozpoznanePoleSzkolenia => {
    const wszystkie = kandydaci.get(pole) ?? []
    const warianty = wszystkie.filter((kandydat, indeks) => wszystkie.findIndex((inny) => normalizujTekst(inny.wartosc) === normalizujTekst(kandydat.wartosc)) === indeks)
    const konflikt = warianty.length > 1
    if (konflikt) ostrzezenia.push(`${etykietyImportuSzkolenia[pole]}: sprzeczne informacje; wybierz poprawną wartość lub pomiń pole.`)
    return { pole, etykieta: etykietyImportuSzkolenia[pole], warianty, konflikt, status: !warianty.length ? 'brak' : konflikt || warianty.some((wariant) => wariant.wywnioskowany) ? 'niepewne' : 'zaimportowane' }
  })
  const tytulyWTresci = kandydaci.get('tytulSzkolenia')?.filter((kandydat) => kandydat.zrodlo !== 'Temat wiadomości') ?? []
  const wieleSzkolen = new Set(tytulyWTresci.map((kandydat) => normalizujTekst(kandydat.wartosc))).size > 1 || (wynikParsera.pozostaleGrupy?.length ?? 0) > 0
  return { pola, ostrzezenia: [...new Set(ostrzezenia)], ...(wieleSzkolen ? { blokada: 'Wiadomość zawiera kilka szkoleń lub grup. Wróć i wklej fragment dotyczący jednego szkolenia i jednej grupy.' } : {}) }
}

export function sprawdzWartosciImportuSzkolenia(wartosci: WartosciImportuSzkolenia): string | null {
  if (!Object.values(wartosci).some((wartosc) => wartosc?.trim())) return 'Wybierz przynajmniej jedno pole do importu.'
  for (const pole of ['dataOd', 'dataDo'] as const) {
    const wartosc = wartosci[pole]
    if (wartosc && (!/^\d{4}-\d{2}-\d{2}$/.test(wartosc) || znajdzDaty(wartosc).dataOd !== wartosc)) return 'Podaj poprawne daty szkolenia.'
  }
  if (Boolean(wartosci.dataOd) !== Boolean(wartosci.dataDo)) return 'Wybierz obie daty terminu albo pomiń obie.'
  if (wartosci.dataOd && wartosci.dataDo) {
    const dni = (Date.parse(wartosci.dataDo) - Date.parse(wartosci.dataOd)) / 86400000
    if (dni < 0 || dni > 365) return 'Termin musi być rosnący i obejmować najwyżej 366 dni.'
  }
  for (const pole of ['liczbaGodzin', 'limitUczestnikow'] as const) {
    if (wartosci[pole] && (!Number.isFinite(Number(wartosci[pole])) || Number(wartosci[pole]) <= 0 || pole === 'limitUczestnikow' && !Number.isInteger(Number(wartosci[pole])))) return 'Liczba godzin i limit uczestników muszą być dodatnimi liczbami.'
  }
  return null
}
